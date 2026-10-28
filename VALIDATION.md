# Prüfstand

Stand: 28.10.2026

## Lokale Prüfung der aktuellen Version

- 15 Node-Tests für Datenmodell, Kassenabläufe, Import und Speicherfehler.
- 5 Node-Tests für Service Worker, Offline-Cache und Cacheversionen bei Änderungen an Bildern oder Worker-Code.
- TypeScript-Prüfung und vollständiger Vite-Produktionsbuild mit Offline-Cache.
- 6 Playwright-Prüfungen: Kassieren/Korrektur/Archiv/Wiederherstellung, Angebote/Notizvorlagen/Backup-Import, responsive Darstellung/Auswahl, Offline-Neustart, Screenshots und Auslieferung von HTML/PWA-Assets.

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

## Behobene Probleme

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
