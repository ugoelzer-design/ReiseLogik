# Hotel Backend Contract

## Ziel

Minimaler produktiver Hotel-MVP fuer TravelLogik:
- echte Hotelsuche
- echtes Room-/Rate-Mapping
- Rate Check vor Abschluss
- Prebook / Recheck vor Reservation Create
- Reservation Create mit externer Referenz
- persistierte Hotel-Reservierungsakte mit ehrlichen Statusstufen

## Statusmodell

- `demo`: nur lokal vorbereitete Hoteldaten
- `live-search`: Hotel live gefunden, aber ohne echte Rate-/Availability-Pruefung
- `precheck-required`: Provider-Mapping oder Teilpruefung vorhanden, echter Vorabcheck fehlt noch
- `ready-to-book`: Rate Check und Prebook liegen vor, Reservation Create fehlt noch
- `booked`: externe Reservierung mit externer Referenz erfolgreich erzeugt
- `failed`: ein echter technischer Hotelschritt ist fehlgeschlagen

## 1. Hotelsuche

### Request

`POST /api/hotels/search`

```json
{
  "stay": {
    "destination": "Berlin",
    "checkIn": "2026-05-10",
    "checkOut": "2026-05-13",
    "rooms": 1,
    "adults": 2
  },
  "filters": {
    "minStars": 3,
    "maxNightlyRate": 220,
    "boardType": "breakfast"
  },
  "sourceContext": {
    "channel": "travellogik-web",
    "locale": "de-DE",
    "currency": "EUR"
  }
}
```

### Response

```json
{
  "searchId": "hs_01J...",
  "status": "live-search",
  "hotels": [
    {
      "hotelId": "htl_123",
      "provider": "Hotelbeds",
      "providerHotelId": "HB-9988",
      "name": "Example Hotel",
      "stars": 4,
      "address": "Example Street 1, Berlin",
      "location": {
        "lat": 52.52,
        "lng": 13.40
      },
      "availability": {
        "searchedAt": "2026-04-21T08:10:00Z",
        "refundable": true
      },
      "rooms": [
        {
          "roomId": "room_1",
          "providerRoomId": "RM-DELUXE",
          "roomName": "Deluxe Room",
          "rates": [
            {
              "rateId": "rate_1",
              "providerRateId": "RT-ABC",
              "boardType": "breakfast",
              "nightlyAmount": 179.0,
              "totalAmount": 537.0,
              "currency": "EUR",
              "rateCheckRequired": true,
              "cancellationPolicy": {
                "summary": "Free cancellation until 48h before arrival"
              }
            }
          ]
        }
      ]
    }
  ],
  "warnings": []
}
```

## 2. Rate Check

### Request

`POST /api/hotels/rate-check`

```json
{
  "searchId": "hs_01J...",
  "hotelId": "htl_123",
  "roomId": "room_1",
  "rateId": "rate_1",
  "providerRefs": {
    "provider": "Hotelbeds",
    "providerHotelId": "HB-9988",
    "providerRoomId": "RM-DELUXE",
    "providerRateId": "RT-ABC"
  }
}
```

### Response

```json
{
  "status": "precheck-required",
  "availabilityToken": "av_01J...",
  "priceChanged": false,
  "soldOut": false,
  "checkedRate": {
    "nightlyAmount": 179.0,
    "totalAmount": 537.0,
    "taxesAndFees": 39.0,
    "currency": "EUR",
    "cancellationPolicy": {
      "summary": "Free cancellation until 48h before arrival"
    }
  },
  "errors": []
}
```

## 3. Prebook / Recheck

### Request

`POST /api/hotels/prebook`

```json
{
  "searchId": "hs_01J...",
  "hotelId": "htl_123",
  "roomId": "room_1",
  "rateId": "rate_1",
  "availabilityToken": "av_01J...",
  "guests": [
    {
      "firstName": "Max",
      "lastName": "Mustermann",
      "type": "adult"
    }
  ],
  "contact": {
    "email": "max@example.com",
    "phone": "+491701234567"
  },
  "specialRequests": "Late arrival after 21:00"
}
```

### Response

```json
{
  "status": "ready-to-book",
  "prebookToken": "pb_01J...",
  "expiresAt": "2026-04-21T08:25:00Z",
  "price": {
    "totalAmount": 537.0,
    "currency": "EUR"
  },
  "errors": []
}
```

## 4. Reservation Create

### Request

`POST /api/hotels/reservations`

```json
{
  "prebookToken": "pb_01J...",
  "hotelId": "htl_123",
  "roomId": "room_1",
  "rateId": "rate_1",
  "guests": [
    {
      "firstName": "Max",
      "lastName": "Mustermann",
      "type": "adult"
    }
  ],
  "contact": {
    "email": "max@example.com",
    "phone": "+491701234567"
  },
  "specialRequests": "Late arrival after 21:00",
  "clientReference": "HTR-20260421-ABCD"
}
```

### Response

```json
{
  "status": "booked",
  "reservationId": "res_01J...",
  "externalReservationReference": "HB-BOOK-778899",
  "supplierConfirmationNumber": "SUP-443322",
  "bookedAt": "2026-04-21T08:14:00Z",
  "hotelVoucherUrl": "https://...",
  "errors": []
}
```

## Fehlerfaelle

### Einheitliche Fehlerstruktur

```json
{
  "status": "failed",
  "errors": [
    {
      "code": "SOLD_OUT",
      "message": "Selected rate is no longer available"
    }
  ]
}
```

### Erwartete Fehlercodes

- `HOTEL_NOT_FOUND`
- `RATE_NOT_FOUND`
- `RATE_EXPIRED`
- `SOLD_OUT`
- `PRICE_CHANGED`
- `INVALID_GUEST_DATA`
- `PREBOOK_REQUIRED`
- `PROVIDER_TIMEOUT`
- `PROVIDER_AUTH_FAILED`
- `PERSISTENCE_FAILED`

## Persistenzfelder

Diese Felder muessen fuer jede Hotel-Reservierungsakte backendseitig gespeichert werden:

- `id`
- `type`
- `workflow`
- `status`
- `hotelBookingStatus`
- `searchId`
- `provider`
- `providerHotelId`
- `providerRoomId`
- `providerRateId`
- `availabilityToken`
- `prebookToken`
- `externalReservationReference`
- `supplierConfirmationNumber`
- `rateCheckAt`
- `prebookAt`
- `reservationCreatedAt`
- `failureCode`
- `failureMessage`
- `contactEmail`
- `contactPhone`
- `guestSnapshot`
- `priceSnapshot`
- `offerSnapshot`
- `statusHistory`

## Frontend-Folge

Sobald diese Endpunkte vorhanden sind, muss das Frontend nur noch:

1. `search` an die Ergebnisliste binden
2. `rate-check` vor oder beim Betreten des Checkout-Finalschritts aufrufen
3. `prebook` direkt vor dem finalen Klick ausfuehren
4. `reservation-create` nur aus `ready-to-book` heraus ausloesen
5. `booked` erst nach externer Referenz anzeigen
