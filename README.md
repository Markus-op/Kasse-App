# Kasse · Einfach kassieren

Eine lokale Kasse für Veranstaltungen: große Angebotskacheln, nachvollziehbare Bestellkorrekturen, Kassenschluss und Veranstaltungsarchiv. Responsive in Hoch-/Querformat, installierbar als PWA und nach dem ersten Laden offline nutzbar.

## Starten

Node.js 24 und npm verwenden:

```sh
npm ci
npm run dev
```

```sh
npm test          # Datenlogik, ohne zusätzliche Testbibliothek
npm run build    # TypeScript, Vite und versionierter Offline-Cache
npx playwright install chromium
npm run test:e2e # Browserabläufe gegen den Produktionsbuild
npm run preview  # Produktionsbuild lokal ansehen
```

## Netlify

Die veröffentlichbare Einstiegsdatei ist `dist/index.html` (kleingeschrieben).
Die `index.html` im Repository ist der Vite-Einstieg und wird beim Build zusammen
mit JavaScript, CSS, Bildern, Manifest und Service Worker nach `dist/` verarbeitet.
In Netlify den Branch `main`, das Repository-Hauptverzeichnis als Basis,
Build-Befehl `npm run build` und Veröffentlichungsordner `dist` verwenden.
Kein ZIP-Archiv und keine einzelne Quell-HTML-Datei als fertige Website hochladen.
Für manuelles Deployment zuerst `npm ci && npm run build` ausführen und den
vollständigen Inhalt von `dist/` bereitstellen. Die Header und Weiterleitungen
in `netlify.toml` gelten bei Git-basierten Netlify-Builds.


Repository in Netlify verbinden, Build `npm run build`, Ausgabeordner `dist`. Die Datei `netlify.toml` enthält diese Vorgaben, Node-Version, Sicherheits- und Cache-Header. Keine Umgebungsvariablen oder Serverfunktionen erforderlich. PWA-Installation benötigt HTTPS oder localhost.

## Bilder hinzufügen

Dateien in `Bilder/` ablegen. Dieser Ordner wird unverändert unter `/Bilder/` ausgeliefert. In `Bilder/Liste.md` je Datei eine Zeile ergänzen:

```md
- nachos.svg
- Mein neues Bild.png
- ticket.jpg
```

SVG, PNG, JPG/JPEG, WebP, GIF und AVIF sind möglich; Leerzeilen, CRLF und Dateinamen mit Leerzeichen funktionieren. Danach neu deployen und das App-Update installieren. Angebote können in den Optionen ein Bibliotheksbild, Titel und Europreis erhalten. Neue Bilder werden beim Build automatisch offline aufgenommen. Ein defektes Bild zeigt einen Platzhalter.

## Bedienung und Daten

- Angebote antippen, Mengen mit +/− ändern, dann **Bezahlt & speichern**. Dieser Button dokumentiert eine bereits erfolgte Zahlung; es gibt keine Zahlungsanbindung.
- Der erste Verkauf eröffnet die Veranstaltung. Sie läuft bis zum Kassenschluss weiter, auch über Mitternacht. Alle zwei Stunden wird bei aktiver Nutzung nachgefragt. **Neue Veranstaltung** archiviert sofort und behält ungespeicherte Auswahl für die nächste Veranstaltung.
- Im Verlauf Bestellungen ändern: ursprünglichen/neuen Stand und Rückzahlung bzw. Nachforderung prüfen, dann bestätigen. Eine leere korrigierte Bestellung entspricht einer Stornierung; sie und ihr Verlauf bleiben erhalten.
- Beim Kassenschluss stehen Mengen, Umsatz und Notizen. Vorlagenänderungen gelten erst für neue Veranstaltungen. Alte Notizen speichern Bezeichner, Typ und Wert unabhängig von der Vorlage.
- Abgeschlossene Veranstaltungen lassen sich umbenennen und haben ein individuell änderbares Löschdatum. Inhaltskorrekturen können überschreiben oder eine verknüpfte neue Version erzeugen. Auch beim Überschreiben bleibt ein vorheriger vollständiger Stand erhalten. Es gibt keine Gesamtauswertung über mehrere Veranstaltungen.
- Standardaufbewahrung: 35 Tage ab Abschluss. Bei Start/Wiederaktivierung werden abgelaufene Veranstaltungen mit allen Versionen entfernt. Änderungen verlängern die Frist nicht automatisch. Die allgemeine Frist gilt für künftige Abschlüsse.
- Alle App-Daten liegen im `localStorage` dieses Browserprofils. Keine Konten, Serverdatenbank oder Gerätesynchronisierung. Browserdaten nicht löschen; regelmäßig über Optionen eine JSON-Sicherung herunterladen. Auswahländerungen werden sofort gespeichert, Korrekturformulare erst nach Bestätigung.
- Import ist nur ohne offene Veranstaltung und ohne aktuelle Auswahl möglich; die Quelle muss ebenfalls abgeschlossen sein. Einstellungen werden ersetzt, Archive ergänzt. Gleiche Inhalte werden nicht dupliziert; abweichende Inhalte erscheinen als verknüpfte neue Version. Der lokale aktive Stand und lokale Titel/Löschdaten bleiben bei bekannten Veranstaltungen erhalten. Importversionen wählt man im Archiv aus. Abgelaufene Veranstaltungen werden nicht wiederhergestellt. Vor dem bestätigten Import kann eine Sicherung heruntergeladen werden.
- Datenformat `schemaVersion: 1` mit stabilen IDs, Preisen in Cent, ISO-Zeitstempeln und vollständigen Bestellrevisionen. Unbekannte Schema-Versionen werden ohne Schreibzugriff abgewiesen. Zukünftige Formatänderungen müssen explizite Migrationen hinzufügen. Unlesbare lokale Daten öffnen eine Wiederherstellung statt sie zu überschreiben.
- Bei vollem/gesperrtem Speicher bleibt die Bestellung erhalten und eine Fehlermeldung erscheint. Änderungen aus anderen Fenstern werden erkannt; parallele Kassenfenster sollten nicht verwendet werden.

## PWA-Updates

Der Build erzeugt einen Inhalts-Hash aus **allen** App-Dateien und einen eigenen Offline-Cache. Eine neue Version wartet auf **Jetzt aktualisieren**; kein automatischer Reload während einer Bestellung. Vor Aktivierung werden die aktuellen Daten atomar gespeichert und zusätzlich unter `kasse.before-update` gesichert. Nach erfolgreichem Laden wird die zusätzliche Sicherung entfernt, damit sie keinen dauerhaften Speicherplatz belegt. Bei unlesbaren Daten kann sie in der Wiederherstellung geladen werden. Bei Speicherfehler bleibt die alte App aktiv. Beim Update andere Fenster schließen. Alte Release-Caches werden nach Aktivierung aufgeräumt, sofern keine weiteren Fenster sie benötigen. Service Worker und HTML erhalten keine langfristigen Cache-Header; gehashte Assets dürfen dauerhaft gecacht werden.

Die GitHub-Action prüft Datenlogik, TypeScript, Produktionsbuild, Browserbedienung, Layout und Offline-Neustart und stellt Build, Testbericht und Screenshots als Artefakt bereit.
