import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialState, addItem, changeQuantity, total, checkout, finishEvent, openEvent, reviseOrder, currentItems, summarize, prune, reminderDue, acknowledgeReminder, validateState, importState, importPreview, parseLibrary, parsePrice, persist, load, KEY, editEvent, moveOffer, deleteOffer } from '../src/model.ts';
const start = '2026-10-01T18:00:00.000Z', end = '2026-10-01T22:00:00.000Z';
function order(s = initialState()) { s.cart = addItem(s.cart, s.settings.offers.find(o => o.id === 'nachos')); s.cart = addItem(s.cart, s.settings.offers.find(o => o.id === 'popcorn')); return checkout(s, start); }
function closed() { return finishEvent(order(), end); }
function legacy(state) {
  return { ...structuredClone(state), schemaVersion: 1, events: state.events.map(event => {
    const { orders, notes, ...metadata } = structuredClone(event);
    return { ...metadata, activeVersionId: 'selected', versions: [
      { id: 'older', at: start, orders: [], notes: [] },
      { id: 'selected', at: end, orders, notes }
    ] };
  }) };
}
test('initial offer order and exact cent arithmetic', () => {
  const s = initialState();
  assert.deepEqual(s.settings.offers.map(o => o.title), ['Clubkarte', 'Eintritt', 'Nachos', 'Popcorn', 'Snack', 'Getränk', 'Bundle']);
  assert.deepEqual(s.settings.offers.map(o => o.price), [250, 150, 100, 50, 100, 100, 150]);
  assert.equal(parsePrice('1,50'), 150); assert.equal(parsePrice('0.29'), 29);
  for (const value of ['1%', '-1', '1.999', 'Infinity', '', '1e2']) assert.throws(() => parsePrice(value));
  let cart = []; for (let i = 0; i < 10; i++) cart = addItem(cart, { ...s.settings.offers[0], price: 29 });
  assert.equal(total(cart), 290); assert.deepEqual(changeQuantity(cart, 0, -10), []);
});
test('library parses names with spaces and rejects traversal', () => {
  assert.deepEqual(parseLibrary('- nachos.svg\r\n- Bild mit Leerzeichen.PNG\n- ../bad.svg\n- nachos.svg\\n- ticket.jpg'), ['nachos.svg', 'Bild mit Leerzeichen.PNG', 'ticket.jpg']);
});
test('checkout opens only on payment, snapshots prices and clears cart', () => {
  const s = initialState(), next = order(s);
  assert.equal(openEvent(s), undefined); assert.equal(next.cart.length, 0); assert.equal(next.events.length, 1); assert.throws(() => checkout(next));
  next.settings.offers.find(o => o.id === 'nachos').price = 999;
  assert.equal(total(currentItems(next.events[0].orders[0])), 150); assert.equal(s.events.length, 0);
});
test('open order corrections retain revisions and calculate refund/storno', () => {
  const s = order(), event = s.events[0], original = event.orders[0], items = currentItems(original);
  const next = reviseOrder(s, event.id, original.id, items.slice(0, 1));
  assert.equal(next.events[0].orders[0].revisions.length, 2);
  assert.equal(total(currentItems(next.events[0].orders[0])) - total(items), -50);
  assert.equal(summarize(next.events[0]).revenue, 100);
  assert.equal(summarize(reviseOrder(next, event.id, original.id, []).events[0]).revenue, 0);
});
test('closed event content is immutable, without event versions', () => {
  const s = closed(), original = structuredClone(s), event = s.events[0];
  assert.throws(() => reviseOrder(s, event.id, event.orders[0].id, []), /inhaltlich nicht geändert/);
  assert.throws(() => editEvent(s, event.id, e => { e.notes = []; }), /inhaltlich nicht geändert/);
  assert.deepEqual(s, original); assert.equal('versions' in event, false);
});
test('reminders every two hours never implicitly finish the event', () => {
  let s = order(); const at = Date.parse(start);
  assert.equal(reminderDue(s, at + 7199999), 0); assert.equal(reminderDue(s, at + 7200000), 1);
  s = acknowledgeReminder(s, 1); assert.equal(reminderDue(s, at + 10800000), 0); assert.equal(reminderDue(s, at + 14400000), 2);
  assert.equal(s.events[0].closedAt, null);
});
test('finish preserves pending cart and historical notes, new event uses template', () => {
  const s = order(); s.events[0].notes[0].value = 4; s.cart = addItem(s.cart, s.settings.offers[0]);
  const finished = finishEvent(s, end); assert.equal(finished.cart.length, 1); assert.equal(openEvent(finished), undefined);
  assert.equal(finished.events[0].notes[0].value, 4);
  const next = checkout(finished, '2026-10-02T01:00:00.000Z'); assert.equal(next.events[1].notes[0].value, '');
});
test('individual expiry overrides global default and must be in future', () => {
  const s = order(), expiry = '2026-12-01T10:00:00.000Z';
  assert.equal(finishEvent(s, end, expiry).events[0].deleteAt, expiry);
  assert.equal(Date.parse(finishEvent(s, end).events[0].deleteAt), Date.parse(end) + 35 * 86400000);
  assert.throws(() => finishEvent(s, end, start), /zukünftiges/);
  assert.throws(() => finishEvent(s, end, 'invalid'));
});
test('pruning removes expired events, never the open event', () => {
  const s = closed(), expiry = Date.parse(s.events[0].deleteAt);
  assert.equal(prune(s, expiry - 1).events.length, 1); assert.equal(prune(s, expiry).events.length, 0);
  assert.equal(prune(order(), expiry + 1).events.length, 1);
});
test('offer movement and deletion preserve order snapshots and pending cart', () => {
  const s = order(); s.cart = addItem([], s.settings.offers[0]);
  const moved = moveOffer(s, 'clubkarte', 'bundle'); assert.equal(moved.settings.offers.at(-1).id, 'clubkarte');
  const deleted = deleteOffer(moved, 'clubkarte'); assert.equal(deleted.settings.offers.some(o => o.id === 'clubkarte'), false);
  assert.deepEqual(deleted.cart, s.cart); assert.deepEqual(deleted.events, s.events); validateState(deleted);
});
test('offers and order snapshots support no image; unsafe paths remain invalid', () => {
  const s = initialState(); s.settings.offers[0].image = ''; s.cart = addItem([], s.settings.offers[0]);
  validateState(checkout(s, start));
  s.settings.offers[0].image = '../x.svg'; assert.throws(() => validateState(s));
});
test('legacy data migration keeps selected event content and existing offer order', () => {
  const s = closed(), old = legacy(s), original = structuredClone(old);
  const migrated = validateState(old); assert.deepEqual(migrated, s); assert.deepEqual(old, original);
  assert.equal('versions' in migrated.events[0], false);
  const corrupt = legacy(s); corrupt.events[0].activeVersionId = 'missing'; assert.throws(() => validateState(corrupt));
});
test('migration keeps a raw backup before the first write; failed backup never overwrites legacy data', () => {
  const old = JSON.stringify(legacy(closed())), memory = new Map([[KEY, old]]);
  const storage = { getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, v) };
  const state = load(storage); assert.equal(memory.get(KEY), old); persist(storage, state);
  assert.equal(memory.get('kasse.before-schema-2'), old); assert.equal(JSON.parse(memory.get(KEY)).schemaVersion, 2);
  let writes = 0;
  assert.throws(() => persist({ getItem: () => old, setItem: () => { writes++; throw Error('full'); } }, state));
  assert.equal(writes, 1);
});
test('import replaces matching event content and metadata instead of creating versions', () => {
  const s = closed(), at = Date.parse(end) + 1;
  const incoming = structuredClone(s); incoming.events[0].notes[0].value = 9; incoming.events[0].title = 'Import'; incoming.events[0].deleteAt = '2026-12-01T00:00:00.000Z';
  incoming.settings.retentionDays = 10;
  const updated = importState(s, incoming, at);
  assert.equal(updated.events.length, 1); assert.deepEqual(updated.events[0], incoming.events[0]); assert.equal(updated.settings.retentionDays, 10);
  assert.deepEqual(importPreview(s, incoming, at), { events: 0, replaced: 1, expired: 0 });
  assert.equal(importPreview(updated, incoming, at).replaced, 0);
  assert.equal(importState(initialState(), incoming, at).events.length, 1);
});
test('legacy backups can be imported and local events missing from import remain', () => {
  const local = closed(), incoming = closed();
  const merged = importState(local, legacy(incoming), Date.parse(end) + 1);
  assert.equal(merged.events.length, 2); assert.equal(merged.schemaVersion, 2);
});
test('imports reject open local/source events, pending carts and future schemas', () => {
  assert.throws(() => importState(order(), closed())); assert.throws(() => importState(initialState(), order()));
  const pending = initialState(); pending.cart = addItem([], pending.settings.offers[0]); assert.throws(() => importState(pending, closed()));
  const s = closed(); s.schemaVersion = 99; assert.throws(() => validateState(s));
});
test('expired imports are not resurrected', () => {
  const s = closed(); assert.equal(importState(initialState(), s, Date.parse(s.events[0].deleteAt)).events.length, 0);
});
test('malformed backup entries are rejected with a useful validation error', () => {
  const cases = [s => s.settings.offers[0].price = -1, s => s.settings.offers = [null], s => s.events[0].orders = [null], s => s.events[0].orders[0].revisions = [], s => s.events.push(s.events[0]), s => s.settings.templates[0].value = 'NaN'];
  for (const mutate of cases) { const s = closed(); mutate(s); assert.throws(() => validateState(s), /Ungültige oder nicht unterstützte Sicherungsdatei/); }
  assert.throws(() => validateState(null)); assert.throws(() => validateState({}));
});
test('storage failures preserve original state and broken raw data', () => {
  const s = order(), memory = new Map(), storage = { getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, v) };
  persist(storage, s); assert.deepEqual(load(storage), s);
  assert.throws(() => persist({ setItem() { throw Error('full'); } }, s));
  memory.set(KEY, '{broken'); assert.throws(() => load(storage)); assert.equal(memory.get(KEY), '{broken');
});
