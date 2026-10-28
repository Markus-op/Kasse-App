import { test, expect } from '@playwright/test';

test('kassieren, korrigieren, archivieren und wiederherstellen', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /^Nachos/ }).click();
  await page.getByRole('button', { name: /^Popcorn/ }).click();
  await expect(page.locator('.grand-total')).toContainText('1,50');
  await page.getByRole('button', { name: 'Bezahlt & speichern' }).click();
  await expect(page.locator('.grand-total')).toContainText('0,00');
  await page.getByRole('button', { name: 'Verlauf', exact: false }).first().click();
  await page.locator('.order-card').first().click();
  await page.getByRole('button', { name: 'Popcorn entfernen' }).click();
  await expect(page.locator('.difference')).toContainText('An Kunden zurückgeben');
  await expect(page.locator('.difference')).toContainText('0,50');
  await page.getByRole('button', { name: 'Änderung bestätigen' }).click();
  await expect(page.locator('.order-amount')).toContainText('1,00');
  await page.getByRole('button', { name: 'Kassenschluss', exact: true }).click();
  await expect(page.locator('.summary-total')).toContainText('1,00');
  await page.getByRole('button', { name: 'Bearbeiten', exact: true }).click();
  await page.getByLabel('Helfer', { exact: true }).fill('4');
  await page.getByRole('button', { name: 'Speichern', exact: true }).click();
  await page.getByRole('button', { name: 'Veranstaltung beenden' }).click();
  await page.getByRole('button', { name: 'Beenden', exact: true }).click();
  await page.locator('.event-card').first().click();
  await expect(page.locator('.notes-panel')).toContainText('4');
  await page.reload();
  await page.getByRole('button', { name: 'Verlauf', exact: false }).first().click();
  await page.getByRole('button', { name: /^Veranstaltungen/ }).click();
  await expect(page.locator('.event-card')).toHaveCount(1);
});

test('angebot und notizvorlagen bearbeiten; backup import nur nach abschluss', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Optionen', exact: true }).click();
  await page.getByRole('button', { name: 'Neues Angebot' }).click();
  await page.getByLabel('Titel', { exact: true }).fill('Kuchen');
  await page.getByLabel('Preis in €').fill('2,30');
  await page.getByRole('button', { name: 'Speichern', exact: true }).click();
  await expect(page.locator('.offer-settings')).toContainText('Kuchen');
  await page.getByRole('button', { name: 'Vorlagen bearbeiten' }).click();
  await page.getByRole('button', { name: 'Vorlage hinzufügen' }).click();
  await page.getByLabel('Bezeichner').last().fill('Aufgeräumt');
  await page.getByLabel('Typ', { exact: true }).last().selectOption('boolean');
  await page.getByRole('button', { name: 'Vorlagen speichern' }).click();
  await page.getByRole('button', { name: 'Zur Kasse', exact: true }).click();
  await page.getByRole('button', { name: /^Kuchen/ }).click();
  await page.getByRole('button', { name: 'Bezahlt & speichern' }).click();
  await page.getByRole('button', { name: 'Optionen', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sicherung aufspielen' })).toBeDisabled();
  await page.getByRole('button', { name: 'Kassenschluss', exact: true }).click();
  await page.getByRole('button', { name: 'Veranstaltung beenden' }).click();
  await page.getByRole('button', { name: 'Beenden', exact: true }).click();
  await page.getByRole('button', { name: 'Optionen', exact: true }).click();
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Alle Daten herunterladen' }).click();
  const download = await downloadEvent;
  const path = await download.path();
  await page.locator('input[type=file]').setInputFiles(path!);
  await expect(page.getByRole('dialog')).toContainText('Sicherung aufspielen?');
  await page.getByRole('button', { name: 'Import bestätigen' }).click();
  await page.getByRole('button', { name: 'Verlauf', exact: false }).first().click();
  await page.getByRole('button', { name: /^Veranstaltungen/ }).click();
  await expect(page.locator('.event-card')).toHaveCount(1);
});

test('responsive layout has no horizontal overflow and saves pending selection', async ({ page }) => {
  await page.goto('/');
  for (const size of [{ width: 390, height: 844 }, { width: 844, height: 390 }, { width: 768, height: 1024 }, { width: 1440, height: 1000 }]) {
    await page.setViewportSize(size);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  await page.getByRole('button', { name: /^Clubkarte/ }).click();
  await page.reload();
  await expect(page.locator('.grand-total')).toContainText('2,50');
});

test('production PWA works after offline reload', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Was darf’s sein?' })).toBeVisible();
  await page.getByRole('button', { name: /^Nachos/ }).click();
  await page.getByRole('button', { name: 'Bezahlt & speichern' }).click();
  await page.getByRole('button', { name: 'Verlauf', exact: false }).first().click();
  await expect(page.locator('.order-card')).toHaveCount(1);
  await context.setOffline(false);
});

test('screenshots', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.getByRole('button', { name: /^Nachos/ }).click();
  await page.getByRole('button', { name: /^Popcorn/ }).click();
  await page.screenshot({ path: testInfo.outputPath('kasse-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: testInfo.outputPath('kasse-mobile.png'), fullPage: true });
});
