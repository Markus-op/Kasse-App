import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialState, addItem, changeQuantity, total, checkout, finishEvent, openEvent, activeVersion, reviseOrder, currentItems, summarize, prune, reminderDue, acknowledgeReminder, validateState, importState, importPreview, parseLibrary, parsePrice, persist, load, KEY, editEvent } from '../src/model.ts';
const start = '2026-10-01T18:00:00.000Z', end = '2026-10-01T22:00:00.000Z';
function order(s = initialState()) { s.cart = addItem(s.cart, s.settings.offers[0]); s.cart = addItem(s.cart, s.settings.offers[1]); return checkout(s, start); }
function closed() { return finishEvent(order(), end); }
test('default prices, decimal parsing and exact cent arithmetic', () => {
  const s = initialState(); assert.deepEqual(s.settings.offers.map(o => o.price), [100, 50, 100, 100, 150, 150, 250]);
  assert.equal(parsePrice('1,50'), 150); assert.equal(parsePrice('0.29'), 29);
  for (const invalid of ['1%', '-1', '1.999', 'Infinity', '', '1e2']) assert.throws(() => parsePrice(invalid));
  let cart = []; for (let i = 0; i < 10; i++) cart = addItem(cart, { ...s.settings.offers[0], price: 29 });
  assert.equal(total(cart), 290); assert.equal(cart[0].quantity, 10); assert.deepEqual(changeQuantity(cart, 0, -10), []);
});
test('library parses Markdown, CRLF, literal newline and spaces; rejects traversal', () => {
  assert.deepEqual(parseLibrary('- nachos.svg\r\n- Bild mit Leerzeichen.PNG\n\n- ../bad.svg\n- nachos.svg\\n- ticket.jpg\nText'), ['nachos.svg', 'Bild mit Leerzeichen.PNG', 'ticket.jpg']);
});
test('checkout snapshots prices, opens only on payment, clears cart and disallows empty save', () => {
  const s = initialState(); assert.equal(openEvent(s), undefined);
  const next = order(s); assert.equal(next.cart.length, 0); assert.equal(next.events.length, 1); assert.throws(() => checkout(next));
  next.settings.offers[0].price = 999; assert.equal(total(currentItems(activeVersion(next.events[0]).orders[0])), 150);
  assert.equal(s.events.length, 0);
});
test('corrections keep original, compute refund and update only current summary', () => {
  const s = order(), event = s.events[0], original = activeVersion(event).orders[0], items = currentItems(original);
  const next = reviseOrder(s, event.id, original.id, items.slice(0, 1));
  const revised = activeVersion(next.events[0]).orders[0]; assert.equal(revised.revisions.length, 2);
  assert.equal(total(currentItems(revised)) - total(items), -50);
  assert.equal(total(revised.revisions[0].items), 150); assert.equal(summarize(next.events[0]).revenue, 100);
  const cancelled = reviseOrder(next, event.id, original.id, []); assert.equal(summarize(cancelled.events[0]).revenue, 0);
});
test('two-hour reminders are acknowledged and do not close at midnight', () => {
  let s = order(); const at = Date.parse(start); assert.equal(reminderDue(s, at + 7199999), 0); assert.equal(reminderDue(s, at + 7200000), 1);
  s = acknowledgeReminder(s, 1); assert.equal(reminderDue(s, at + 10800000), 0); assert.equal(reminderDue(s, at + 14400000), 2);
  assert.equal(s.events[0].closedAt, null);
});
test('finish preserves pending cart, notes and permits a new independent event', () => {
  let s = order(); activeVersion(s.events[0]).notes[0].value = 4; s.cart = addItem(s.cart, s.settings.offers[2]);
  const finished = finishEvent(s, end); assert.equal(finished.cart.length, 1); assert.equal(openEvent(finished), undefined);
  assert.equal(activeVersion(finished.events[0]).notes[0].value, 4);
  const next = checkout(finished, '2026-10-02T01:00:00.000Z'); assert.equal(next.events.length, 2); assert.equal(activeVersion(next.events[1]).notes[0].value, '');
});
test('archive edits copy linked versions; overwrite also preserves complete previous notes', () => {
  const s = closed(), event = s.events[0], order = activeVersion(event).orders[0];
  const next = reviseOrder(s, event.id, order.id, [], true);
  assert.equal(next.events.length, 1); assert.equal(next.events[0].versions.length, 2); assert.notEqual(next.events[0].activeVersionId, event.activeVersionId);
  assert.equal(summarize(next.events[0]).revenue, 0); assert.equal(summarize(event).revenue, 150);
  const overwritten = editEvent(next, event.id, v => { v.notes[0].value = 5; }, false);
  assert.equal(overwritten.events[0].versions.length, 3); assert.equal(activeVersion(overwritten.events[0]).notes[0].value, 5);
  assert.ok(overwritten.events[0].versions.some(v => v.notes[0].value === ''));
});
test('template and offer changes leave old snapshots alone', () => {
  const s = order(), title = activeVersion(s.events[0]).notes[0].label;
  s.settings.templates[0].label = 'Neue Vorlage'; s.settings.offers[0].title = 'Anders';
  assert.equal(activeVersion(s.events[0]).notes[0].label, title); assert.equal(currentItems(activeVersion(s.events[0]).orders[0])[0].title, 'Nachos');
});
test('retention uses end plus days, never deletes open event, removes whole version family', () => {
  const s = closed(), expires = Date.parse(end) + 35 * 86400000;
  assert.equal(Date.parse(s.events[0].deleteAt), expires); assert.equal(prune(s, expires - 1).events.length, 1); assert.equal(prune(s, expires).events.length, 0);
  assert.equal(prune(order(), expires + 1).events.length, 1);
});
test('import roundtrip, settings replacement, duplicate prevention, and linked conflict', () => {
  const s = closed(), at = Date.parse(end) + 1;
  assert.deepEqual(validateState(JSON.parse(JSON.stringify(s))), s);
  let merged = importState(initialState(), s, at); assert.equal(merged.events.length, 1);
  merged = importState(merged, s, at); assert.equal(merged.events[0].versions.length, 1);
  const conflict = structuredClone(s); activeVersion(conflict.events[0]).notes[0].value = 9; conflict.settings.retentionDays = 10;
  const updated = importState(merged, conflict, at); assert.equal(updated.events[0].versions.length, 2); assert.equal(activeVersion(updated.events[0]).notes[0].value, ''); assert.equal(updated.settings.retentionDays, 10);
  assert.equal(importState(updated, conflict, at).events[0].versions.length, 2);
});
test('import is blocked for open local or source events, pending carts, invalid format', () => {
  assert.throws(() => importState(order(), closed())); assert.throws(() => importState(initialState(), order()));
  const pending = initialState(); pending.cart = addItem([], pending.settings.offers[0]); assert.throws(() => importState(pending, closed()));
  const s = closed(); s.schemaVersion = 2; assert.throws(() => validateState(s));
});
test('reject malicious and malformed data before any storage write', () => {
  const cases = [s => s.settings.offers[0].price = -1, s => s.settings.offers[0].image = '../x.svg', s => s.settings.offers.push(s.settings.offers[0]), s => s.events[0].activeVersionId = 'missing', s => s.events[0].closedAt = 'oops', s => s.events[0].versions[0].orders[0].revisions = [], s => s.events.push(s.events[0]), s => s.settings.templates[0].value = 'NaN'];
  for (const mutate of cases) { const s = closed(); mutate(s); assert.throws(() => validateState(s)); }
  assert.throws(() => validateState(null)); assert.throws(() => validateState({}));
});
test('expired imports are not resurrected', () => {
  const s = closed(); assert.equal(importState(initialState(), s, Date.parse(s.events[0].deleteAt)).events.length, 0);
});
test('atomic persistence: denied or full storage propagates; broken data is not overwritten', () => {
  const s = order(); const memory = new Map(); const storage = { getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, v) };
  persist(storage, s); assert.deepEqual(load(storage), s);
  assert.throws(() => persist({ setItem() { throw new Error('QuotaExceededError'); } }, s));
  memory.set(KEY, '{broken'); assert.throws(() => load(storage)); assert.equal(memory.get(KEY), '{broken');
});
