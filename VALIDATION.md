# Prüfstand

Stand: 28.10.2026

## Erfolgreich ausgeführt

- 14 Node-Tests für Datenmodell und Kassenabläufe: Centrechnung, Bildliste, Bestellabschluss, Rückzahlung/Korrektur, Zweistundennachfrage, Veranstaltungsabschluss, Archivversionen, unabhängige historische Notizen/Preise, Aufbewahrung, Import/Dubletten/Konflikte, ungültige Daten und Speicherfehler.
- 5 Node-Tests für Service Worker und Release-Cache: Installation ohne erzwungene Aktivierung, fehlgeschlagene Installation ohne Löschung des vorherigen Caches, Bereinigung unter Beachtung weiterer Fenster, Offline-Antworten sowie neue Cacheversion bei Bildänderungen und Dateinamen mit Leerzeichen.
- TypeScript/TSX-Syntax der Anwendungsdateien mit dem vorhandenen Babel-Parser geprüft.

## Noch auszuführen

Paketinstallation, vollständiger TypeScript-/Vite-Build und Playwright-Browserprüfungen konnten in der aktuellen Umgebung nicht ausgeführt werden: Netzwerkzugriffe und das Öffnen eines lokalen Servers sind gesperrt. Deshalb ist dies noch kein vollständig abgenommener Produktionsbuild.

Nach `npm install`:

```sh
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Die enthaltene GitHub-Action führt diese Schritte automatisch aus und liefert Screenshots und Testbericht als Artefakt. Sie kann erst nach dem Hochladen ins Repository laufen.

## GitHub-Übergabe

Lesen des Repositories funktioniert. Der tatsächliche Schreibversuch zum Initialisieren des leeren Repositories wurde von GitHub mit HTTP 403 „Resource not accessible by integration“ abgewiesen. Die App wurde deshalb bisher nicht ins Repository übertragen. Die GitHub-Integration benötigt Schreibzugriff auf Repository-Inhalte; für den enthaltenen Workflow muss auch das Schreiben von Workflow-Dateien erlaubt sein.
