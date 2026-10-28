# Prüfstand

Stand: 28.10.2026

## Lokale Prüfung der aktuellen Version

- 19 Node-Tests für Kassenabläufe, Archiv-Schreibschutz, individuelles Löschdatum, Angebote, Import, Migration alter Daten und Speicherfehler.
- 5 Node-Tests für Service Worker, Offline-Cache und Cacheversionen bei Änderungen an Bildern oder Worker-Code.
- TypeScript-Prüfung und vollständiger Vite-Produktionsbuild mit Offline-Cache.
- 11 Playwright-Prüfungen: Kassenabschluss/Korrektur/Archiv/Metadaten, Notizen und Zahlenpfeile, Angebote ohne Bild und Löschen, Drag-and-drop per Maus und Touch, Notizvorlage/Import-Ersetzung, 35-Tage-Vorgabe, Layout auf kleinen Bildschirmen, Offline-Neustart, Migration alter Daten, Screenshots und Auslieferung von HTML/PWA-Assets.
- Ohne Seiten- oder Angebotsscrollen geprüft: 320 × 480, 390 × 844, 568 × 320, 844 × 390, 768 × 1024 und 1440 × 1000 bei den sieben Standardangeboten. Bei allen Größen bleibt der Gesamtpreis oberhalb der Navigation sichtbar.
- Alle genannten Prüfungen erfolgreich; Hoch-/Querformat-Screenshots zusätzlich visuell kontrolliert.

Die Browserprüfungen in der Cloud verwenden den vorinstallierten Chromium über
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium`. Ohne diese Variable nutzt
Playwright seinen eigenen installierten Browser; so läuft auch die GitHub-Action.

```sh
npm ci
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

## Aktuelle Änderungen

- Größere Schrift und auffällige Einzelpreise; Kassenansicht ohne Überschriften, mit Notizen nur oben und fest sichtbarem Bestellabschluss.
- Clubkarte und Eintritt zuerst bei neuen Installationen. Bestehende Angebotsreihenfolgen bleiben erhalten.
- Angebote und Veranstaltungslisten zunächst zugeklappt; Angebote sortierbar, löschbar und ohne Bild möglich.
- Abgeschlossene Veranstaltungen in den Optionen statt im Verlauf; Inhalt schreibgeschützt, Titel/Löschdatum änderbar.
- Keine Veranstaltungs-Versionen mehr. Import mit identischer ID ersetzt den gesamten Eintrag.
- Format 2 mit geprüfter Übernahme des ausgewählten Veranstaltungsstands aus Format 1; unveränderter alter lokaler Datenbestand wird vor dem ersten Speichern separat gesichert.
- Individuelles Löschdatum beim Abschluss, globale Vorgabe weiterhin 35 Tage.

## Bereits behobene Probleme

- Versteckte Datei-Eingabefelder bleiben trotz allgemeiner Formular-CSS-Regeln verborgen und blockieren keine Klicks mehr.
- Die Auswahl des Notiztyps hat einen eindeutigen zugänglichen Namen.
- Beschädigte verschachtelte Sicherungseinträge werden mit einer verständlichen Validierungsfehlermeldung abgewiesen.
- Auch Änderungen am Service-Worker-Code erzeugen eine neue Cacheversion.
- Eine npm-Lockdatei und `npm ci` im CI sichern reproduzierbare Abhängigkeiten.

## Netlify

`netlify.toml` verwendet Node.js 24, Build `npm run build`, Ausgabe `dist` sowie
SPA-Weiterleitung und Cache-/Sicherheitsheader. Der Build erzeugt `dist/index.html`,
gehashte CSS-/JavaScript-Dateien, Bilder, Manifest, Icons und Service Worker.
Ein tatsächlicher Netlify-Deploy und dessen Produktionsantworten wurden hier nicht
geprüft; dafür ist die Verbindung des Repositories mit Netlify erforderlich.
