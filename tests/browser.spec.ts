import { test, expect } from '@playwright/test';
import { initialState, addItem, checkout, finishEvent, KEY } from '../src/model';

const navigate = async (page: any, name: string) => page.getByRole('navigation').getByRole('button', { name, exact: true }).click();
const openList = async (page: any, name: string) => page.locator(`.${name}-settings > summary`).click();
async function closeEvent(page: any, expiry?: string) {
  await navigate(page, 'Kassenschluss');
  await page.getByRole('button', { name: 'Veranstaltung beenden', exact: true }).click();
  if (expiry) await page.getByLabel('Löschen am', { exact: true }).fill(expiry);
  await page.getByRole('button', { name: 'Beenden', exact: true }).click();
}
function archivedFixture() {
  let state = initialState(); state.cart = addItem([], state.settings.offers[0]);
  state = checkout(state, new Date(Date.now() - 3600000).toISOString());
  return finishEvent(state);
}

test('cash register: order, correction, individual expiry and read-only archive', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading')).toHaveCount(0);
  await expect(page.locator('input[type=file]')).toBeHidden();
  await expect(page.locator('.offer-description')).toHaveText(['Clubkarte', 'Eintritt', 'Nachos', 'Popcorn', 'Snack', 'Getränk', 'Bundle']);
  await page.getByRole('button', { name: 'Nachos', exact: true }).click();
  await page.getByRole('button', { name: 'Popcorn', exact: true }).click();
  await expect(page.locator('.grand-total')).toContainText('1,50');
  await page.getByRole('button', { name: 'Bezahlt & speichern' }).click();
  await expect(page.locator('.grand-total')).toContainText('0,00');
  await navigate(page, 'Verlauf');
  await page.locator('.order-card').first().click();
  await page.getByRole('button', { name: 'Popcorn entfernen' }).click();
  await expect(page.locator('.difference')).toContainText('0,50');
  await page.getByRole('button', { name: 'Änderung bestätigen' }).click();
  await expect(page.locator('.order-amount')).toHaveText('1,00 €');
  await navigate(page, 'Kasse');
  await page.getByRole('button', { name: 'Notizen', exact: true }).click();
  await page.getByLabel('Helfer', { exact: true }).fill('4');
  await page.getByRole('button', { name: 'Speichern', exact: true }).click();
  const expiry = new Date(Date.now() + 50 * 86400000).toISOString().slice(0, 16);
  await closeEvent(page, expiry);
  await expect(page.locator('.events-settings')).not.toHaveAttribute('open', '');
  await openList(page, 'events');
  await expect(page.locator('.event-card')).toHaveCount(1);
  await expect(page.locator('.event-card')).not.toHaveAttribute('open', '');
  await page.locator('.event-card > summary').click();
  await expect(page.locator('.notes-panel')).toContainText('4');
  await page.locator('.orders-details > summary').click();
  await expect(page.locator('.order-card')).toHaveCount(1);
  await expect(page.locator('button.order-card')).toHaveCount(0);
  await expect(page.getByLabel('Version', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Titel / Löschdatum' }).click();
  await page.getByLabel('Titel', { exact: true }).fill('Sommerfest');
  await expect(page.getByLabel('Löschen am', { exact: true })).toHaveValue(expiry);
  await page.getByRole('button', { name: 'Speichern', exact: true }).click();
  await expect(page.locator('.event-card > summary')).toContainText('Sommerfest');
  await navigate(page, 'Verlauf');
  await expect(page.locator('.event-card')).toHaveCount(0);
  await expect(page.getByText('Keine offene Veranstaltung', { exact: true })).toBeVisible();
});

test('notes only at top, numeric keyboard arrows never go below zero', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Notizen', exact: true })).toHaveCount(1);
  await page.getByRole('button', { name: 'Notizen', exact: true }).click();
  const input = page.getByLabel('Helfer', { exact: true });
  await input.fill('0'); await input.press('ArrowDown'); await expect(input).toHaveValue('0');
  await input.press('ArrowUp'); await expect(input).toHaveValue('1');
  await input.fill('-3'); await expect(input).toHaveValue('0');
  await page.getByRole('button', { name: 'Speichern', exact: true }).click();
  await page.reload(); await page.getByRole('button', { name: 'Notizen', exact: true }).click();
  await expect(page.getByLabel('Helfer', { exact: true })).toHaveValue('0');
});

