(function(global){
  'use strict';

  const core = global.TravelLogikCore;
  const comparison = global.TravelLogikComparison;

  if(!core){
    throw new Error('TravelLogikCore must be loaded before TravelLogikEnrichment.');
  }
  if(!comparison){
    throw new Error('TravelLogikComparison must be loaded before TravelLogikEnrichment.');
  }

  const runtime = {
    getTravelerProfile:()=>({
      style:'smart',
      budget:'mid',
      purpose:'leisure',
      priority:'value'
    }),
    getTrip:()=>({})
  };

  function configureTravelEnrichment(options = {}){
    if(typeof options.getTravelerProfile === 'function'){
      runtime.getTravelerProfile = options.getTravelerProfile;
    }
    if(typeof options.getTrip === 'function'){
      runtime.getTrip = options.getTrip;
    }
  }

  function readTravelerProfile(){
    return runtime.getTravelerProfile();
  }

  function readTrip(){
    return runtime.getTrip?.() || {};
  }

  function getPriorityBonus(key, profile = readTravelerProfile()){
    const priority = profile.priority;
    return priority===key ? 12 : priority==='value' && key==='comfort' ? 4 : 0;
  }

  function getAveragePrice(items, selector){
    return items.reduce((sum, item)=>sum + (selector(item) || 0), 0) / Math.max(items.length, 1);
  }

  function getMatchLabel(valueScore, labels){
    if(valueScore >= labels.top.min) return labels.top.label;
    if(valueScore >= labels.mid.min) return labels.mid.label;
    return labels.base;
  }

  function getRankingBadge(valueScore, idx, config){
    if(idx===0) return config.first;
    return valueScore >= config.threshold ? config.good : config.base;
  }

  function decorateFlightResults(items){
    const profile = readTravelerProfile();
    const avgPrice = getAveragePrice(items, item=>item.price);
    const flightConfig = comparison.getComparisonConfig('flight');
    return items.map((item, idx)=>{
      const priceScore = core.clamp(100 - ((item.price / avgPrice) - 1) * 55, 25, 100);
      const comfortScore = core.clamp(
        58 +
        (item.stops===0 ? 18 : 0) +
        (item.durationMin < 180 ? 10 : 0) +
        (item.baggageIncluded ? 7 : 0) +
        (item.flexibleFare ? 7 : 0),
        35,
        100
      );
      const profileFit = core.clamp(
        50 +
        (profile.budget==='tight' ? (item.price <= avgPrice ? 16 : -6) : 0) +
        (profile.style==='comfort' ? (item.stops===0 ? 12 : -5) : 0) +
        (profile.purpose==='business' ? (item.depHour>=8 && item.depHour<=18 ? 8 : -4) : 0),
        25,
        100
      );
      const weighted =
        (priceScore * (profile.priority==='price' ? 0.45 : 0.3)) +
        (comfortScore * (profile.priority==='comfort' ? 0.4 : 0.28)) +
        (profileFit * 0.25) +
        getPriorityBonus('value', profile);
      const valueScore = Math.round(core.clamp(weighted, 1, 99));

      return {
        ...comparison.attachProviderComparison(item, flightConfig.providerNames(item), flightConfig.basePrice(item)),
        valueScore,
        matchLabel: getMatchLabel(valueScore, {
          top:{min:82, label:'Starker Match'},
          mid:{min:70, label:'Guter Fit'},
          base:'Alternative'
        }),
        highlights: [
          item.stops===0 ? 'Direktflug' : `${item.stops} Zwischenstopp`,
          item.baggageIncluded ? 'Gepäck inkl.' : 'Light Fare',
          item.flexibleFare ? 'Flexibel' : 'Nicht erstattbar'
        ],
        rankingBadge: getRankingBadge(valueScore, idx, {
          first:'Top Deal',
          threshold:80,
          good:'Sehr stark',
          base:'Solide Wahl'
        })
      };
    });
  }

  function decorateHotelResults(items){
    const profile = readTravelerProfile();
    const avgPrice = getAveragePrice(items, item=>item.pricePerNight);
    const hotelConfig = comparison.getComparisonConfig('hotel');
    return items.map((item, idx)=>{
      const rating = parseFloat(item.rating || 0) || 0;
      const priceScore = core.clamp(100 - ((item.pricePerNight / avgPrice) - 1) * 60, 20, 100);
      const comfortScore = core.clamp(
        45 +
        (item.stars || 3) * 9 +
        rating * 4 +
        (item.breakfastIncluded ? 8 : 0) +
        (item.freeCancellation ? 8 : 0),
        30,
        100
      );
      const profileFit = core.clamp(
        48 +
        (profile.style==='comfort' ? (item.stars>=4 ? 15 : -4) : 0) +
        (profile.budget==='tight' ? (item.pricePerNight <= avgPrice ? 14 : -7) : 0) +
        (profile.purpose==='family' ? (item.familyFriendly ? 14 : -2) : 0),
        20,
        100
      );
      const valueScore = Math.round(core.clamp(
        priceScore * 0.34 + comfortScore * 0.36 + profileFit * 0.3 + getPriorityBonus('comfort', profile),
        1,
        99
      ));

      return {
        ...comparison.attachProviderComparison(item, hotelConfig.providerNames(item), hotelConfig.basePrice(item)),
        valueScore,
        matchLabel: getMatchLabel(valueScore, {
          top:{min:84, label:'Sehr passend'},
          mid:{min:72, label:'Guter Match'},
          base:'Preis prüfen'
        }),
        highlights: [
          `${item.stars || 3} Sterne`,
          item.breakfastIncluded ? 'Frühstück inkl.' : 'Ohne Frühstück',
          item.freeCancellation ? 'Kostenlos stornierbar' : 'Eingeschränkt'
        ],
        rankingBadge: getRankingBadge(valueScore, idx, {
          first:'Bester Gegenwert',
          threshold:82,
          good:'Empfohlen',
          base:'Alternative'
        })
      };
    });
  }

  function decorateCarResults(items){
    const profile = readTravelerProfile();
    const avgPrice = getAveragePrice(items, item=>item.price);
    const carConfig = comparison.getComparisonConfig('car');
    return items.map((item, idx)=>{
      const priceScore = core.clamp(100 - ((item.price / avgPrice) - 1) * 62, 20, 100);
      const comfortScore = core.clamp(
        44 +
        item.seats * 6 +
        item.bags * 5 +
        (item.transmission==='Automatik' ? 10 : 0) +
        (item.freeCancellation ? 8 : 0),
        30,
        100
      );
      const profileFit = core.clamp(
        48 +
        (profile.purpose==='family' ? (item.seats>=5 ? 15 : -8) : 0) +
        (profile.style==='comfort' ? (item.class==='SUV' || item.class==='Luxus' ? 14 : 0) : 0) +
        (profile.budget==='tight' ? (item.price <= avgPrice ? 14 : -6) : 0),
        25,
        100
      );
      const valueScore = Math.round(core.clamp(
        priceScore * 0.37 + comfortScore * 0.33 + profileFit * 0.3 + getPriorityBonus('flexibility', profile),
        1,
        99
      ));

      return {
        ...comparison.attachProviderComparison(item, carConfig.providerNames(item), carConfig.basePrice(item)),
        valueScore,
        matchLabel: getMatchLabel(valueScore, {
          top:{min:82, label:'Smarte Wahl'},
          mid:{min:70, label:'Guter Fit'},
          base:'Optional'
        }),
        highlights: [
          `${item.seats} Sitze`,
          `${item.bags} Koffer`,
          item.freeCancellation ? 'Kostenlos stornierbar' : 'Fix'
        ],
        rankingBadge: getRankingBadge(valueScore, idx, {
          first:'Preis-Leistungs-Sieger',
          threshold:80,
          good:'Empfohlen',
          base:'Alternative'
        })
      };
    });
  }

  function decorateTransferResults(items){
    const profile = readTravelerProfile();
    const trip = readTrip();
    const avgPrice = getAveragePrice(items, item=>item.total || item.pricing?.total || 0);
    return items.map((item, idx)=>{
      const total = item.total || item.pricing?.total || 0;
      const comfortScore = core.clamp(
        52 +
        ((item.category==='private' || item.category==='taxi') ? 18 : 0) +
        ((item.category==='bus' || item.category==='shuttle') ? -4 : 0),
        25,
        100
      );
      const priceScore = core.clamp(100 - ((total / Math.max(avgPrice, 1)) - 1) * 58, 20, 100);
      const profileFit = core.clamp(
        48 +
        (profile.style==='comfort' ? comfortScore * 0.18 : 0) +
        (profile.budget==='tight' ? (total<=avgPrice ? 16 : -8) : 0),
        20,
        100
      );
      const valueScore = Math.round(core.clamp(priceScore * 0.4 + comfortScore * 0.3 + profileFit * 0.3, 1, 99));
      const bestProvider = core.getPreferredProviderQuote(item);

      return {
        ...item,
        total,
        valueScore,
        bestProvider,
        savings: core.clamp(total - bestProvider.total, 0, 999),
        matchLabel: getMatchLabel(valueScore, {
          top:{min:82, label:'Starker Fit'},
          mid:{min:70, label:'Guter Fit'},
          base:'Alternative'
        }),
        highlights: [item.bestFor || 'Transfer', `${item.pax || trip.pax || 1} Pax`, item.priceBand || 'Preisvergleich'],
        rankingBadge: getRankingBadge(valueScore, idx, {
          first:'Transfer-Favorit',
          threshold:80,
          good:'Empfohlen',
          base:'Alternative'
        })
      };
    });
  }

  global.TravelLogikEnrichment = {
    configureTravelEnrichment,
    decorateFlightResults,
    decorateHotelResults,
    decorateCarResults,
    decorateTransferResults
  };
})(window);
