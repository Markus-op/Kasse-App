# Kasse · Einfach kassieren

Lokale Veranstaltungskasse mit großen Preisen, direkter Mengenwahl und dauerhaft sichtbarer Bestellsumme. Responsive in Hoch-/Querformat, als PWA offline nutzbar. Alle Daten bleiben im Browserprofil.

## Entwickeln und prüfen

Node.js 24 und npm verwenden:

```sh
npm ci
npm run dev
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm run preview
```

Mit einem bereits installierten Chromium kann `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/pfad/zu/chromium npm run test:e2e` verwendet werden.

## Netlify

`netlify.toml` konfiguriert Node.js 24, Build `npm run build`, Ausgabe `dist`, SPA-Weiterleitung sowie Sicherheits- und Cache-Header. Das Repository-Hauptverzeichnis ist die Build-Basis, Branch `main`.

Der Build erzeugt `dist/index.html` mit gehashten JavaScript-/CSS-Dateien, Bildern, Manifest, Icons und Service Worker. Die Quell-`index.html` oder das alte ZIP-Archiv allein sind kein fertiger Deploy. Für manuelles Deployment `npm ci && npm run build` ausführen und den vollständigen `dist`-Ordner bereitstellen. Die Regeln aus `netlify.toml` gelten bei Git-basierten Netlify-Builds. Keine Serverfunktionen, Datenbank oder Umgebungsvariablen nötig.

## Kasse

- Neue Installationen beginnen mit Clubkarte, Eintritt, Nachos, Popcorn, Snack, Getränk und Bundle. Bereits gespeicherte Angebotsreihenfolgen bleiben erhalten.
- Hochformat: Bild, Titel, Einzelpreis und Menge in einer Zeile. Querformat: Angebote als nebeneinanderliegende Spalten. Die Bestellsumme und **Bezahlt & speichern** stehen dauerhaft unten.
- Bei sieben Standardangeboten ist ab 320 × 480 im Hochformat bzw. 568 × 320 im Querformat kein Scrollen nötig. Bei vielen eigenen Angeboten scrollt nur die Angebotsliste, der Abschluss bleibt sichtbar.
- Antippen fügt einen Artikel hinzu; Minus entfernt ihn wieder. Der Gesamtpreis rechnet in Cent. **Bezahlt & speichern** dokumentiert eine bereits erfolgte Zahlung; es gibt keine Zahlungsanbindung.
- **Notizen** öffnet oben die Veranstaltungsnotizen. Zahlen lassen sich mit den Eingabepfeilen ändern und können nicht negativ werden. Vor der ersten Bestellung gespeicherte Notizen werden in die nächste Veranstaltung übernommen.
- Die erste bezahlte Bestellung eröffnet eine Veranstaltung. Sie bleibt auch über Mitternacht offen. Alle zwei Stunden erscheint bei aktiver Nutzung eine Nachfrage.
- Im **Verlauf** stehen ausschließlich Bestellungen der offenen Veranstaltung. Dort sind Korrekturen und Stornierungen mit Rückzahlungs-/Nachforderungsbetrag möglich. Bestellrevisionen bleiben nachvollziehbar, bis der Inhalt beim Kassenschluss schreibgeschützt wird.

## Optionen und Veranstaltungen

- Die Listen **Angebote** und **Veranstaltungen** sowie jede Veranstaltung sind zunächst zugeklappt.
- Angebote per Drag-and-drop oder mit den Pfeilen umsortieren. Auf Touchgeräten den Griff halten und auf die gewünschte Zeile ziehen. Angebote können deaktiviert, gelöscht oder ohne Bild angelegt werden. Bereits ausgewählte/verkaufte Positionen behalten ihren ursprünglichen Preis und Titel; Restmengen gelöschter Angebote bleiben in der Kasse entfernbar.
- Eine **Notizvorlage** gilt für neue Veranstaltungen. Bestehende Veranstaltungsnotizen behalten ihre damaligen Bezeichner, Typen und Werte.
- Beim **Kassenschluss** das Löschdatum für diese Veranstaltung wählen. Vorgabe: Abschlusszeit plus 35 Tage; die globale Standardaufbewahrung bleibt einstellbar und gilt für künftige Abschlüsse.
- Abgeschlossene Veranstaltungen stehen ausschließlich in **Optionen → Veranstaltungen**, mit deutlich angezeigtem Datum und Uhrzeit. Aufklappen zeigt Umsatz, Bestellungen und Notizen. Inhaltliche Änderungen sind gesperrt; Titel und Löschdatum bleiben änderbar. Es gibt keine Veranstaltungs-Versionen mehr.
- Beim Start und Wiederaktivieren werden abgelaufene Veranstaltungen entfernt. Eine normale Änderung verlängert das Löschdatum nicht automatisch. Ein Löschdatum in der Vergangenheit entfernt nach Bestätigung die betreffende Veranstaltung.

## Sicherungen und bestehende Daten

Regelmäßig über **Optionen → Alle Daten herunterladen** eine JSON-Sicherung speichern. Browserdaten nicht löschen: Es gibt keine Konten, Serverdatenbank oder Gerätesynchronisierung.

Import ist nur ohne offene Veranstaltung und ohne aktuelle Auswahl möglich; auch die Quelle muss abgeschlossen sein. Einstellungen und Notizvorlage werden ersetzt. Neue Veranstaltungen werden ergänzt. Bei gleicher Veranstaltungs-ID ersetzt der importierte Eintrag den lokalen Inhalt einschließlich Titel und Löschdatum vollständig. Die Vorschau nennt die Anzahl neuer/ersetzter Veranstaltungen; vor Bestätigung kann die lokale Sicherung heruntergeladen werden. Abgelaufene importierte Einträge werden übersprungen.

Das aktuelle Datenformat ist `schemaVersion: 2` mit direkten Bestellungen und Notizen pro Veranstaltung. Bestehende lokale Daten und Sicherungen im Format 1 werden geprüft und automatisch übertragen. Dabei wird der damals ausgewählte Veranstaltungsstand übernommen. Vor dem ersten Speichern wird der unveränderte alte lokale Datenbestand einschließlich ehemaliger Versionen unter `kasse.before-schema-2` im selben Browserprofil gesichert. Diese zusätzliche Sicherung ersetzt keine heruntergeladene Datei. Unbekannte Formate oder beschädigte Daten öffnen die Wiederherstellung, statt überschrieben zu werden.

Bei vollem/gesperrtem Speicher bleibt die Auswahl erhalten und eine Fehlermeldung erscheint. Änderungen anderer Fenster werden erkannt; parallele Kassenfenster sollten nicht verwendet werden.

## Bilder und Offline-Updates

Bilder in `Bilder/` ablegen und Dateinamen in `Bilder/Liste.md` je mit `- ` ergänzen. SVG, PNG, JPG/JPEG, WebP, GIF und AVIF sind möglich; Namen mit Leerzeichen werden unterstützt. Danach neu deployen. **Kein Bild** lässt ein Angebot bewusst ohne Bild erscheinen. Defekte vorhandene Bilddateien zeigen einen Platzhalter.

Der Build berechnet eine Cacheversion aus allen App-Dateien und dem Service-Worker-Code. Neue Versionen warten auf die Bestätigung über **Update** oben; kein automatischer Reload während einer Bestellung. Vor Aktivierung werden Daten gespeichert und zusätzlich unter `kasse.before-update` gesichert. Andere Fenster vorher schließen. Bei Speicherfehlern bleibt die bisherige App aktiv. HTML und Service Worker erhalten keine langfristigen Cache-Header, gehashte Assets dürfen dauerhaft gecacht werden.