test('offers: collapsed list, drag sorting, keyboard sorting, no image and deletion', async ({ page }) => {
  await page.goto('/'); await navigate(page, 'Optionen');
  await expect(page.locator('.offers-settings')).not.toHaveAttribute('open', '');
  await expect(page.getByText('Deine Kasse als App', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Notizvorlage', exact: true })).toBeVisible();
  await openList(page, 'offers');
  const rows = page.locator('.offer-setting-row');
  await rows.first().dragTo(rows.nth(2));
  await expect(rows.nth(2)).toHaveAttribute('data-offer-id', 'clubkarte');
  await page.getByRole('button', { name: 'Clubkarte nach oben' }).click();
  await expect(rows.nth(1)).toHaveAttribute('data-offer-id', 'clubkarte');
  await page.getByRole('button', { name: 'Neues Angebot' }).click();
  await page.getByLabel('Titel', { exact: true }).fill('Kuchen');
  await page.getByLabel('Preis in €').fill('2,30');
  await page.getByRole('button', { name: 'Kein Bild', exact: true }).click();
  await page.getByRole('button', { name: 'Speichern', exact: true }).click();
  await expect(page.locator('.offer-settings')).toContainText('Kuchen');
  await navigate(page, 'Kasse');
  const cake = page.locator('.offer-card').filter({ has: page.getByRole('button', { name: 'Kuchen', exact: true }) });
  await expect(cake.locator('img')).toHaveCount(0);
  await page.getByRole('button', { name: 'Kuchen', exact: true }).click();
  await expect(page.locator('.grand-total')).toContainText('2,30');
  await navigate(page, 'Optionen'); await openList(page, 'offers');
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Kuchen löschen' }).click();
  await expect(page.locator('.offer-settings')).not.toContainText('Kuchen');
  await navigate(page, 'Kasse');
  await expect(page.locator('.grand-total')).toContainText('2,30');
  await page.getByRole('button', { name: 'Kuchen verringern' }).click();
  await expect(page.locator('.grand-total')).toContainText('0,00');
  await page.reload();
  await expect(page.locator('.offer-description')).not.toContainText(['Kuchen']);
});

test('template and backup import: matched event is replaced, with no extra version', async ({ page }) => {
  await page.goto('/'); await navigate(page, 'Optionen');
  await page.getByRole('button', { name: 'Vorlage bearbeiten' }).click();
  await page.getByRole('button', { name: 'Vorlage hinzufügen' }).click();
  await page.getByLabel('Bezeichner').last().fill('Aufgeräumt');
  await page.getByLabel('Typ', { exact: true }).last().selectOption('boolean');
  await page.getByRole('button', { name: 'Vorlage speichern' }).click();
  await navigate(page, 'Kasse');
  await page.getByRole('button', { name: 'Clubkarte', exact: true }).click();
  await page.getByRole('button', { name: 'Bezahlt & speichern' }).click();
  await navigate(page, 'Optionen');
  await expect(page.getByRole('button', { name: 'Sicherung aufspielen' })).toBeDisabled();
  await closeEvent(page);
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Alle Daten herunterladen' }).click();
  const download = await downloaded;
  const fs = await import('node:fs/promises');
  const backup = JSON.parse(await fs.readFile((await download.path())!, 'utf8'));
  expect(backup.schemaVersion).toBe(2); expect(backup.events[0].versions).toBeUndefined();
  backup.events[0].title = 'Importierter Titel'; backup.events[0].notes[0].value = 9;
  await page.locator('input[type=file]').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
  await expect(page.getByRole('dialog')).toContainText('1ersetzte Veranstaltungen');
  await page.getByRole('button', { name: 'Import bestätigen' }).click();
  await openList(page, 'events');
  await expect(page.locator('.event-card')).toHaveCount(1);
  await page.locator('.event-card > summary').click();
  await expect(page.locator('.event-card')).toContainText('Importierter Titel');
  await expect(page.locator('.notes-panel')).toContainText('9');
  await expect(page.locator('.notes-panel')).toContainText('Aufgeräumt');
});

test('default 35-day expiry is proposed for each event', async ({ page }) => {
  await page.goto('/'); await page.getByRole('button', { name: 'Eintritt', exact: true }).click();
  await page.getByRole('button', { name: 'Bezahlt & speichern' }).click();
  await navigate(page, 'Kassenschluss'); await page.getByRole('button', { name: 'Veranstaltung beenden', exact: true }).click();
  const input = page.getByLabel('Löschen am', { exact: true });
  const delta = await input.evaluate((node: HTMLInputElement) => new Date(node.value).getTime() - Date.now());
  expect(Math.abs(delta - 35 * 86400000)).toBeLessThan(120000);
});

test('register fits small portrait and landscape screens with visible bottom total', async ({ page }) => {
  await page.goto('/');
  for (const size of [{ width: 320, height: 480 }, { width: 390, height: 844 }, { width: 568, height: 320 }, { width: 844, height: 390 }, { width: 768, height: 1024 }, { width: 1440, height: 1000 }]) {
    await page.setViewportSize(size);
    const dimensions = await page.evaluate(() => {
      const grid = document.querySelector('.offer-grid')!;
      const total = document.querySelector('.checkout-bar')!.getBoundingClientRect();
      const nav = document.querySelector('.navigation')!.getBoundingClientRect();
      return { pageWidth: document.documentElement.scrollWidth, width: innerWidth, pageHeight: document.documentElement.scrollHeight, height: innerHeight, gridHeight: grid.clientHeight, gridContentHeight: grid.scrollHeight, gridWidth: grid.clientWidth, gridContentWidth: grid.scrollWidth, totalBottom: total.bottom, navTop: nav.top };
    });
    expect(dimensions.pageWidth, JSON.stringify(size)).toBeLessThanOrEqual(dimensions.width);
    expect(dimensions.pageHeight, JSON.stringify(size)).toBeLessThanOrEqual(dimensions.height);
    expect(dimensions.gridContentHeight, JSON.stringify(size)).toBeLessThanOrEqual(dimensions.gridHeight + 1);
    expect(dimensions.gridContentWidth, JSON.stringify(size)).toBeLessThanOrEqual(dimensions.gridWidth + 1);
    expect(dimensions.totalBottom, JSON.stringify(size)).toBeLessThanOrEqual(dimensions.navTop + 1);
  }
  await page.getByRole('button', { name: 'Clubkarte', exact: true }).click(); await page.reload();
  await expect(page.locator('.grand-total')).toContainText('2,50');
});

test('offline production PWA can reload and save an order', async ({ page, context }) => {
  await page.goto('/'); await page.evaluate(async () => { await navigator.serviceWorker.ready; }); await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true); await page.reload();
  await page.getByRole('button', { name: 'Nachos', exact: true }).click();
  await page.getByRole('button', { name: 'Bezahlt & speichern' }).click();
  await navigate(page, 'Verlauf'); await expect(page.locator('.order-card')).toHaveCount(1);
  await context.setOffline(false);
});

test('existing schema-1 data migrates to the selected event without losing a raw backup', async ({ page }) => {
  const old = archivedFixture() as any;
  old.schemaVersion = 1;
  old.events = old.events.map((event: any) => { const { orders, notes, ...metadata } = event; return { ...metadata, activeVersionId: 'selected', versions: [{ id: 'selected', at: event.closedAt, orders, notes }] }; });
  await page.goto('/'); await page.evaluate(({ key, raw }) => localStorage.setItem(key, raw), { key: KEY, raw: JSON.stringify(old) }); await page.reload();
  await navigate(page, 'Optionen'); await openList(page, 'events'); await expect(page.locator('.event-card')).toHaveCount(1);
  await navigate(page, 'Kasse'); await page.getByRole('button', { name: 'Nachos', exact: true }).click();
  const stored = await page.evaluate(key => ({ state: JSON.parse(localStorage.getItem(key)!), backup: localStorage.getItem('kasse.before-schema-2') }), KEY);
  expect(stored.state.schemaVersion).toBe(2); expect(stored.state.events[0].versions).toBeUndefined(); expect(JSON.parse(stored.backup!)).toEqual(old);
});

test('production entry and assets are served', async ({ request }) => {
  const response = await request.get('/index.html'); expect(response.ok()).toBe(true);
  const html = await response.text(); expect(html).toContain('<div id="root"></div>');
  const script = html.match(/src="([^" ]+\.js)"/); expect(script).not.toBeNull();
  for (const path of [script![1], '/manifest.webmanifest', '/sw.js', '/Bilder/Liste.md', '/icon-192.png']) {
    const asset = await request.get(path); expect(asset.ok(), path).toBe(true); expect(asset.headers()['content-type'], path).not.toContain('text/html');
  }
});

test('screenshots in both orientations', async ({ page }, testInfo) => {
  await page.goto('/'); await page.getByRole('button', { name: 'Nachos', exact: true }).click();
  for (const size of [{ width: 390, height: 844 }, { width: 844, height: 390 }, { width: 1440, height: 1000 }]) {
    await page.setViewportSize(size); await page.screenshot({ path: testInfo.outputPath(`kasse-${size.width}.png`), fullPage: true });
  }
});

test('offers can be reordered by touch using the drag handle', async ({ browser }) => {
  const context = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  try {
    await page.goto('/'); await navigate(page, 'Optionen'); await openList(page, 'offers');
    const source = await page.getByRole('button', { name: 'Clubkarte verschieben' }).boundingBox();
    const target = await page.locator('[data-offer-id="nachos"]').boundingBox();
    expect(source).not.toBeNull(); expect(target).not.toBeNull();
    const session = await context.newCDPSession(page);
    const point = { x: source!.x + source!.width / 2, y: source!.y + source!.height / 2 };
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: point.x, y: target!.y + target!.height / 2 }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(page.locator('.offer-setting-row').nth(2)).toHaveAttribute('data-offer-id', 'clubkarte');
    await session.detach();
  } finally { await context.close(); }
});
