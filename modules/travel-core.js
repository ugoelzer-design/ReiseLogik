(function(global){
  'use strict';

  const DATA_MODEL_VERSION = '1.2';
  const MODULE_META = {
    flight:{label:'Flug', icon:'✈️', doneKey:'flights'},
    hotel:{label:'Hotel', icon:'🏨', doneKey:'hotels'},
    car:{label:'Mietwagen', icon:'🚗', doneKey:'cars'},
    transfer:{label:'Transfer', icon:'🚌', doneKey:'transfer'}
  };
  const SEARCH_STATE = {
    flight:{results:[]},
    hotel:{results:[]},
    car:{results:[]},
    transfer:{results:[]}
  };

  const runtime = {
    getTrip:()=>({}),
    enrichers:{}
  };

  function clamp(v, min, max){ return Math.max(min, Math.min(max, v)); }

  function configureTravelCore(options = {}){
    if(typeof options.getTrip === 'function'){
      runtime.getTrip = options.getTrip;
    }
    if(options.enrichers && typeof options.enrichers === 'object'){
      Object.assign(runtime.enrichers, options.enrichers);
    }
  }

  function registerSearchEnricher(type, enricher){
    if(type && typeof enricher === 'function'){
      runtime.enrichers[type] = enricher;
    }
  }

  function getTripState(){
    return runtime.getTrip?.() || {};
  }

  function getModuleMeta(type){
    return MODULE_META[type] || {label:type, icon:'📄', doneKey:type};
  }

  function getOfferProviderName(type, item){
    if(type==='flight') return item.airline?.name || item.provider || 'Airline';
    if(type==='hotel') return item.bestProvider?.name || item.provider || 'Hotel Direkt';
    if(type==='car') return item.provider || item.bestProvider?.name || 'Autovermieter';
    if(type==='transfer') return item.provider || item.name || item.bestProvider?.name || 'Transferanbieter';
    return item.provider || item.bestProvider?.name || 'Anbieter';
  }

  function getOfferBasePrice(type, item){
    if(type==='hotel') return item.pricePerNight ?? item.price ?? item.total ?? 0;
    return item.price ?? item.total ?? 0;
  }

  function getOfferTotalPrice(type, item){
    if(type==='flight') return item.price ?? item.total ?? 0;
    if(type==='hotel') return item.total ?? item.pricePerNight ?? item.price ?? 0;
    if(type==='car') return item.total ?? item.price ?? 0;
    if(type==='transfer') return item.total ?? item.price ?? 0;
    return item.total ?? item.price ?? 0;
  }

  function normalizeProviderQuotes(type, item, fallbackProvider){
    const source = item.providerQuotes?.length ? item.providerQuotes : item.providerOffers;
    const defaultTotal = getOfferTotalPrice(type, item);
    const defaultCurrency = item.pricing?.currency || 'EUR';
    const quotes = (source || []).map((offer, idx)=>({
      quoteId: offer.quoteId || `${fallbackProvider || 'provider'}-${idx+1}`,
      provider: offer.provider || offer.name || fallbackProvider || 'Unbekannt',
      total: offer.total ?? offer.price ?? defaultTotal,
      base: offer.base ?? offer.price ?? defaultTotal,
      currency: offer.currency || defaultCurrency,
      deeplink: offer.deeplink || offer.url || null,
      isBest: !!offer.isBest
    }));
    if(!quotes.length){
      return [{
        quoteId: `${fallbackProvider || 'provider'}-1`,
        provider: fallbackProvider || 'Unbekannt',
        total: defaultTotal,
        base: getOfferBasePrice(type, item),
        currency: defaultCurrency,
        deeplink: item.url || item.deepLink || null,
        isBest: true
      }];
    }
    const bestIdx = quotes.reduce((best, quote, idx)=>quote.total < quotes[best].total ? idx : best, 0);
    return quotes.map((quote, idx)=>({...quote, isBest: idx===bestIdx}));
  }

  function buildOfferTitle(type, item){
    if(type==='flight') return `${item.from} → ${item.to}`;
    if(type==='transfer'){
      const prefix = item.transferMode === 'departure' ? '🏠→✈️ Zubringer: ' : '✈️→🏨 Transfer: ';
      return prefix + (item.from || 'Abholung') + ' → ' + (item.to || 'Ziel');
    }
    return item.name;
  }

  function buildOfferSummary(type, item, providerName){
    const trip = getTripState();
    if(type==='flight') return `${providerName} · ${item.depTime}–${item.arrTime}`;
    if(type==='hotel') return `${item.stars || 3}★ · ${item.nights} Nächte · ${item.dest}`;
    if(type==='car') return `${item.class} · ${providerName} · ${item.days} Tage`;
    if(type==='transfer') return `${providerName} · ${item.pax || trip.pax || 1} Person${(item.pax || trip.pax || 1)>1?'en':''}`;
    return providerName;
  }

  function buildOfferTripContext(type, item){
    const trip = getTripState();
    const destination = item.dest || item.to || item.pickup || trip.destination || trip.to || '';
    const startDate = item.dep || item.startDate || trip.depDate || '';
    const endDate = item.endDate || trip.retDate || '';
    return {
      destination,
      from: item.from || item.pickup || '',
      to: item.to || item.dest || destination,
      startDate,
      endDate,
      pax: item.pax || trip.pax || 1
    };
  }

  function getPreferredProviderQuote(item){
    const quotes = item.providerQuotes || [];
    if(!quotes.length){
      return {
        provider: item.providerName || item.provider || 'Anbieter',
        total: item.pricing?.total ?? item.total ?? item.price ?? 0,
        currency: item.pricing?.currency || 'EUR',
        deeplink: item.url || item.deepLink || null,
        isBest: true
      };
    }
    return quotes.find(q=>q.isBest) || quotes.reduce((best, quote)=>quote.total < best.total ? quote : best, quotes[0]);
  }

  function buildCommonOffer(type, item){
    if(item?.entityType === 'offer') return item;
    const providerName = getOfferProviderName(type, item);
    const providerQuotes = normalizeProviderQuotes(type, item, providerName);
    const generatedId = item.id || `${type}-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
    return {
      ...item,
      id: generatedId,
      schemaVersion: DATA_MODEL_VERSION,
      entityType: 'offer',
      offerId: generatedId,
      offerType: type,
      title: buildOfferTitle(type, item),
      summary: buildOfferSummary(type, item, providerName),
      providerName,
      pricing: {
        base: getOfferBasePrice(type, item),
        total: getOfferTotalPrice(type, item),
        currency: item.pricing?.currency || 'EUR'
      },
      tripContext: buildOfferTripContext(type, item),
      providerQuotes
    };
  }

  function normalizeSearchResults(type, items){
    return (items || []).map(item=>buildCommonOffer(type, item));
  }

  function normalizeProviderPayload(type, payload){
    if(Array.isArray(payload)) return payload;
    if(payload?.items) return payload.items;
    if(payload?.results) return payload.results;
    return [];
  }

  function enrichSearchResults(type, items){
    const normalized = normalizeSearchResults(type, items);
    const enricher = runtime.enrichers[type];
    return typeof enricher === 'function' ? enricher(normalized) : normalized;
  }

  function ensureOffer(type, item){
    return item?.entityType === 'offer' ? item : buildCommonOffer(type, item);
  }

  function setSearchResults(type, items){
    const enriched = enrichSearchResults(type, normalizeProviderPayload(type, items));
    SEARCH_STATE[type] = {
      ...(SEARCH_STATE[type] || {}),
      results: enriched,
      updatedAt: new Date().toISOString()
    };
    return enriched;
  }

  function getSearchResults(type){
    return SEARCH_STATE[type]?.results || [];
  }

  function createProviderAdapter(type, config){
    return {
      type,
      source: config.source || 'local',
      async search(params){
        return await config.search(params);
      }
    };
  }

  async function runSearchPipeline(type, adapter, params){
    const payload = await adapter.search(params);
    return setSearchResults(type, payload);
  }

  function buildTripItemFromOffer(offer){
    const bestProvider = getPreferredProviderQuote(offer);
    return {
      schemaVersion: DATA_MODEL_VERSION,
      entityType: 'trip_item',
      itemId: offer.offerId,
      offerType: offer.offerType,
      title: offer.title,
      summary: offer.summary,
      providerName: offer.providerName,
      pricing: offer.pricing,
      tripContext: offer.tripContext,
      providerQuote: {
        provider: bestProvider.provider,
        total: bestProvider.total,
        currency: bestProvider.currency
      }
    };
  }

  function buildBookingRecord(ref, bookingContext, email){
    const {type, offer, total} = bookingContext;
    const trip = getTripState();
    const tripItem = buildTripItemFromOffer(offer);
    const providerQuote = getPreferredProviderQuote(offer);
    const record = {
      schemaVersion: DATA_MODEL_VERSION,
      entityType: 'booking',
      id: ref,
      type,
      name: tripItem.title,
      detail: tripItem.summary,
      total,
      currency: 'EUR',
      status: 'pending',
      date: new Date().toLocaleDateString('de-DE'),
      createdAt: new Date().toISOString(),
      contactEmail: email,
      offerId: offer.offerId || offer.id || null,
      offerSnapshot: offer,
      providerName: providerQuote.provider || offer.providerName || 'Anbieter',
      providerDeeplink: providerQuote.deeplink || offer.url || offer.deepLink || '',
      tripItem,
      tripId: trip.id || null,
      workflow: 'pilot-request'
    };
    if(type === 'hotel'){
      record.hotelReservation = {
        status: offer.hotelBookingStatus || offer.bookingReadiness?.status || 'proposed',
        provider: offer.provider || offer.searchProvider || offer.providerName || '',
        externalUrl: offer.bookingUrl || offer.handoffUrl || providerQuote.deeplink || offer.url || offer.deepLink || '',
        externalReservationReference: offer.externalReservationReference || '',
        finalPrice: offer.finalPrice || '',
        priceSnapshot: {
          estimatedTotal: total,
          currency: 'EUR'
        }
      };
    }
    return record;
  }

  global.TravelLogikCore = {
    clamp,
    DATA_MODEL_VERSION,
    MODULE_META,
    SEARCH_STATE,
    configureTravelCore,
    registerSearchEnricher,
    getModuleMeta,
    getOfferProviderName,
    getOfferBasePrice,
    getOfferTotalPrice,
    normalizeProviderQuotes,
    getPreferredProviderQuote,
    buildCommonOffer,
    normalizeSearchResults,
    normalizeProviderPayload,
    ensureOffer,
    setSearchResults,
    getSearchResults,
    createProviderAdapter,
    runSearchPipeline,
    buildTripItemFromOffer,
    buildBookingRecord
  };
})(window);
