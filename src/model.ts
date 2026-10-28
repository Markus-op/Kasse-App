export type NoteType = 'number' | 'text' | 'boolean';
export type Note = { id: string; label: string; type: NoteType; value: string | number | boolean };
export type Offer = { id: string; title: string; price: number; image: string; active: boolean };
export type Item = { offerId: string; title: string; price: number; image: string; quantity: number };
export type Revision = { id: string; at: string; items: Item[] };
export type Order = { id: string; at: string; revisions: Revision[] };
export type EventVersion = { id: string; at: string; orders: Order[]; notes: Note[] };
export type Event = { id: string; title: string; startedAt: string; closedAt: string | null; deleteAt: string | null; reminderBucket: number; activeVersionId: string; versions: EventVersion[] };
export type Settings = { retentionDays: number; templates: Note[]; offers: Offer[] };
export type State = { schemaVersion: 1; settings: Settings; events: Event[]; cart: Item[]; draftNotes: Note[]; updatedAt: string };
export const KEY = 'kasse.app.v1';
export const MAX_CENTS = 100_000_000;
export const id = () => crypto.randomUUID();
export const now = () => new Date().toISOString();
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical((value as Record<string, unknown>)[key])).join(',') + '}';
  return JSON.stringify(value) ?? 'null';
}
export const clone = <T,>(value: T): T => structuredClone(value);
export const money = (cents: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100);
export const total = (items: Item[]) => items.reduce((sum, item) => sum + item.price * item.quantity, 0);
export const currentItems = (order: Order) => order.revisions[order.revisions.length - 1].items;
export const activeVersion = (event: Event) => event.versions.find(v => v.id === event.activeVersionId)!;
export const openEvent = (state: State) => state.events.find(e => e.closedAt === null);
export const stamp = (state: State) => { state.updatedAt = now(); return state; };
export function initialState(): State {
  const names = ['Nachos', 'Popcorn', 'Snack', 'Getränk', 'Bundle', 'Eintritt', 'Clubkarte'];
  const files = ['nachos', 'popcorn', 'snack', 'getraenk', 'bundle', 'eintritt', 'clubkarte'];
  const prices = [100, 50, 100, 100, 150, 150, 250];
  return { schemaVersion: 1, settings: { retentionDays: 35, offers: names.map((title, i) => ({ id: files[i], title, price: prices[i], image: files[i] + '.svg', active: true })), templates: [
    { id: 'helpers', label: 'Helfer', type: 'number', value: '' }, { id: 'visitors', label: 'Besucher gesamt', type: 'number', value: '' }, { id: 'other', label: 'Sonstiges', type: 'text', value: '' }
  ] }, events: [], cart: [], draftNotes: [], updatedAt: now() };
}
export function parsePrice(value: string): number {
  if (!/^\d{1,6}([,.]\d{1,2})?$/.test(value.trim())) throw new Error('Preis als Eurobetrag eingeben, z. B. 1,50.');
  const cents = Math.round(Number(value.trim().replace(',', '.')) * 100);
  if (!Number.isSafeInteger(cents) || cents > MAX_CENTS) throw new Error('Preis ist zu groß.');
  return cents;
}
export function parseLibrary(markdown: string): string[] {
  return [...new Set(markdown.split(/\r?\n|\\n/).map(line => line.trim().match(/^-\s+(.+\.(?:svg|png|jpe?g|webp|gif|avif))$/i)?.[1]).filter((s): s is string => !!s && !/[\\/]/.test(s) && !s.startsWith('.')))];
}
export function addItem(items: Item[], offer: Offer): Item[] {
  const next = clone(items), found = next.find(item => item.offerId === offer.id && item.price === offer.price && item.title === offer.title);
  if (found) { if (found.quantity >= 9999) throw new Error('Maximal 9999 Stück pro Position.'); found.quantity++; }
  else next.push({ offerId: offer.id, title: offer.title, price: offer.price, image: offer.image, quantity: 1 });
  if (total(next) > MAX_CENTS) throw new Error('Bestellsumme ist zu groß.');
  return next;
}
export function changeQuantity(items: Item[], index: number, amount: number): Item[] {
  const next = items.map((item, i) => i === index ? { ...item, quantity: Math.min(9999, item.quantity + amount) } : item).filter(item => item.quantity > 0);
  return total(next) > MAX_CENTS ? items : next;
}
export function checkout(state: State, at = now()): State {
  if (!state.cart.length) throw new Error('Bitte zuerst ein Angebot auswählen.');
  const next = clone(state);
  let event = openEvent(next);
  if (!event) {
    const versionId = id();
    event = { id: id(), title: 'Veranstaltung', startedAt: at, closedAt: null, deleteAt: null, reminderBucket: 0, activeVersionId: versionId, versions: [{ id: versionId, at, orders: [], notes: clone(next.draftNotes.length ? next.draftNotes : next.settings.templates) }] };
    next.events.push(event); next.draftNotes = [];
  }
  activeVersion(event).orders.push({ id: id(), at, revisions: [{ id: id(), at, items: clone(next.cart) }] });
  activeVersion(event).at = at; next.cart = []; return stamp(next);
}
export function finishEvent(state: State, at = now()): State {
  const next = clone(state), event = openEvent(next);
  if (!event) throw new Error('Keine offene Veranstaltung.');
  event.closedAt = at; event.deleteAt = new Date(Date.parse(at) + next.settings.retentionDays * 86400000).toISOString();
  return stamp(next);
}
export function editEvent(state: State, eventId: string, update: (version: EventVersion) => void, copy = false): State {
  const next = clone(state), event = next.events.find(e => e.id === eventId);
  if (!event) throw new Error('Veranstaltung nicht gefunden.');
  let version = activeVersion(event);
  if (copy && event.closedAt) { version = clone(version); version.id = id(); event.versions.push(version); event.activeVersionId = version.id; }
  const before = clone(version);
  update(version);
  // Overwriting retains the previous complete snapshot, including notes.
  if (!copy && event.closedAt) { before.id = id(); event.versions.splice(event.versions.length - 1, 0, before); }
  version.at = now(); return stamp(next);
}
export function reviseOrder(state: State, eventId: string, orderId: string, items: Item[], copy = false): State {
  return editEvent(state, eventId, version => {
    const order = version.orders.find(o => o.id === orderId);
    if (!order) throw new Error('Bestellung nicht gefunden.');
    order.revisions.push({ id: id(), at: now(), items: clone(items) });
  }, copy);
}
export function summarize(event: Event) {
  const rows = new Map<string, { title: string; quantity: number; revenue: number }>();
  for (const order of activeVersion(event).orders) for (const item of currentItems(order)) {
    const key = item.offerId + ':' + item.title;
    const row = rows.get(key) ?? { title: item.title, quantity: 0, revenue: 0 };
    row.quantity += item.quantity; row.revenue += item.quantity * item.price; rows.set(key, row);
  }
  return { rows: [...rows.values()], revenue: [...rows.values()].reduce((sum, row) => sum + row.revenue, 0), count: activeVersion(event).orders.length };
}
export function prune(state: State, at = Date.now()): State {
  const events = state.events.filter(event => !event.closedAt || !event.deleteAt || Date.parse(event.deleteAt) > at);
  return events.length === state.events.length ? state : stamp({ ...state, events });
}
export function reminderDue(state: State, at = Date.now()): number {
  const event = openEvent(state); if (!event) return 0;
  const bucket = Math.max(0, Math.floor((at - Date.parse(event.startedAt)) / 7200000));
  return bucket > event.reminderBucket ? bucket : 0;
}
export function acknowledgeReminder(state: State, bucket: number): State {
  const next = clone(state), event = openEvent(next); if (event) event.reminderBucket = bucket; return stamp(next);
}
// Import validation is deliberately strict: reject the whole file before any write.
export function validateState(value: unknown): State {
  const fail = () => { throw new Error('Ungültige oder nicht unterstützte Sicherungsdatei.'); };
  const obj = (v: unknown): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v);
  const str = (v: unknown) => typeof v === 'string' && v.length <= 10000;
  const ident = (v: unknown) => str(v) && (v as string).length > 0 && (v as string).length <= 200;
  const date = (v: unknown) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v) && Number.isFinite(Date.parse(v));
  const int = (v: unknown, max = MAX_CENTS) => Number.isSafeInteger(v) && (v as number) >= 0 && (v as number) <= max;
  const arr = (v: unknown): v is any[] => Array.isArray(v) && v.length <= 100000;
  const unique = (v: any[]) => new Set(v.map(x => x.id)).size === v.length;
  const image = (v: unknown) => typeof v === 'string' && /^[^/\\.][^/\\]*\.(svg|png|jpe?g|webp|gif|avif)$/i.test(v) && v.length <= 255;
  const note = (v: unknown) => obj(v) && ident(v.id) && str(v.label) && (v.type === 'text' ? str(v.value) : v.type === 'boolean' ? typeof v.value === 'boolean' : v.type === 'number' && (v.value === '' || typeof v.value === 'number' && Number.isFinite(v.value) && v.value >= 0));
  const notes = (v: unknown) => arr(v) && v.every(note) && unique(v);
  const item = (v: unknown) => obj(v) && ident(v.offerId) && str(v.title) && int(v.price) && image(v.image) && int(v.quantity, 9999) && v.quantity > 0;
  const items = (v: unknown) => arr(v) && v.every(item) && total(v) <= MAX_CENTS;
  const order = (v: unknown) => obj(v) && ident(v.id) && date(v.at) && arr(v.revisions) && v.revisions.length > 0 && unique(v.revisions) && v.revisions.every((r: unknown) => obj(r) && ident(r.id) && date(r.at) && items(r.items));
  if (!obj(value) || value.schemaVersion !== 1 || !date(value.updatedAt) || !obj(value.settings)) fail();
  const s = value as Record<string, any>, settings = s.settings;
  if (!int(settings.retentionDays, 36500) || settings.retentionDays < 1 || !notes(settings.templates) || !arr(settings.offers) || !unique(settings.offers) || !settings.offers.every((o: unknown) => obj(o) && ident(o.id) && str(o.title) && o.title.trim().length && int(o.price) && image(o.image) && typeof o.active === 'boolean') || !items(s.cart) || !notes(s.draftNotes) || !arr(s.events) || !unique(s.events)) fail();
  let openCount = 0;
  for (const e of s.events) {
    if (!obj(e) || !ident(e.id) || !str(e.title) || !date(e.startedAt) || !int(e.reminderBucket) || !ident(e.activeVersionId) || !arr(e.versions) || !e.versions.length || !unique(e.versions)) fail();
    if (e.closedAt === null) { openCount++; if (e.deleteAt !== null) fail(); }
    else if (!date(e.closedAt) || !date(e.deleteAt) || Date.parse(e.closedAt) < Date.parse(e.startedAt)) fail();
    if (!e.versions.some((v: any) => v.id === e.activeVersionId)) fail();
    for (const v of e.versions) if (!obj(v) || !ident(v.id) || !date(v.at) || !notes(v.notes) || !arr(v.orders) || !unique(v.orders) || !v.orders.every(order)) fail();
  }
  if (openCount > 1) fail();
  return clone(s as unknown as State);
}
export function load(storage: Pick<Storage, 'getItem' | 'setItem'>): State {
  const raw = storage.getItem(KEY);
  if (raw === null) return initialState();
  return validateState(JSON.parse(raw));
}
export function persist(storage: Pick<Storage, 'setItem'>, state: State) {
  // One atomic localStorage write; callers only update React state after success.
  validateState(state);
  storage.setItem(KEY, JSON.stringify(state));
}
export function importState(local: State, incoming: State, at = Date.now()): State {
  if (openEvent(local) || local.cart.length) throw new Error('Zuerst die Veranstaltung abschließen und die Auswahl leeren.');
  validateState(incoming);
  if (openEvent(incoming) || incoming.cart.length) throw new Error('Die Datei enthält eine offene Veranstaltung. Bitte dort zuerst abschließen und neu exportieren.');
  const next = clone(local); next.settings = clone(incoming.settings); next.draftNotes = clone(incoming.draftNotes);
  for (const imported of incoming.events) {
    if (Date.parse(imported.deleteAt!) <= at) continue;
    const existing = next.events.find(e => e.id === imported.id);
    if (!existing) { next.events.push(clone(imported)); continue; }
    if (Date.parse(existing.deleteAt!) <= at) continue;
    // Local metadata is retained; only divergent content creates alternative versions.
    for (const version of imported.versions) {
      const signature = (v: EventVersion) => canonical({ orders: v.orders, notes: v.notes });
      if (existing.versions.some(v => signature(v) === signature(version))) continue;
      const addition = clone(version);
      if (existing.versions.some(v => v.id === addition.id)) addition.id = id();
      existing.versions.push(addition);
      // Keep the local active version. Imported alternatives are available explicitly.
    }
  }
  return prune(stamp(next), at);
}
export function importPreview(local: State, incoming: State) {
  const merged = importState(local, incoming);
  return { events: merged.events.filter(e => !local.events.some(l => l.id === e.id)).length,
    versions: merged.events.reduce((sum, e) => sum + Math.max(0, e.versions.length - (local.events.find(l => l.id === e.id)?.versions.length ?? e.versions.length)), 0),
    expired: incoming.events.filter(e => e.deleteAt && Date.parse(e.deleteAt) <= Date.now()).length };
}
