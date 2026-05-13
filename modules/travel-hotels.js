(function(global){
  'use strict';

  const hotelReadiness = global.TravelLogikHotelReadiness || {};
  const annotateHotelResults = typeof hotelReadiness.annotateHotelResults === 'function'
    ? hotelReadiness.annotateHotelResults
    : (items)=>items || [];

  const HOTEL_TEMPLATES = [
    {name:'Grand Palace Hotel',stars:5,emoji:'🏛️',tags:['Pool','Spa','Restaurant','WiFi','Parkplatz'],rating:9.2},
    {name:'City Center Suites',stars:4,emoji:'🏙️',tags:['Frühstück','WiFi','Gym'],rating:8.7},
    {name:'Boutique Charme',stars:4,emoji:'🌹',tags:['Spa','Restaurant','Bar'],rating:9.0},
    {name:'Airport Business Inn',stars:3,emoji:'✈️',tags:['Shuttle','WiFi','Parkplatz'],rating:7.8},
    {name:'Sea View Resort',stars:5,emoji:'🌊',tags:['Strand','Pool','Spa','Restaurant'],rating:9.5},
    {name:'Budget Smart Hotel',stars:3,emoji:'💡',tags:['WiFi','Klimaanlage'],rating:7.5},
    {name:'Family & Fun Resort',stars:4,emoji:'👨‍👩‍👧',tags:['Pool','Kinderprogramm','Restaurant'],rating:8.9},
    {name:'Historic Town Manor',stars:4,emoji:'🏰',tags:['Frühstück','Bar','Garten'],rating:8.5}
  ];

  const runtime = {
    createProviderAdapter:null,
    runSearchPipeline:null,
    setTrip:()=>{},
    renderHotels:()=>{},
    renderHotelSourceStatus:()=>{},
    getHotelData:()=>[],
    setHotelData:()=>{},
    getGoogleConfig:()=>global.GOOGLE_CFG,
    searchHotelsGoogle:null
  };

  let accommodationType = {type:'lodging', query:'hotels'};

  function slugify(value){
    return String(value || 'hotel')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'hotel';
  }

  function buildHotelProfile(hotel, params){
    const family = hotel.familyFriendly;
    const airportMinutesBase = hotel.tags.includes('Shuttle')
      ? 9
      : /airport|business/i.test(hotel.name)
      ? 12
      : hotel.tags.includes('Parkplatz')
      ? 24
      : 38;
    const destinations = [
      `${params.dest} Altstadt`,
      `${params.dest} Zentrum`,
      `${params.dest} Uferlage`,
      `${params.dest} Business District`
    ];
    const nearbyBase = family
      ? ['Familienstrand', 'Promenade', 'Stadtpark']
      : ['Altstadtgassen', 'Hauptplatz', 'Kulinarikviertel'];
    return {
      neighborhood: destinations[hotel.stars % destinations.length],
      checkInFrom: family ? '15:00' : '14:00',
      checkOutUntil: hotel.stars >= 4 ? '12:00' : '11:00',
      frontDesk: hotel.stars >= 4 ? '24/7 Rezeption' : 'Rezeption bis 22:00',
      policyNote: family
        ? 'Kinderbett und ruhiges Zimmer können lokal im Hinweisfeld vermerkt werden.'
        : 'Spaete Anreise und hohe Etage können lokal im Hinweisfeld markiert werden.',
      idealFor: family
        ? 'Familien, laengere Aufenthalte und entspannte Selbstbuchung'
        : hotel.tags.includes('Shuttle')
        ? 'Kurzaufenthalte, Business-Trips und spaete Anreise'
        : 'Staedtereise, flexible Raten und klassische Hotelbuchung',
      reviewSnippet: hotel.stars >= 5
        ? 'Gäste heben vor allem die ruhige Ankunft, das Frühstück und den verlässlichen Standard hervor.'
        : 'Gäste beschreiben das Haus als solide, gut erreichbar und für direkte Aufenthalte angenehm unkompliziert.',
      localHighlights: hotel.tags.slice(0, 3),
      nearbySpots: nearbyBase.map((spot, index)=>`${spot} · ${8 + index * 4} Min`),
      airportMinutes: airportMinutesBase + (hotel.stars >= 4 ? 4 : 0),
      airportAccessLabel: airportMinutesBase <= 15
        ? 'Sehr nah am Flughafen'
        : airportMinutesBase <= 25
        ? 'Gut für Flughafenankunft'
        : 'Eher stadtorientiert',
      transportNote: hotel.tags.includes('Shuttle')
        ? 'Shuttle und Flughafenbezug machen das Haus für spaete Ankunft glaubwürdig.'
        : 'Lokale Anfahrt per Taxi oder Transfer bleibt vorbereitbar, ohne den Hotel-Checkout aufzublasen.',
      amenityBlocks: [
        {
          title:'Hausprofil',
          items:[
            hotel.stars >= 4 ? 'Früher Check-in auf Anfrage' : 'Klassischer Empfangsbereich',
            hotel.tags.includes('Restaurant') ? 'Restaurant im Haus' : 'Snacks / Lobbybereich',
            hotel.tags.includes('Spa') ? 'Wellnessbereich' : 'Ruhige Aufenthaltsbereiche'
          ]
        },
        {
          title:'Gut zu wissen',
          items:[
            hotel.tags.includes('Parkplatz') ? 'Parken moeglich' : 'Parken extern einplanen',
            family ? 'Familiengeeignete Zimmerlage' : 'Business- und Couple-taugliche Zimmerstruktur',
            hotel.tags.includes('WiFi') ? 'WLAN im Standard enthalten' : 'WLAN nicht als Kernfeature hervorgehoben'
          ]
        }
      ]
    };
  }

  function buildRoomOptions(hotel, params, basePrice){
    const guestLabel = params.adults > 1 ? `${params.adults} Gäste` : '1 Gast';
    const selectedRooms = Math.max(1, params.rooms || 1);
    const roomVariants = [
      {
        label:'Comfort Zimmer',
        board:'Ohne Frühstück',
        boardCode:'room-only',
        cancellationType:'strict',
        cancellationLabel:'Nicht kostenfrei stornierbar',
        flexibilityLabel:'Fixer Tarif',
        priceDelta:0,
        note:'Solide Basisrate für die aktuelle Auswahl.',
        badges:['Basis', guestLabel],
        maxGuestsPerRoom:2,
        bedding:'1 Doppelbett oder 2 Twin Beds',
        roomSize:'22 m²',
        view:'Innenhof oder Stadtseite'
      },
      {
        label:'Comfort Plus',
        board:'Frühstück inklusive',
        boardCode:'breakfast',
        cancellationType:'semi-flex',
        cancellationLabel:'Kostenfrei stornierbar bis 3 Tage vor Anreise, danach 1 Nacht',
        flexibilityLabel:'Teilflexibel',
        priceDelta:18,
        note:'Beliebte Rate mit Frühstück und ruhigerem Profil.',
        badges:['Frühstück', guestLabel],
        maxGuestsPerRoom:2,
        bedding:'1 Queen Bed',
        roomSize:'26 m²',
        view:'Ruhige Etage'
      },
      {
        label: hotel.stars >= 4 ? 'Deluxe Flex' : 'Superior Flex',
        board:'Frühstück inklusive',
        boardCode:'breakfast',
        cancellationType:'flex',
        cancellationLabel:'Kostenfrei stornierbar bis 18:00 Uhr, 2 Tage vor Anreise',
        flexibilityLabel:'Flexibel',
        priceDelta:36,
        note:'Hoeherwertiges Zimmer mit maximal klarer lokaler Flex-Info.',
        badges:['Flex', hotel.stars >= 4 ? 'Mehr Komfort' : 'Upgrade'],
        maxGuestsPerRoom: hotel.familyFriendly ? 3 : 2,
        bedding: hotel.familyFriendly ? '1 King Bed + Schlafsofa' : '1 King Bed',
        roomSize: hotel.stars >= 4 ? '32 m²' : '28 m²',
        view: hotel.tags.includes('Strand') ? 'Seitlicher Meerblick' : 'Premium Lage'
      }
    ];

    return roomVariants.map((variant, index)=>{
      const pricePerNight = basePrice + variant.priceDelta;
      const total = pricePerNight * params.nights * selectedRooms;
      const optionId = `${slugify(hotel.name)}-${index + 1}`;
      const totalCapacity = selectedRooms * variant.maxGuestsPerRoom;
      const occupancyFits = params.adults <= totalCapacity;
      const recommendedRooms = Math.max(1, Math.ceil(params.adults / variant.maxGuestsPerRoom));
      const occupancyLabel = occupancyFits
        ? `${params.adults} Gast${params.adults > 1 ? 'e' : ''} in ${selectedRooms} Zimmer passend`
        : `Für ${params.adults} Gäste besser ${recommendedRooms} Zimmer einplanen`;
      return {
        id: optionId,
        providerRoomId:'',
        providerRateId:'',
        roomType: variant.label,
        rateName: `${variant.label} · ${variant.flexibilityLabel}`,
        board: variant.board,
        breakfastIncluded: variant.boardCode === 'breakfast',
        freeCancellation: variant.cancellationType === 'flex',
        partiallyRefundable: variant.cancellationType === 'semi-flex',
        flexibilityLabel: variant.flexibilityLabel,
        cancellationType: variant.cancellationType,
        cancellationLabel: variant.cancellationLabel,
        note: variant.note,
        badges: variant.badges,
        maxGuestsPerRoom: variant.maxGuestsPerRoom,
        bedding: variant.bedding,
        roomSize: variant.roomSize,
        view: variant.view,
        selectedRooms,
        occupancyFits,
        recommendedRooms,
        occupancyLabel,
        pricePerNight,
        total,
        hotelMvp:{
          roomMapping:{completed:false, live:false, missing:true},
          rate:{completed:false, live:false, missing:true}
        }
      };
    });
  }

  function attachRoomOptions(hotel, params, index){
    const roomOptions = buildRoomOptions(hotel, params, hotel.pricePerNight);
    const selectedOption = roomOptions[Math.min(index % roomOptions.length, roomOptions.length - 1)];
    return {
      ...hotel,
      roomOptions,
      selectedRoomOptionId: selectedOption.id,
      roomType: selectedOption.roomType,
      providerRoomId: selectedOption.providerRoomId || '',
      providerRateId: selectedOption.providerRateId || '',
      rateName: selectedOption.rateName,
      board: selectedOption.board,
      breakfastIncluded: selectedOption.breakfastIncluded,
      freeCancellation: selectedOption.freeCancellation,
      partiallyRefundable: selectedOption.partiallyRefundable,
      flexibilityLabel: selectedOption.flexibilityLabel,
      cancellationLabel: selectedOption.cancellationLabel,
      roomOptionNote: selectedOption.note,
      maxGuestsPerRoom: selectedOption.maxGuestsPerRoom,
      bedding: selectedOption.bedding,
      roomSize: selectedOption.roomSize,
      roomView: selectedOption.view,
      occupancyFits: selectedOption.occupancyFits,
      recommendedRooms: selectedOption.recommendedRooms,
      occupancyLabel: selectedOption.occupancyLabel,
      pricePerNight: selectedOption.pricePerNight,
      total: selectedOption.total
    };
  }

  function configureTravelHotels(options = {}){
    if(typeof options.createProviderAdapter === 'function') runtime.createProviderAdapter = options.createProviderAdapter;
    if(typeof options.runSearchPipeline === 'function') runtime.runSearchPipeline = options.runSearchPipeline;
    if(typeof options.setTrip === 'function') runtime.setTrip = options.setTrip;
    if(typeof options.renderHotels === 'function') runtime.renderHotels = options.renderHotels;
    if(typeof options.renderHotelSourceStatus === 'function') runtime.renderHotelSourceStatus = options.renderHotelSourceStatus;
    if(typeof options.getHotelData === 'function') runtime.getHotelData = options.getHotelData;
    if(typeof options.setHotelData === 'function') runtime.setHotelData = options.setHotelData;
    if(typeof options.getGoogleConfig === 'function') runtime.getGoogleConfig = options.getGoogleConfig;
    if(typeof options.searchHotelsGoogle === 'function') runtime.searchHotelsGoogle = options.searchHotelsGoogle;
  }

  function getAccommodationType(){
    return accommodationType;
  }

  function setAccomType(btn){
    global.document.querySelectorAll('#accom-type-btns .trip-btn').forEach(button=>button.classList.remove('active'));
    btn.classList.add('active');
    accommodationType = {type: btn.dataset.type, query: btn.dataset.query};
  }

  function openAirbnb(){
    const dest = global.document.getElementById('h-dest')?.value || '';
    const checkin = global.document.getElementById('h-in')?.value || '';
    const checkout = global.document.getElementById('h-out')?.value || '';
    const guests = parseInt(global.document.getElementById('h-guests')?.value) || 2;
    const isVacation = accommodationType.type === 'vacation_rental';
    const url = isVacation
      ? `https://www.airbnb.de/s/${encodeURIComponent(dest)}/homes?checkin=${checkin}&checkout=${checkout}&adults=${guests}&room_types[]=Entire+home%2Fapt`
      : `https://www.airbnb.de/s/${encodeURIComponent(dest)}/homes?checkin=${checkin}&checkout=${checkout}&adults=${guests}`;
    global.open(url, '_blank');
  }

  function openSuperHotels(){
    const dest = document.getElementById('h-dest').value;
    const checkin = document.getElementById('h-in').value;
    const checkout = document.getElementById('h-out').value;
    
    // Construct contextual URL for Super.com if possible
    let url = 'https://www.super.com/travel';
    if(dest){
      url += `?query=${encodeURIComponent(dest)}`;
      if(checkin && checkout){
        url += `&checkin=${checkin}&checkout=${checkout}`;
      }
    }
    global.open(url, '_blank');
  }

  function buildTemplateHotels(params){
    return HOTEL_TEMPLATES
      .filter(h=>h.stars >= params.minStars)
      .map((h, i)=>{
        const p = 50 + h.stars * 25 + Math.floor(Math.random() * 80);
        const baseHotel = {
          ...h,
          id:`H${Date.now()}${i}`,
          sourceMode:'demo',
          searchId:'',
          provider:'',
          providerHotelId:'',
          providerRoomId:'',
          providerRateId:'',
          availabilityToken:'',
          prebookToken:'',
          externalReservationReference:'',
          searchProvider:'Lokale Demo-Vorlage',
          rateSource:'local-template',
          availabilitySource:'local-template',
          roomMappingSource:'local-template',
          cancellationSource:'local-template',
          providerPrebookSupported:false,
          providerReservationSupported:false,
          hotelMvp:{
            search:{completed:false, live:false, missing:true},
            rateCheck:{completed:false, live:false, missing:true},
            prebook:{completed:false, live:false, missing:true},
            reservationCreate:{completed:false, live:false, missing:true},
            persistence:{completed:false, live:false, missing:true}
          },
          dest:params.dest,
          pricePerNight:p,
          nights:params.nights,
          total:p * params.nights,
          breakfastIncluded: Math.random() > 0.45,
          freeCancellation: Math.random() > 0.4,
          familyFriendly: h.tags.includes('Kinderprogramm') || h.tags.includes('Pool')
        };
        return attachRoomOptions({
          ...baseHotel,
          ...buildHotelProfile(baseHotel, params)
        }, params, i);
      })
      .filter(h=>h.pricePerNight <= params.maxPrice);
  }

  function withAirportProfile(hotel, params, index){
    if(typeof hotel.airportMinutes === 'number' && hotel.airportAccessLabel) return hotel;
    const fallbackFamily = hotel.familyFriendly || (Array.isArray(hotel.tags) && (hotel.tags.includes('Kinderprogramm') || hotel.tags.includes('Pool')));
    const baseHotel = {
      ...hotel,
      familyFriendly: fallbackFamily
    };
    return {
      ...baseHotel,
      ...buildHotelProfile(baseHotel, params || {dest: hotel.dest || '', adults: 2})
    };
  }

  function ensureLocalHotelCompleteness(hotel, params, index){
    const enriched = withAirportProfile(hotel, params, index);
    return Array.isArray(enriched.roomOptions) && enriched.roomOptions.length
      ? enriched
      : attachRoomOptions(enriched, params, index);
  }

  function applyHotelSearchPreferences(items, params){
    const prepared = (items || []).map((hotel, index)=>ensureLocalHotelCompleteness(hotel, params, index));
    const ranked = prepared.sort((a, b)=>(b.valueScore || 0) - (a.valueScore || 0) || (a.pricePerNight || 0) - (b.pricePerNight || 0));
    return ranked.slice(0, 5);
  }

  function ensureHotelAdapter(){
    if(typeof runtime.createProviderAdapter !== 'function'){
      throw new Error('Travel hotels runtime is not configured.');
    }
    return runtime.createProviderAdapter('hotel', {
      source:'google-places-service-or-local',
      async search(params){
        const googleCfg = runtime.getGoogleConfig?.();
        
        // 1. Try Google Places if API Key is available
        if(googleCfg?.apiKey && typeof runtime.searchHotelsGoogle === 'function'){
          try {
            return await runtime.searchHotelsGoogle(
              params.dest,
              params.checkin,
              params.checkout,
              params.adults,
              params.minStars,
              params.maxPrice
            );
          } catch(err){
            console.warn('Google Places API failed, falling back...', err);
          }
        }

        // 2. Try Mock Hotel Service for "Live-Search" feeling without real API
        const service = global.TravelLogikHotelService;
        if(service && typeof service.search === 'function'){
          try {
            const result = await service.search(params);
            return result.hotels;
          } catch(err){
            console.warn('Mock Hotel Service failed, falling back to templates...', err);
          }
        }

        // 3. Last Resort: Local Templates
        return buildTemplateHotels(params);
      }
    });
  }

  function getHotelSearchParams(){
    const dest = document.getElementById('h-dest').value;
    if(!dest.trim()){
      global.alert('Bitte Zielort eingeben');
      return null;
    }

    const checkin = document.getElementById('h-in').value;
    const checkout = document.getElementById('h-out').value;
    if(!checkin || !checkout){
      global.alert('Bitte Check-in und Check-out auswählen');
      return null;
    }
    const nightsRaw = Math.round((new Date(checkout) - new Date(checkin)) / 86400000);
    if(!Number.isFinite(nightsRaw) || nightsRaw <= 0){
      global.alert('Bitte gültige Reisedaten mit mindestens einer Nacht auswählen');
      return null;
    }
    const adults = parseInt(document.getElementById('h-guests').value) || 2;
    const rooms = parseInt(document.getElementById('h-rooms').value) || 1;
    const minStars = parseInt(document.getElementById('h-stars').value) || 0;
    const maxPrice = parseInt(document.getElementById('h-price').value) || 9999;
    const nights = nightsRaw;

    return {dest, checkin, checkout, adults, rooms, minStars, maxPrice, nights};
  }

  async function searchHotels(){
    const params = getHotelSearchParams();
    if(!params) return;

    const {dest, checkin, checkout} = params;
    runtime.setTrip({destination:dest, to:dest, pax:params.adults});
    if(checkin) runtime.setTrip({depDate:checkin});
    if(checkout) runtime.setTrip({retDate:checkout});

    document.getElementById('hotel-results').style.display = 'none';
    const loader = document.getElementById('h-loader');
    loader.classList.add('show');

    const googleCfg = runtime.getGoogleConfig?.();
    const hotelSearchAdapter = ensureHotelAdapter();

    if(googleCfg?.apiKey){
      loader.innerHTML = '<div class="spinner"></div><br>Lade echte Hotels via Google Places...';
      try {
        const data = await runtime.runSearchPipeline('hotel', hotelSearchAdapter, params);
        runtime.setHotelData(annotateHotelResults(applyHotelSearchPreferences(data, params), {
          sourceMode:'live-search',
          provider:'Google Places',
          searchProvider:'Google Places',
          rateSource:'estimated-from-google-price-level',
          availabilitySource:'not-checked',
          roomMappingSource:'local-generated',
          cancellationSource:'local-generated',
          providerPrebookSupported:false,
          providerReservationSupported:false,
          hotelMvp:{
            search:{completed:true, live:true, missing:false, provider:'Google Places'},
            rateCheck:{completed:false, live:false, missing:true},
            prebook:{completed:false, live:false, missing:true},
            reservationCreate:{completed:false, live:false, missing:true},
            persistence:{completed:false, live:false, missing:true}
          }
        }));
        runtime.renderHotelSourceStatus({
          mode:'live',
          label:'Live-Daten aktiv',
          detail:'Objektsuche kommt live über Google Places; Raten und Verfügbarkeit sind noch nicht provider-verifiziert'
        });
        loader.classList.remove('show');
        document.getElementById('hotel-results').style.display = 'block';
        runtime.renderHotels();
        return;
      } catch(err){
        console.warn('Google Places Error, falling back to mock service', err);
      }
    }

    // NEW: Use MockHotelService as a fallback for a realistic "Live" experience without Google
    const service = global.TravelLogikHotelService;
    if(service && typeof service.search === 'function'){
      loader.innerHTML = '<div class="spinner"></div><br>Lade buchbare Hotels via TravelLogik Service...';
      try {
        const result = await service.search(params);
        runtime.setHotelData(annotateHotelResults(result.hotels, {
          sourceMode: result.status,
          searchId: result.searchId,
          searchProvider: 'Mock Service',
          provider: 'Mock Service',
          tags: ['Live-Search', 'Buchbar']
        }));
        runtime.renderHotelSourceStatus({
          mode: 'live',
          label: 'Mock Service aktiv',
          detail: 'Simuliert eine echte Backend-Anbindung für den Buchungsprozess.'
        });
        loader.classList.remove('show');
        document.getElementById('hotel-results').style.display = 'block';
        runtime.renderHotels();
        return;
      } catch(err){
        console.warn('Mock Service Error', err);
      }
    }

    loader.innerHTML = '<div class="spinner"></div><br>Lade Musterdaten...';
    global.setTimeout(async ()=>{
      try {
        runtime.renderHotelSourceStatus({
          mode:'demo',
          label:'Demo-Daten aktiv',
          detail: googleCfg?.apiKey ? 'Fallback nach Live-Fehler' : 'Kein Google-Places-Key hinterlegt'
        });
        const data = await runtime.runSearchPipeline('hotel', runtime.createProviderAdapter('hotel', {
          source:'local-hotel-templates',
          async search(fallbackParams){
            return buildTemplateHotels(fallbackParams);
          }
        }), params);
        runtime.setHotelData(annotateHotelResults(applyHotelSearchPreferences(data, params), {
          sourceMode:'demo',
          provider:'Lokale Demo-Vorlage',
          searchProvider:'Lokale Demo-Vorlage',
          rateSource:'local-template',
          availabilitySource:'local-template',
          roomMappingSource:'local-template',
          cancellationSource:'local-template',
          providerPrebookSupported:false,
          providerReservationSupported:false,
          hotelMvp:{
            search:{completed:false, live:false, missing:true},
            rateCheck:{completed:false, live:false, missing:true},
            prebook:{completed:false, live:false, missing:true},
            reservationCreate:{completed:false, live:false, missing:true},
            persistence:{completed:false, live:false, missing:true}
          }
        }));
        document.getElementById('hotel-results').style.display = 'block';
        runtime.renderHotels();
      } catch(error){
        document.getElementById('hotel-results').style.display = 'block';
        document.getElementById('h-list').innerHTML =
          `<div style="background:#fdf2f2;border:1px solid #f5c6cb;color:#721c24;padding:1rem;border-radius:8px;margin:.5rem 0">
            ⚠️ Hotelsuche fehlgeschlagen: <strong>${error.message || 'Unbekannter Fehler'}</strong>
           </div>`;
      } finally {
        loader.classList.remove('show');
      }
    }, 800);
  }

  global.TravelLogikHotels = {
    configureTravelHotels,
    getAccommodationType,
    setAccomType,
    openAirbnb,
    openSuperHotels,
    searchHotels
  };

  global.setAccomType = setAccomType;
  global.openAirbnb = openAirbnb;
  global.openSuperHotels = openSuperHotels;
  global.searchHotels = searchHotels;
})(window);
