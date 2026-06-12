# Modus: bewerben — Live-Assistent fürs Bewerbungsformular

Interaktiver Modus für den Moment, in dem der Kandidat in Chrome ein Bewerbungsformular ausfüllt. Liest, was auf dem Bildschirm steht, lädt den Kontext der vorherigen Bewertung der Stellenanzeige und erzeugt passgenaue Antworten für jede Frage des Formulars.

## Voraussetzungen

- **Empfohlen mit sichtbarem Playwright**: Im sichtbaren Modus sieht der Kandidat den Browser, und Claude kann mit der Seite interagieren.
- **Ohne Playwright**: Der Kandidat teilt einen Screenshot oder fügt die Fragen manuell ein.

## Workflow

```
1. ERKENNEN     → aktiven Chrome-Tab lesen (Screenshot / URL / Titel)
2. IDENTIFIZIEREN → Firma + Rolle aus der Seite extrahieren
3. SUCHEN       → mit bestehenden Reports unter reports/ abgleichen
4. LADEN        → vollständigen Report lesen + Block G (falls vorhanden)
5. VORPRÜFUNG   → Stellen-Liveness + Firmen/Rollen-Übereinstimmung vor dem Entwerfen bestätigen (Preflight-Gate)
6. ANALYSIEREN  → ALLE sichtbaren Fragen des Formulars identifizieren
7. ERZEUGEN     → Für jede Frage eine passgenaue Antwort generieren
8. PRÄSENTIEREN → Antworten formatiert zum Copy-Paste ausgeben
```

## Schritt 5 — Preflight-Gate (Vorprüfung)

Vor der Generierung von Bewerbungsantworten muss überprüft werden, ob das Formular noch auf eine aktive Stelle verweist. Dieses Gate wird ausgeführt, nachdem die Seite erkannt, das Unternehmen/die Rolle identifiziert und der entsprechende Report geladen wurde.

1. Lesen Sie die sichtbare URL, den Seitentitel, das Unternehmen, die Rolle und alle Signale für geschlossene/abgelaufene Stellen.
2. Wenn eine URL verfügbar ist, MÜSSEN Sie den Liveness-Checker programmgesteuert ausführen:
   ```bash
   node check-liveness.mjs [URL]
   ```
   Analysieren Sie die Ausgabe:
   - Wenn die Prüfung `expired` zurückgibt (oder die Stelle eindeutig geschlossen/abgelaufen ist):
     1. Brechen Sie den Vorgang sofort ab.
     2. Aktualisieren Sie den Status der Stelle in `data/applications.md` auf `Discarded`.
     3. Informieren Sie den Benutzer, dass die Stelle abgelaufen/geschlossen ist, Sie sie als `Discarded` markiert und die weitere Generierung abgebrochen haben.
   - Wenn die Prüfung `uncertain` ergibt oder fehlschlägt, warnen Sie den Kandidaten, bitten Sie ihn, manuell zu prüfen, und fahren Sie nur fort, wenn er bestätigt, dass die Stelle noch aktiv ist.
3. Vergleichen Sie das sichtbare Unternehmen und die Rolle mit dem übereinstimmenden Report.
4. Wenn sich das Unternehmen oder der Titel wesentlich geändert hat, halten Sie vor dem Entwerfen an und fragen Sie:
   "Das Formular scheint für [sichtbare Firma] — [sichtbare Rolle] zu sein, aber der übereinstimmende Report ist [Report Firma] — [Report Rolle]. Möchten Sie, dass ich die Stelle neu bewertete, die Antworten anpasse oder stoppe?"
5. Wenn die Stelle geschlossen zu sein scheint, verweigern Sie die Erstellung der finalen Antworten, es sei denn, der Kandidat setzt sich explizit mit einem bekannten Grund darüber hinweg.
6. Wenn die Liveness nicht überprüft werden kann, weil der Kandidat nur Fragen oder einen Screenshot eingefügt hat, weisen Sie auf diese Einschränkung hin und bitten Sie den Kandidaten, das Unternehmen, die Rolle und die aktive Stelle vor dem Entwerfen zu bestätigen.

Fahren Sie nicht mit Schritt 6 fort, bis dieses Preflight-Gate aufgelöst ist.

## Schritt 1 — Stellenanzeige erkennen

**Mit Playwright:** Snapshot der aktiven Seite. Titel, URL und sichtbaren Inhalt lesen.

**Ohne Playwright:** Den Kandidaten bitten, eines der folgenden zu tun:
- Einen Screenshot des Formulars teilen (das Read-Tool kann Bilder lesen)
- Die Fragen des Formulars als Text einfügen
- Firma + Rolle nennen, damit wir den Kontext suchen können

