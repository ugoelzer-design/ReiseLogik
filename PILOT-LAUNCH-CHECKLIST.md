# TravelLogik Pilot-Launch-Checkliste

Stand: 20.04.2026

## Ziel

Diese Checkliste ist fuer den naechsten echten Schritt nach dem pilotfaehigen Anfrageflow gedacht:

> ein kleiner, belastbarer Pilotbetrieb mit realem Anfrageeingang, manueller Bearbeitung und sauberem externem Test

Nicht das Ziel:

- Vollautomatisierung
- echter Checkout
- CRM- oder Backend-Umbau
- breite neue Feature-Entwicklung

## 1. Go-Live-Grundlagen

- [ ] `TravelLogik.html` in einem stabilen Hosting-Setup oder auf einer testbaren Domain bereitstellen
- [ ] pruefen, ob die App auf Desktop und Mobile sauber laedt
- [ ] Pilot-Inbox in den Einstellungen eintragen
- [ ] Anzeigename des Pilot-Teams setzen
- [ ] Bearbeitername oder verantwortliches Team hinterlegen
- [ ] Rueckmeldefenster in Stunden festlegen
- [ ] Standard-Kontaktweg festlegen
- [ ] einmal pruefen, dass Anfrage per Copy und per `mailto:` sauber uebergeben werden kann

## 2. Produktklarheit vor externem Test

- [ ] Startseite einmal gegenlesen: keine Stelle darf automatisierte Live-Buchung versprechen
- [ ] Anfrage-Flow einmal Ende-zu-Ende pruefen: Auswahl -> Kontakt & Bedarf -> Anfrage fertig
- [ ] pruefen, ob nach Absenden klar wird, was als naechstes passiert
- [ ] pruefen, ob Status und Anfrage-Arbeitsplatz fuer Nicht-Entwickler verstaendlich sind
- [ ] sicherstellen, dass Demo-/Vorbereitungsbereiche weiterhin klar als solche lesbar sind

## 3. Operativer Mini-Prozess

- [ ] festlegen, wer die Pilot-Inbox kontrolliert
- [ ] festlegen, wie oft pro Tag auf neue Anfragen geschaut wird
- [ ] festlegen, wer Status in TravelLogik aktualisiert
- [ ] definieren, wann ein Fall auf `In Pruefung` gesetzt wird
- [ ] definieren, wann ein Fall auf `Rueckmeldung offen` gesetzt wird
- [ ] definieren, wann ein Fall als `Abgeschlossen` gilt
- [ ] definieren, wann ein Fall verworfen wird

## 4. Externe Testnutzer vorbereiten

- [ ] 3 bis 5 echte Testnutzer auswaehlen
- [ ] Testnutzer moeglichst aus dem spaeteren Zielprofil waehlen
- [ ] jeden Testnutzer mit einem klaren Szenario losschicken
- [ ] Testnutzer nicht fuehren, sondern den Flow moeglichst real benutzen lassen
- [ ] festlegen, wie Feedback gesammelt wird: Mail, kurzer Call oder Notion/Doc

Beispiel-Szenarien:

- [ ] Wochenendtrip mit Flug und Hotel
- [ ] Familienanfrage mit Wunsch nach Rueckruf
- [ ] Hotelanfrage mit konkreten Anforderungen
- [ ] Mietwagenanfrage mit Preisfokus

## 5. Was im Test beobachtet werden soll

- [ ] verstehen Nutzer den Unterschied zwischen Anfrage und echter Buchung?
- [ ] verstehen Nutzer, was nach Absenden passiert?
- [ ] entsteht genug Vertrauen fuer eine echte Anfrage?
- [ ] sind die eingegebenen Informationen fuer manuelle Bearbeitung brauchbar?
- [ ] ist der gewaehlte Rueckmeldeweg sinnvoll?
- [ ] wirkt die Rueckmeldungsgeschwindigkeit glaubwuerdig?
- [ ] gibt es Stellen, die noch intern oder halbfertig wirken?

## 6. Manuelle Bearbeitung absichern

- [ ] Eingangsbestätigung als Standardtext vorbereiten
- [ ] erste fachliche Rueckmeldung als Standardtext vorbereiten
- [ ] kurzer Nachfrage-Text fuer unvollstaendige Anfragen vorbereiten
- [ ] Absage-/Nicht-passend-Text vorbereiten
- [ ] festlegen, wo Rueckmeldungen dokumentiert werden

Minimal ausreichend:

- E-Mail-Postfach
- diese Checkliste
- TravelLogik-Anfragen-Seite
- ein simples Log in Doc/Sheet/Notion

## 7. Trockentest vor echten Nutzern

- [ ] selbst 2 bis 3 komplette Testanfragen durchspielen
- [ ] eine Anfrage ohne Pilot-Inbox pruefen
- [ ] eine Anfrage mit Pilot-Inbox pruefen
- [ ] Statuswechsel komplett durchklicken
- [ ] pruefen, ob Anfragezusammenfassung fuer Bearbeitung wirklich reicht
- [ ] pruefen, ob Copy/Paste in Mail oder Dokument sauber aussieht

## 8. Launch-Tag

- [ ] Testnutzer einladen
- [ ] klar sagen, dass es ein betreuter Pilot ist
- [ ] Rueckmeldefenster aktiv einhalten
- [ ] jede eingehende Anfrage sofort sichten
- [ ] offene Fragen direkt nachhalten
- [ ] erste 3 bis 5 Faelle nicht parallel vernachlaessigen

## 9. Nach dem ersten Testblock

- [ ] jede Anfrage kurz auswerten
- [ ] haeufigste Verstaendnisprobleme sammeln
- [ ] haeufigste operative Reibung sammeln
- [ ] haeufigste Vertrauensluecken sammeln
- [ ] entscheiden, ob der naechste Hebel eher

  - [ ] bessere Anfragequalitaet
  - [ ] bessere Rueckmeldekommunikation
  - [ ] bessere interne Bearbeitung
  - [ ] kleiner technischer Anschluss

## 10. Noch bewusst nicht machen

- [ ] kein CRM einfuehren
- [ ] keinen echten Checkout andeuten
- [ ] keine automatische Angebotslogik versprechen
- [ ] kein grosses Backend aus dem Pilot heraus begruenden
- [ ] keine neue Modulbreite priorisieren, solange Anfrageeingang und Bearbeitung noch nicht sauber laufen

## Definition von "pilotbereit"

TravelLogik ist fuer den ersten echten Pilotbetrieb bereit, wenn:

- [ ] echte externe Nutzer eine Anfrage sauber absenden koennen
- [ ] diese Anfrage operativ sinnvoll ankommt
- [ ] das Team weiss, wie damit manuell gearbeitet wird
- [ ] eine erste Rueckmeldung innerhalb des versprochenen Fensters erfolgt
- [ ] kein Teil des Flows mehr so wirkt, als sei bereits echte Vollautomatisierung vorhanden

## Empfehlung fuer den unmittelbaren naechsten Schritt

1. Hosting oder saubere lokale Test-URL festziehen
2. Pilot-Inbox plus Bearbeiterdaten konfigurieren
3. zwei interne Trockentests durchspielen
4. dann sofort mit 3 echten Testnutzern live gehen
