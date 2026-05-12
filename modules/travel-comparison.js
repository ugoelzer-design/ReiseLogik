(function(global){
  'use strict';

  const core = global.TravelLogikCore;

  if(!core){
    throw new Error('TravelLogikCore must be loaded before TravelLogikComparison.');
  }

  function buildProviderOffers(base, names){
    return names.map((name, idx)=>{
      let offset = 0;
      if(name === 'Super.com'){
        // Super.com is usually the discount leader
        offset = -Math.max(8, Math.round(base * 0.07)); 
      } else if(idx === 0){
        offset = 0; // Primary provider
      } else {
        offset = Math.max(5, Math.round(base * 0.05)); // Others are slightly more expensive
      }
      return {
        name, 
        price: Math.max(1, base + offset),
        url: name === 'Super.com' ? 'https://www.super.com/travel' : null
      };
    });
  }

  const COMPARISON_CONFIG = {
    flight:{
      providerNames:item=>[item.airline.name, 'Super.com', 'Skyscanner'],
      basePrice:item=>item.price,
      recommendation:{
        title:'Empfohlener Flug',
        text:'Die Empfehlung kombiniert Ticketpreis, Komfort, Umstiege und Ihre Reisepräferenzen zu einer schnellen Entscheidungshilfe.'
      },
      insights:{
        seasonality:true,
        priceKey:'price',
        avgText:'Marktmittel pro Person',
        bestLabel:item=>`${item.airline.name} · ${item.flightNum}`,
        cheapestLabel:item=>`${item.airline.name} · ${item.depTime}`
      }
    },
    hotel:{
      providerNames:()=>['Direkt', 'Super.com', 'Booking.com'],
      basePrice:item=>item.pricePerNight,
      recommendation:{
        title:'Empfohlenes Hotel',
        text:'Diese Empfehlung balanciert Nachtpreis, Bewertung, Ausstattung und Ihren Reisekontext.'
      },
      insights:{
        seasonality:true,
        priceKey:'pricePerNight',
        avgText:'Durchschnittspreis pro Nacht',
        bestLabel:item=>`${item.name} · ${item.rating} Bewertung`,
        cheapestLabel:item=>`${item.name} · ${item.stars}★`
      }
    },
    car:{
      providerNames:item=>[item.provider, 'Rentalcars', 'Check24'],
      basePrice:item=>item.total,
      recommendation:{
        title:'Empfohlener Mietwagen',
        text:'Die Empfehlung bewertet Gesamtkosten, Ausstattung, Fahrzeuggröße und Ihre Flexibilitätspräferenzen.'
      },
      insights:{
        priceKey:'total',
        avgText:'Durchschnittlicher Gesamtpreis',
        bestLabel:item=>`${item.name} · ${item.provider}`,
        cheapestLabel:item=>`${item.name} · €${item.price}/Tag`
      }
    }
  };

  function getComparisonConfig(type){
    return COMPARISON_CONFIG[type] || null;
  }

  function getComparisonBaseValue(item, priceKey){
    if(priceKey && item[priceKey] != null) return item[priceKey];
    return item.pricing?.total ?? item.total ?? item.price ?? 0;
  }

  function pickBestProviderOffer(providerOffers){
    return providerOffers.reduce((best, offer)=>offer.price < best.price ? offer : best, providerOffers[0]);
  }

  function getBestProviderLabel(item){
    const bestProvider = item.bestProvider || core.getPreferredProviderQuote(item);
    return bestProvider.provider || bestProvider.name || item.providerName || 'Anbieter';
  }

  function attachProviderComparison(item, providerNames, baseValue){
    const providerOffers = buildProviderOffers(baseValue, providerNames);
    const bestProviderOffer = pickBestProviderOffer(providerOffers);
    return {
      ...item,
      providerOffers,
      bestProvider: {
        name: bestProviderOffer.name,
        provider: bestProviderOffer.name,
        price: bestProviderOffer.price,
        total: bestProviderOffer.price
      },
      savings: core.clamp(baseValue - bestProviderOffer.price, 0, 999)
    };
  }

  global.TravelLogikComparison = {
    buildProviderOffers,
    COMPARISON_CONFIG,
    getComparisonConfig,
    getComparisonBaseValue,
    pickBestProviderOffer,
    getBestProviderLabel,
    attachProviderComparison
  };
})(window);