## Schritt 2 — Identifizieren und Kontext laden

1. Firmennamen und Rollentitel von der Seite extrahieren
2. In `reports/` per Grep (case-insensitive) nach dem Firmennamen suchen
3. Bei Treffer → vollständigen Report laden
4. Wenn Block G vorhanden ist → die früheren Draft-Antworten als Basis laden
5. Wenn KEIN Treffer → den Kandidaten warnen und eine schnelle Auto-Pipeline anbieten

## Schritt 3 — Änderungen an der Rolle erkennen

Wenn die Rolle auf dem Bildschirm von der bewerteten abweicht:
- **Den Kandidaten warnen**: "Die Rolle hat sich von [X] zu [Y] geändert. Soll ich neu bewerten oder die Antworten an den neuen Titel anpassen?"
- **Wenn anpassen**: Antworten ohne Neu-Bewertung an den neuen Titel angleichen
- **Wenn neu bewerten**: vollständige A-F-Bewertung durchführen, Report aktualisieren, Block G neu erzeugen
- **Tracker aktualisieren**: in `applications.md` den Rollentitel anpassen, falls nötig

## Schritt 6 — Fragen des Formulars analysieren

ALLE sichtbaren Fragen identifizieren:
- Freitextfelder (Anschreiben, "Warum diese Rolle", Motivation, etc.)
- Dropdowns (Wie haben Sie von uns erfahren, Arbeitserlaubnis, etc.)
- Ja/Nein (Umzug, Visum, Verfügbarkeit, etc.)
- Gehaltsfelder (Spanne, Gehaltsvorstellung — in Brutto-Jahresgehalt für DE)
- Upload-Felder (Lebenslauf, Anschreiben als PDF, Zeugnisse)

Jede Frage klassifizieren:
- **Bereits in Block G beantwortet** → bestehende Antwort übernehmen
- **Neue Frage** → Antwort aus dem Report + `cv.md` generieren

## Schritt 7 — Antworten erzeugen

Für jede Frage die Antwort nach folgendem Schema bauen:

1. **Kontext aus dem Report**: Proof Points aus Block B, STAR-Stories aus Block F nutzen
2. **Vorheriger Block G**: Wenn ein Draft existiert, als Basis nehmen und nachschärfen
3. **Ton "Ich entscheide mich für euch"**: gleiches Framework wie in der Auto-Pipeline — selbstbewusst, nicht bittend
4. **Spezifität**: etwas Konkretes aus der sichtbaren Stellenanzeige zitieren
5. **career-ops Proof Point**: in "Zusätzliche Informationen" einbauen, falls ein solches Feld existiert

**Spezielle deutsche Formularfelder, die häufig auftauchen:**
- **Gehaltsvorstellung (brutto, jährlich)** → Spanne aus `profile.yml`, in EUR, mit Hinweis "verhandelbar je nach Gesamtpaket"
- **Eintrittsdatum / Verfügbarkeit** → Realistisches Datum unter Berücksichtigung der Kündigungsfrist (oft 1-3 Monate)
- **Arbeitserlaubnis / Aufenthaltsstatus** → ehrlich und knapp; bei EU-Bürgern explizit "Keine Arbeitserlaubnis erforderlich (EU-Bürger:in)"
- **Sprachkenntnisse** → Deutsch / Englisch nach GER-Niveau (A1-C2) angeben
- **Anrede** → bei deutschen Formularen oft Pflichtfeld (Herr / Frau / Divers / Keine)

**Output-Format:**

```
## Antworten für [Firma] — [Rolle]

Basis: Report #NNN | Score: X.X/5 | Archetyp: [Typ]

---

### 1. [Exakte Frage aus dem Formular]
> [Antwort, fertig zum Kopieren]

### 2. [Nächste Frage]
> [Antwort]

...

---

Hinweise:
- [Beobachtungen zur Rolle, Änderungen, etc.]
- [Personalisierungs-Vorschläge, die der Kandidat nochmal prüfen sollte]
```

## Schritt 8 — Nach dem Absenden (optional)

Wenn der Kandidat bestätigt, dass die Bewerbung raus ist:
1. Status in `applications.md` von "Evaluated" auf "Applied" setzen
2. Block G im Report mit den finalen Antworten aktualisieren
3. Nächsten Schritt vorschlagen: `/career-ops contacto` für LinkedIn-Outreach an den Personalleiter / Hiring Manager

## Scroll-Handling

Wenn das Formular mehr Fragen hat als sichtbar:
- Den Kandidaten bitten, zu scrollen und einen weiteren Screenshot zu teilen
- Oder die restlichen Fragen einzufügen
- In Iterationen verarbeiten, bis das ganze Formular abgedeckt ist
