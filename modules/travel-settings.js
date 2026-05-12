(function(global){
  'use strict';

  const STORAGE_KEYS = {
    google: 'tl_google',
    uber: 'tl_uber',
    pilot: 'tl_pilot'
  };

  const runtime = {
    getAccommodationType: ()=>({type:'lodging', query:'hotels'})
  };

  function getStorage(){
    return global.TravelLogikProduct?.storage || global.localStorage;
  }

  function readStoredJson(key, fallback){
    try {
      const raw = getStorage().getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error){
      return fallback;
    }
  }

  let googleConfig = readStoredJson(STORAGE_KEYS.google, {apiKey:''});
  let uberConfig = readStoredJson(STORAGE_KEYS.uber, {clientId:'', backendUrl:'', redirectUri:'', enabled:false});
  let pilotConfig = readStoredJson(STORAGE_KEYS.pilot, {
    contactEmail: '',
    contactLabel: 'TravelLogik Pilotdesk',
    responseTimeHours: 24,
    contactChannel: 'E-Mail',
    operatorName: ''
  });
  let gmapsLoaded = false;

  function configureTravelSettings(options = {}){
    if(typeof options.getAccommodationType === 'function'){
      runtime.getAccommodationType = options.getAccommodationType;
    }
  }

  function getGoogleConfig(){
    return googleConfig;
  }

  function getUberConfig(){
    return uberConfig;
  }

  function getPilotConfig(){
    return pilotConfig;
  }

  function initAmadeus(){
    const btn = document.getElementById('api-status-btn');
    if(!btn) return;
    const googleReady = !!googleConfig.apiKey;
    const uberReady = !!(uberConfig.enabled && uberConfig.backendUrl && uberConfig.clientId);
    if(googleReady && uberReady){
      btn.textContent = '✅ Live';
      btn.style.background = 'rgba(39,174,96,.25)';
    } else if(googleReady || uberReady){
      btn.textContent = '🟡 Teilweise live';
      btn.style.background = 'rgba(243,156,18,.22)';
    } else {
      btn.textContent = '⚙️ Demo';
      btn.style.background = 'rgba(255,255,255,.15)';
    }
  }

  async function searchHotelsGoogle(dest, checkin, checkout, adults, minStars, maxPrice){
    const nights = Math.max(1, Math.round((new Date(checkout) - new Date(checkin)) / 86400000));
    const accommodation = runtime.getAccommodationType() || {type:'lodging', query:'hotels'};
    const priceLevelMap = {
      PRICE_LEVEL_FREE:[30,60],
      PRICE_LEVEL_INEXPENSIVE:[50,90],
      PRICE_LEVEL_MODERATE:[90,170],
      PRICE_LEVEL_EXPENSIVE:[170,320],
      PRICE_LEVEL_VERY_EXPENSIVE:[320,650]
    };
    const starsMap = {
      PRICE_LEVEL_FREE:2,
      PRICE_LEVEL_INEXPENSIVE:3,
      PRICE_LEVEL_MODERATE:3,
      PRICE_LEVEL_EXPENSIVE:4,
      PRICE_LEVEL_VERY_EXPENSIVE:5
    };

    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': googleConfig.apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.priceLevel,places.photos,places.googleMapsUri,places.websiteUri,places.types'
      },
      body: JSON.stringify({
        textQuery: `${accommodation.query} in ${dest}`,
        includedType: accommodation.type,
        languageCode: 'de',
        maxResultCount: 20
      })
    });

    if(!response.ok){
      const error = await response.json().catch(()=>({}));
      throw new Error(error.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    if(!data.places?.length) throw new Error(`Keine Hotels gefunden für "${dest}"`);

    return data.places.map(place => {
      const priceLevel = place.priceLevel || 'PRICE_LEVEL_MODERATE';
      const [minPrice, maxPricePerNight] = priceLevelMap[priceLevel] || [90,170];
      const pricePerNight = minPrice + Math.floor(Math.random() * (maxPricePerNight - minPrice));
      const stars = starsMap[priceLevel] || 3;
      const priceLevelIndex = ['PRICE_LEVEL_FREE','PRICE_LEVEL_INEXPENSIVE','PRICE_LEVEL_MODERATE','PRICE_LEVEL_EXPENSIVE','PRICE_LEVEL_VERY_EXPENSIVE'].indexOf(priceLevel);
      const photoName = place.photos?.[0]?.name;
      const photoUrl = photoName
        ? `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=300&maxWidthPx=400&key=${googleConfig.apiKey}`
        : null;
      const googleMapsUrl = place.googleMapsUri || `https://www.google.com/maps/place/?q=place_id:${place.id}`;

      return {
        id: place.id,
        offerId: place.id,
        searchId: `google-places-${Date.now()}`,
        name: place.displayName?.text || 'Hotel',
        stars,
        emoji:'🏨',
        sourceMode:'live-search',
        provider:'Google Places',
        providerHotelId: place.id,
        photoUrl,
        googleUrl: googleMapsUrl,
        websiteUrl: place.websiteUri || null,
        tags: (place.types || []).filter(type=>!['lodging','point_of_interest','establishment'].includes(type)).slice(0, 4).map(type=>type.replace(/_/g, ' ')),
        rating: place.rating?.toFixed(1) || '–',
        dest,
        address: place.formattedAddress || dest,
        priceLevel: priceLevelIndex >= 0 ? priceLevelIndex : 2,
        pricePerNight,
        nights,
        total: pricePerNight * nights,
        breakfastIncluded: Math.random() > 0.5,
        freeCancellation: Math.random() > 0.45,
        hotelMvp:{
          search:{completed:true, live:true, missing:false, provider:'Google Places', providerReference:place.id},
          rateCheck:{completed:false, live:false, missing:true},
          prebook:{completed:false, live:false, missing:true},
          reservationCreate:{completed:false, live:false, missing:true},
          persistence:{completed:false, live:false, missing:true}
        }
      };
    }).filter(hotel=>hotel.stars >= (minStars || 0) && hotel.pricePerNight <= (maxPrice || 9999));
  }

  function openSettings(){
    const googleInput = document.getElementById('s-api-key');
    const uberEnabledInput = document.getElementById('s-uber-enabled');
    const clientIdInput = document.getElementById('s-uber-client-id');
    const backendInput = document.getElementById('s-uber-backend');
    const redirectInput = document.getElementById('s-uber-redirect');
    const pilotEmailInput = document.getElementById('s-pilot-email');
    const pilotLabelInput = document.getElementById('s-pilot-label');
    const pilotResponseInput = document.getElementById('s-pilot-response');
    const pilotChannelInput = document.getElementById('s-pilot-channel');
    const pilotOperatorInput = document.getElementById('s-pilot-operator');
    const modal = document.getElementById('settings-modal');
    if(googleInput) googleInput.value = googleConfig.apiKey || '';
    if(uberEnabledInput) uberEnabledInput.checked = !!uberConfig.enabled;
    if(clientIdInput) clientIdInput.value = uberConfig.clientId || '';
    if(backendInput) backendInput.value = uberConfig.backendUrl || '';
    if(redirectInput) redirectInput.value = uberConfig.redirectUri || '';
    if(pilotEmailInput) pilotEmailInput.value = pilotConfig.contactEmail || '';
    if(pilotLabelInput) pilotLabelInput.value = pilotConfig.contactLabel || '';
    if(pilotResponseInput) pilotResponseInput.value = pilotConfig.responseTimeHours || 24;
    if(pilotChannelInput) pilotChannelInput.value = pilotConfig.contactChannel || 'E-Mail';
    if(pilotOperatorInput) pilotOperatorInput.value = pilotConfig.operatorName || '';
    updateUberSettingsHint();
    modal?.classList.add('open');
  }

  function closeSettings(){
    document.getElementById('settings-modal')?.classList.remove('open');
  }

  function saveSettings(){
    const key = document.getElementById('s-api-key')?.value.trim() || '';
    const uberEnabled = !!document.getElementById('s-uber-enabled')?.checked;
    const clientId = document.getElementById('s-uber-client-id')?.value.trim() || '';
    const backendUrl = document.getElementById('s-uber-backend')?.value.trim() || '';
    const redirectUri = document.getElementById('s-uber-redirect')?.value.trim() || '';
    const pilotEmail = document.getElementById('s-pilot-email')?.value.trim() || '';
    const pilotLabel = document.getElementById('s-pilot-label')?.value.trim() || 'TravelLogik Pilotdesk';
    const pilotResponseTimeHours = Math.max(1, parseInt(document.getElementById('s-pilot-response')?.value, 10) || 24);
    const pilotContactChannel = document.getElementById('s-pilot-channel')?.value || 'E-Mail';
    const pilotOperatorName = document.getElementById('s-pilot-operator')?.value.trim() || '';

    googleConfig = {...googleConfig, apiKey:key};
    getStorage().setItem(STORAGE_KEYS.google, JSON.stringify(googleConfig));
    uberConfig = {clientId, backendUrl, redirectUri, enabled:uberEnabled};
    getStorage().setItem(STORAGE_KEYS.uber, JSON.stringify(uberConfig));
    pilotConfig = {
      contactEmail: pilotEmail,
      contactLabel: pilotLabel,
      responseTimeHours: pilotResponseTimeHours,
      contactChannel: pilotContactChannel,
      operatorName: pilotOperatorName
    };
    getStorage().setItem(STORAGE_KEYS.pilot, JSON.stringify(pilotConfig));
    gmapsLoaded = false;
    initAmadeus();
    global.syncProductStatusBanner?.();
    closeSettings();
  }

  async function testAmadeus(){
    const key = document.getElementById('s-api-key')?.value.trim() || '';
    const result = document.getElementById('s-test-result');
    if(!result) return;
    result.textContent = '⏳ Teste...';
    result.style.color = 'var(--muted)';
    try {
      const response = await fetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?query=hotel+berlin&type=lodging&key=${key}`);
      const data = await response.json();
      if(data.status === 'OK' || data.status === 'ZERO_RESULTS'){
        result.textContent = '✅ API-Key gültig!';
        result.style.color = 'var(--success)';
      } else {
        result.textContent = '❌ ' + data.status + ': ' + (data.error_message || 'Ungültiger Key');
        result.style.color = 'var(--danger)';
      }
    } catch (error){
      result.textContent = '❌ Netzwerkfehler (CORS – im Browser nur über SDK testbar)';
      result.style.color = 'var(--warn)';
    }
  }

  function updateUberSettingsHint(){
    const hint = document.getElementById('s-uber-result');
    if(!hint) return;
    const enabled = !!document.getElementById('s-uber-enabled')?.checked;
    const clientId = document.getElementById('s-uber-client-id')?.value.trim() || '';
    const backendUrl = document.getElementById('s-uber-backend')?.value.trim() || '';
    if(!enabled){
      hint.textContent = 'Uber API ist deaktiviert. Fuer MVP kann Google allein aktiv bleiben.';
      hint.style.color = 'var(--muted)';
    } else if(clientId && backendUrl){
      hint.textContent = 'Uber API ist konfigurierbar. Das Frontend sendet Transferdaten an Ihr Backend.';
      hint.style.color = 'var(--success)';
    } else {
      hint.textContent = 'Fuer Uber API bitte mindestens Client ID und Backend-Endpunkt eintragen.';
      hint.style.color = 'var(--warn)';
    }
  }

  async function testUberConnection(){
    const result = document.getElementById('s-uber-result');
    const backendUrl = document.getElementById('s-uber-backend')?.value.trim() || '';
    const clientId = document.getElementById('s-uber-client-id')?.value.trim() || '';
    if(!result) return;
    if(!backendUrl || !clientId){
      result.textContent = 'Bitte zuerst Uber Client ID und Backend-URL eintragen.';
      result.style.color = 'var(--warn)';
      return;
    }

    result.textContent = '⏳ Pruefe Uber-Backend...';
    result.style.color = 'var(--muted)';
    try {
      const response = await fetch(backendUrl.replace(/\/$/, '') + '/health');
      if(response.ok){
        result.textContent = '✅ Backend erreichbar. Uber API-Flow kann angebunden werden.';
        result.style.color = 'var(--success)';
      } else {
        result.textContent = `⚠️ Backend antwortet mit HTTP ${response.status}. Endpunkt pruefen.`;
        result.style.color = 'var(--warn)';
      }
    } catch (error){
      result.textContent = '❌ Backend nicht erreichbar. URL, CORS oder lokalen Server pruefen.';
      result.style.color = 'var(--danger)';
    }
  }

  function fmtDate(dateValue){
    if(!dateValue) return '';
    const [year, month, day] = dateValue.split('-');
    return `${day}.${month}.${year}`;
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('settings-modal')?.addEventListener('click', function(event){
      if(event.target === this) closeSettings();
    });
  });

  global.TravelLogikSettings = {
    configureTravelSettings,
    getGoogleConfig,
    getUberConfig,
    getPilotConfig,
    initAmadeus,
    searchHotelsGoogle,
    openSettings,
    closeSettings,
    saveSettings,
    testAmadeus,
    updateUberSettingsHint,
    testUberConnection,
    fmtDate
  };

  global.initAmadeus = initAmadeus;
  global.searchHotelsGoogle = searchHotelsGoogle;
  global.openSettings = openSettings;
  global.closeSettings = closeSettings;
  global.saveSettings = saveSettings;
  global.getPilotConfig = getPilotConfig;
  global.testAmadeus = testAmadeus;
  global.updateUberSettingsHint = updateUberSettingsHint;
  global.testUberConnection = testUberConnection;
})(window);
