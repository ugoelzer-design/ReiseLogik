(function(global){
  'use strict';

  const HOTEL_BOOKING_STATUS = Object.freeze({
    DEMO:'demo',
    LIVE_SEARCH:'live-search',
    PRECHECK_REQUIRED:'precheck-required',
    READY_TO_BOOK:'ready-to-book',
    BOOKED:'booked',
    FAILED:'failed'
  });

  const HOTEL_BACKEND_CONTRACT = Object.freeze({
    search:{
      method:'POST',
      path:'/api/hotels/search',
      requestShape:{
        stay:{destination:'string', checkIn:'YYYY-MM-DD', checkOut:'YYYY-MM-DD', rooms:'number', adults:'number'},
        filters:{minStars:'number?', maxNightlyRate:'number?', boardType:'string?'},
        sourceContext:{channel:'string', locale:'string', currency:'string'}
      },
      responseShape:{
        searchId:'string',
        status:'demo|live-search|precheck-required|ready-to-book|failed',
        hotels:[{
          hotelId:'string',
          provider:'string',
          providerHotelId:'string',
          name:'string',
          stars:'number?',
          address:'string?',
          location:{lat:'number?', lng:'number?'},
          availability:{searchedAt:'ISO-8601', refundable:'boolean?'},
          rooms:[{
            roomId:'string',
            providerRoomId:'string',
            roomName:'string',
            rates:[{
              rateId:'string',
              providerRateId:'string',
              boardType:'string?',
              nightlyAmount:'number',
              totalAmount:'number',
              currency:'string',
              rateCheckRequired:'boolean',
              cancellationPolicy:'object?'
            }]
          }]
        }],
        warnings:['string']
      }
    },
    rateCheck:{
      method:'POST',
      path:'/api/hotels/rate-check',
      requestShape:{
        searchId:'string',
        hotelId:'string',
        roomId:'string',
        rateId:'string',
        providerRefs:{provider:'string', providerHotelId:'string', providerRoomId:'string', providerRateId:'string'}
      },
      responseShape:{
        status:'precheck-required|ready-to-book|failed',
        availabilityToken:'string',
        priceChanged:'boolean',
        soldOut:'boolean',
        checkedRate:{
          totalAmount:'number',
          nightlyAmount:'number',
          taxesAndFees:'number?',
          currency:'string',
          cancellationPolicy:'object?'
        },
        errors:[{code:'string', message:'string'}]
      }
    },
    prebook:{
      method:'POST',
      path:'/api/hotels/prebook',
      requestShape:{
        searchId:'string',
        hotelId:'string',
        roomId:'string',
        rateId:'string',
        availabilityToken:'string',
        guests:[{firstName:'string', lastName:'string', type:'adult|child'}],
        contact:{email:'string', phone:'string?'},
        specialRequests:'string?'
      },
      responseShape:{
        status:'precheck-required|ready-to-book|failed',
        prebookToken:'string',
        expiresAt:'ISO-8601',
        price:{
          totalAmount:'number',
          currency:'string'
        },
        errors:[{code:'string', message:'string'}]
      }
    },
    reservationCreate:{
      method:'POST',
      path:'/api/hotels/reservations',
      requestShape:{
        prebookToken:'string',
        hotelId:'string',
        roomId:'string',
        rateId:'string',
        guests:[{firstName:'string', lastName:'string', type:'adult|child'}],
        contact:{email:'string', phone:'string?'},
        specialRequests:'string?',
        clientReference:'string'
      },
      responseShape:{
        status:'booked|failed',
        reservationId:'string',
        externalReservationReference:'string',
        supplierConfirmationNumber:'string?',
        bookedAt:'ISO-8601',
        hotelVoucherUrl:'string?',
        errors:[{code:'string', message:'string'}]
      }
    },
    errorCodes:[
      'HOTEL_NOT_FOUND',
      'RATE_NOT_FOUND',
      'RATE_EXPIRED',
      'SOLD_OUT',
      'PRICE_CHANGED',
      'INVALID_GUEST_DATA',
      'PREBOOK_REQUIRED',
      'PROVIDER_TIMEOUT',
      'PROVIDER_AUTH_FAILED',
      'PERSISTENCE_FAILED'
    ],
    persistenceFields:[
      'id',
      'type',
      'workflow',
      'status',
      'hotelBookingStatus',
      'searchId',
      'provider',
      'providerHotelId',
      'providerRoomId',
      'providerRateId',
      'availabilityToken',
      'prebookToken',
      'externalReservationReference',
      'supplierConfirmationNumber',
      'rateCheckAt',
      'prebookAt',
      'reservationCreatedAt',
      'failureCode',
      'failureMessage',
      'contactEmail',
      'contactPhone',
      'guestSnapshot',
      'priceSnapshot',
      'offerSnapshot',
      'statusHistory'
    ]
  });

  function createHotelConnector(config = {}){
    const unavailable = (step)=>async ()=>{
      throw new Error(`Hotel-Connector fehlt: ${step} ist im Frontend vorbereitet, aber noch nicht an ein Backend angeschlossen.`);
    };
    return {
      search: typeof config.search === 'function' ? config.search : unavailable('search'),
      rateCheck: typeof config.rateCheck === 'function' ? config.rateCheck : unavailable('rate-check'),
      prebook: typeof config.prebook === 'function' ? config.prebook : unavailable('prebook'),
      reservationCreate: typeof config.reservationCreate === 'function' ? config.reservationCreate : unavailable('reservation-create')
    };
  }

  function getHotelStepState(step){
    if(step && typeof step === 'object') return step;
    return {completed:false, live:false, missing:true};
  }

  function buildHotelBookingState(hotel){
    const offer = hotel || {};
    const searchStep = getHotelStepState(offer.hotelMvp?.search);
    const rateCheckStep = getHotelStepState(offer.hotelMvp?.rateCheck);
    const prebookStep = getHotelStepState(offer.hotelMvp?.prebook);
    const reservationStep = getHotelStepState(offer.hotelMvp?.reservationCreate);

    const sourceMode = offer.sourceMode || (searchStep.live ? HOTEL_BOOKING_STATUS.LIVE_SEARCH : HOTEL_BOOKING_STATUS.DEMO);
    const provider = offer.provider || offer.searchProvider || searchStep.provider || '';
    const providerHotelId = offer.providerHotelId || offer.hotelId || searchStep.providerReference || '';
    const providerRoomId = offer.providerRoomId || offer.selectedRoomProviderId || '';
    const providerRateId = offer.providerRateId || offer.selectedRateProviderId || '';
    const availabilityToken = offer.availabilityToken || rateCheckStep.availabilityToken || '';
    const prebookToken = offer.prebookToken || prebookStep.prebookToken || '';
    const externalReservationReference = offer.externalReservationReference || reservationStep.externalReservationReference || '';

    const hasProviderMapping = !!(providerHotelId && providerRoomId && providerRateId);
    const hasRateCheck = !!(availabilityToken || rateCheckStep.completed);
    const hasPrebook = !!(prebookToken || prebookStep.completed);
    const hasReservation = !!(externalReservationReference || reservationStep.completed);

    let status = HOTEL_BOOKING_STATUS.DEMO;
    let statusLabel = 'Demo';
    let technicalStage = 'Nur lokale Vorbereitung';
    let missingStep = 'Live-Hotelsuche fehlt';
    let missingDetail = 'Es gibt noch keine echte Hotelquelle mit providerfaehigen Hoteldaten.';

    if(sourceMode === HOTEL_BOOKING_STATUS.LIVE_SEARCH || searchStep.live || searchStep.completed){
      status = HOTEL_BOOKING_STATUS.LIVE_SEARCH;
      statusLabel = 'Live gesucht';
      technicalStage = 'Hotelsuche ist live, Rate und Zimmer sind noch nicht provider-verifiziert';
      missingStep = 'Rate Check fehlt';
      missingDetail = 'Es fehlen echte Room-/Rate-IDs und eine Availability-/Preispruefung vor dem Abschluss.';
    }

    if((hasProviderMapping || hasRateCheck || hasPrebook) && status !== HOTEL_BOOKING_STATUS.BOOKED){
      status = HOTEL_BOOKING_STATUS.PRECHECK_REQUIRED;
      statusLabel = 'Vorabpruefung noetig';
      technicalStage = 'Provider-Mapping ist teilweise vorbereitet';
      missingStep = hasRateCheck ? 'Prebook / Recheck fehlt' : 'Rate Check fehlt';
      missingDetail = hasRateCheck
        ? 'Vor dem Reservieren braucht es noch einen echten Prebook-/Recheck-Call.'
        : 'Vor dem Reservieren braucht es einen echten Rate-/Availability-Check.';
    }

    if(hasProviderMapping && hasRateCheck && hasPrebook && !hasReservation){
      status = HOTEL_BOOKING_STATUS.READY_TO_BOOK;
      statusLabel = 'Bereit für Buchung';
      technicalStage = 'Precheck liegt vor, Reservation Create fehlt noch';
      missingStep = 'Reservation Create fehlt';
      missingDetail = 'Es gibt noch keine externe Reservierung, solange kein Reservation-Create mit externer Referenz erfolgt.';
    }

    if(hasReservation){
      status = HOTEL_BOOKING_STATUS.BOOKED;
      statusLabel = 'Gebucht';
      technicalStage = 'Externe Reservierung wurde erzeugt';
      missingStep = '';
      missingDetail = '';
    }

    if(offer.failureCode || offer.hotelMvp?.failed){
      status = HOTEL_BOOKING_STATUS.FAILED;
      statusLabel = 'Fehlgeschlagen';
      technicalStage = 'Der letzte echte Hotel-Schritt ist fehlgeschlagen';
      missingStep = 'Fehler prüfen';
      missingDetail = offer.failureMessage || 'Bitte Provider- oder Persistenzfehler im Backend prüfen.';
    }

    return {
      status,
      statusLabel,
      technicalStage,
      missingStep,
      missingDetail,
      provider,
      providerHotelId,
      providerRoomId,
      providerRateId,
      availabilityToken,
      prebookToken,
      externalReservationReference,
      hasProviderMapping,
      hasRateCheck,
      hasPrebook,
      hasReservation
    };
  }

  function createHotelReservationSkeleton(offer, input = {}){
    const state = buildHotelBookingState(offer);
    return {
      status: state.status,
      technicalStage: state.technicalStage,
      missingStep: state.missingStep,
      missingDetail: state.missingDetail,
      searchId: input.searchId || offer.searchId || '',
      provider: state.provider,
      providerHotelId: state.providerHotelId,
      providerRoomId: state.providerRoomId,
      providerRateId: state.providerRateId,
      availabilityToken: state.availabilityToken,
      prebookToken: state.prebookToken,
      externalReservationReference: state.externalReservationReference,
      supplierConfirmationNumber: input.supplierConfirmationNumber || offer.supplierConfirmationNumber || '',
      rateCheckAt: input.rateCheckAt || offer.rateCheckAt || '',
      prebookAt: input.prebookAt || offer.prebookAt || '',
      reservationCreatedAt: input.reservationCreatedAt || offer.reservationCreatedAt || '',
      failureCode: input.failureCode || offer.failureCode || '',
      failureMessage: input.failureMessage || offer.failureMessage || '',
      guestSnapshot: Array.isArray(input.guests) ? input.guests : [],
      priceSnapshot: input.priceSnapshot || {
        nightlyAmount: offer.pricePerNight || 0,
        totalAmount: offer.total || 0,
        currency: offer.pricing?.currency || 'EUR'
      }
    };
  }

  global.TravelLogikHotelMvp = {
    HOTEL_BOOKING_STATUS,
    HOTEL_BACKEND_CONTRACT,
    createHotelConnector,
    buildHotelBookingState,
    createHotelReservationSkeleton
  };
})(window);
