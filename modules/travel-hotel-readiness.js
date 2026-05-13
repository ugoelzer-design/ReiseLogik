(function(global){
  'use strict';

  const hotelMvp = global.TravelLogikHotelMvp || {};
  const buildHotelBookingState = typeof hotelMvp.buildHotelBookingState === 'function'
    ? hotelMvp.buildHotelBookingState
    : ()=>({status:'demo', statusLabel:'Demo', technicalStage:'Nur lokale Vorbereitung', missingStep:'Live-Hotelsuche fehlt', missingDetail:'Es gibt noch keine echte Hotelquelle mit providerfaehigen Hoteldaten.'});

  function deriveHotelBookingReadiness(hotel){
    const offer = hotel || {};
    const sourceMode = offer.sourceMode || offer.searchSourceMode || (offer.searchProvider === 'Google Places' ? 'live-search' : 'demo');
    const searchProvider = offer.searchProvider || (sourceMode === 'live-search' ? 'Google Places' : 'Lokale Vorlage');
    const state = buildHotelBookingState(offer);
    const liveRate = !!(offer.liveRate || offer.providerRateToken || offer.providerRateId || state.hasRateCheck);
    const liveAvailability = !!(offer.liveAvailability || offer.availabilityToken || offer.providerAvailabilityToken || state.hasRateCheck);
    const liveRoomMapping = !!(offer.liveRoomMapping || offer.providerRoomId || offer.providerRateId || state.hasProviderMapping);
    const liveCancellation = !!(offer.liveCancellation || offer.providerCancellationPolicy);
    const canPrebook = !!offer.providerPrebookSupported || state.hasPrebook;
    const canReserve = false;

    let level = state.status;
    let badgeLabel = state.statusLabel;
    let summary = state.technicalStage;
    let missing = state.missingStep
      ? `${state.missingStep}: ${state.missingDetail}`
      : 'Externe Reservierung mit Referenz liegt vor.';

    if(level === 'ready-to-book') badgeLabel = 'Bereit für Buchung';
    if(level === 'booked') badgeLabel = 'Gebucht';
    if(level === 'failed') badgeLabel = 'Fehlgeschlagen';

    return {
      level,
      badgeLabel,
      searchProvider,
      sourceMode,
      liveRate,
      liveAvailability,
      liveRoomMapping,
      liveCancellation,
      canPrebook,
      canReserve,
      searchReal: sourceMode !== 'demo',
      summary,
      missing,
      actionLabel: 'Für Tracking erfassen',
      statusLabel: state.statusLabel,
      technicalStage: state.technicalStage,
      missingStep: state.missingStep,
      missingDetail: state.missingDetail,
      status: state.status
    };
  }

  function annotateHotelResults(items, defaults = {}){
    return (items || []).map(item=>{
      const merged = {...defaults, ...item};
      return {
        ...merged,
        bookingReadiness: deriveHotelBookingReadiness(merged)
      };
    });
  }

  function buildHotelReadinessCopy(hotel){
    const readiness = hotel?.bookingReadiness || deriveHotelBookingReadiness(hotel);
    if(readiness.level === 'booked'){
      return {
        badgeTone: 'bookable',
        headline: `Extern bestätigt via ${readiness.searchProvider}`,
        body: 'Die finale Hotelbuchung liegt beim Anbieter. TravelLogik zeigt nur den externen Abschluss für Reise- und Kosten-Tracking.'
      };
    }
    if(readiness.level === 'ready-to-book' || readiness.level === 'precheck-required'){
      return {
        badgeTone: 'precheck',
        headline: `Extern buchen via ${readiness.searchProvider}`,
        body: 'TravelLogik bereitet nur Tracking-Daten vor. Die Buchung selbst findet weiterhin außerhalb der App beim Anbieter statt.'
      };
    }
    if(readiness.level === 'live-search'){
      return {
        badgeTone: 'live-search',
        headline: `Externer Buchungsfall via ${readiness.searchProvider}`,
        body: 'Hoteldaten sind gefunden, aber der Abschluss passiert immer extern beim Anbieter. TravelLogik trackt nur Auswahl und Kosten.'
      };
    }
    return {
      badgeTone: 'demo',
      headline: 'Externer Buchungsfall',
      body: 'Dieses Hotel ist nur für externe Buchung und lokales Tracking vorbereitet. TravelLogik erzeugt keine interne Reservierung.'
    };
  }

  function isHotelActuallyBookable(hotel){
    return (hotel?.bookingReadiness || deriveHotelBookingReadiness(hotel)).status === 'booked';
  }

  global.TravelLogikHotelReadiness = {
    deriveHotelBookingReadiness,
    annotateHotelResults,
    buildHotelReadinessCopy,
    isHotelActuallyBookable
  };
})(window);
