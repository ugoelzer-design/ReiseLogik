# Hotel MVP Gap

## 1. Bestand heute

### Bereits real oder teilweise real
- Die Hotelroute hat einen durchgaengigen Frontend-Flow in `TravelLogik.html`, `modules/travel-hotels.js`, `modules/travel-results.js`, `modules/travel-booking-modal.js` und `modules/travel-bookings.js`.
- Mit Google Places kann die Suche echte Hotelobjekte laden.
- Der Flow Suche -> Auswahl -> Gastdaten -> lokaler Datensatz -> Anzeige unter Buchungen ist vorhanden.
- Das Kernmodell `offer -> booking` ist ueber `modules/travel-core.js` bereits zentralisiert.

### Noch lokal oder demo
- Die Vergleichslogik fuer Hotelprovider ist in `modules/travel-comparison.js` weiterhin simuliert.
- Google Places liefert hier nur Objekt-/Places-Daten, aber keine echten Hotelraten, keine echten Zimmer, keine Rate-Codes und keine Reservation-Create-Strecke.
- `modules/travel-settings.js` leitet Nachtpreise aktuell aus `priceLevel` ab und erzeugt Fruehstueck, Storno und Familien-Flags lokal.
- `modules/travel-hotels.js` erzeugt Zimmer-/Tarifoptionen lokal.
- Die bisherige Hotelbestaetigung war lokal gespeichert, aber keine echte externe Reservierung.
- Persistenz ist browserlokal, nicht backendseitig und nicht revisionssicher.

## 2. Zielbild entlang des aktuellen Flows

### Im Frontend kann bleiben
- Suchformular und Ergebnisliste
- Hoteldetailansicht
- Auswahl von Zimmer/Raten
- Gastdatenerfassung
- Buchungsansicht und Statusdarstellung

### Zwingend ins Backend
- Provider-API-Proxy fuer echte Hotelsuche oder echte Rate/Availability-Suche
- Mapping von Hotel, Room, Rate und Cancellation Policies
- Pre-Book / Recheck vor Abschluss
- Reservation-Create und spaeter Cancel / Modify
- Persistenz fuer Buchungsstatus, Referenzen, Fehler, Audit und Retry

### Was fuer echte Buchbarkeit fehlen muss
- Echte Such-/Availability-Quelle mit buchbaren Hotelangeboten
- Echte Preis-/Tarifdaten pro Zimmer und Belegung
- Provider-IDs fuer Hotel, Room, Rate und Reservation
- Vorabpruefung kurz vor Abschluss
- Reservation-Create mit echter Referenz
- Fehlerpfad fuer sold-out, Preiswechsel, ungultige Gastdaten, Timeout

## 3. Technischer Gap

### Zwingend fuer MVP
- Provider mit buchbaren Hotelraten statt nur Place Search
- Hotel/Room/Rate-Datenmodell mit echten IDs und Tokens
- Echte Availability- und Price-Recheck-Logik
- Guest-Datenmodell fuer Hotelgaeste
- Reservation-Create-Endpunkt
- Backend-Persistenz fuer Buchungen
- Echte Buchungsreferenz und Statusrueckgabe

### Spaeter wichtig
- Storno-Flow
- Aenderungen / Amendments
- Reconciliation / Polling
- Dokumente, Voucher, E-Mail-Versand
- Ops-Ansicht fuer Fehlversuche und Retry

### Bewusst noch nicht noetig
- Voller Zahlungscheckout
- Grosses CRM
- Voller Mid-/Backoffice-Umbau
- Multi-Provider-Orchestrierung mit komplexem Caching

## 4. Kleinstes echtes Hotel-MVP

### Phase 1: Echte Suchbasis
- Ziel: Suche liefert echte Hotelobjekte und kennzeichnet ehrlich, ob nur Suche oder schon buchungsrelevante Daten vorliegen.
- Frontend: bestehende Suche, Ergebnisliste und Readiness-Hinweise nutzen.
- Backend: optional noch kein Vollflow, aber mindestens stabiler Provider-Proxy.
- Abnahme: Ein Ergebnis kann klar als Demo, Live-Suche oder buchbar markiert werden.

### Phase 2: Pre-Book + Reservation
- Ziel: Ein klassisches Hotel kann nach Gastdaten ueber Pre-Check und Reservation-Create abgeschlossen werden.
- Frontend-Bedarf: Rate-Auswahl, Precheck-Status, Preiswechsel-/Sold-out-Handling, echte Referenzanzeige.
- Backend-Bedarf: Provider-Raten, Availability-Recheck, Reservation-Create, Persistenz.
- Abnahme: Eine Hotelbuchung liefert echte externe Referenz statt nur lokalem Datensatz.

### Phase 3: Verwaltung
- Ziel: Buchungspaare sauber verwalten.
- Frontend-Bedarf: Status, Storno, eventuelle Aenderungs- und Fehlerdarstellung.
- Backend-Bedarf: Cancel, Polling, Status-Sync.
- Abnahme: TravelLogik zeigt echten Lebenszyklus fuer Hotels an.

## 5. Externe Systeme / APIs

### Minimal
- Eine echte Hotel-Booking-API mit Search, Availability, Rates, PreBook/Recheck und Reservation
- Eigenes Backend als sicherer Proxy und Persistenzschicht

### Bereits sinnvoll weiterverwendbar
- Google Places nur als Discovery-/Entity-Layer
- Bestehende TravelLogik-Offer-/Booking-Struktur
- Bestehender Modal- und Buchungsflow

## 6. Direkt vorbereitet in diesem Schritt

- Neue ehrliche Hotel-Readiness-Schicht in `modules/travel-hotel-readiness.js`
- Ergebnislisten trennen jetzt zwischen Demo, Live-Suche, Vorabpruefung und wirklich buchbar
- Google-Places-Ergebnisse sind als echte Suche, aber nicht als echte Buchung gekennzeichnet
- Hotel-CTA ist jetzt `Buchung vorbereiten`, solange keine echte Provider-Reservierung vorliegt
- Hotelabschluss speichert jetzt bei fehlendem Provider-Precheck einen vorbereiteten Hotel-Fall statt eine vorgetaeuschte echte Buchung
- Buchungsansicht unterscheidet vorbereitete Hotelstrecke von bestaetigter Hotelbuchung

## 7. Was heute noch echte Hotelbuchung verhindert

- Kein echter Hotel-Rate-/Availability-Provider
- Kein Room-/Rate-Mapping mit Provider-IDs
- Kein Pre-Book / Recheck
- Kein Reservation-Create
- Keine backendseitige Persistenz
- Keine echte externe Buchungsreferenz

## 8. Was TravelLogik schon weiterverwenden kann

- Suchformular, Ergebnis-UI und Ratenauswahl
- Offer-/Booking-Normalisierung
- Buchungsmodal und Reisekontext
- Buchungsansicht fuer Status und Nachverfolgung
- Ehrliche Status- und Hinweislogik fuer Demo vs. Live-Suche vs. Buchbarkeit
