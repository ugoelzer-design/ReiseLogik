(function(global){
  'use strict';

  const AIRLINES = [
    {name:'Lufthansa', code:'LH', logo:'✈'},
    {name:'Ryanair', code:'FR', logo:'🟡'},
    {name:'Eurowings', code:'EW', logo:'💜'},
    {name:'Turkish Airlines', code:'TK', logo:'🔴'},
    {name:'Emirates', code:'EK', logo:'🟢'},
    {name:'Air France', code:'AF', logo:'💙'}
  ];

  const AIRPORT_ALIASES = [
    {code:'FRA', terms:['frankfurt', 'frankfurt am main', 'fra']},
    {code:'MUC', terms:['muenchen', 'münchen', 'munich', 'muc']},
    {code:'BER', terms:['berlin', 'ber']},
    {code:'HAM', terms:['hamburg', 'ham']},
    {code:'DUS', terms:['duesseldorf', 'düsseldorf', 'dusseldorf', 'dus']},
    {code:'CGN', terms:['koeln', 'köln', 'cologne', 'cgn']},
    {code:'STR', terms:['stuttgart', 'str']},
    {code:'NUE', terms:['nuernberg', 'nürnberg', 'nuremberg', 'nue']},
    {code:'HAJ', terms:['hannover', 'hanover', 'haj']},
    {code:'LEJ', terms:['leipzig', 'leipzig halle', 'lej']},
    {code:'SCN', terms:['saarbruecken', 'saarbrücken', 'saarbrucken', 'scn']},
    {code:'FKB', terms:['karlsruhe', 'baden-baden', 'baden baden', 'karlsruhe baden-baden', 'karlsruhe/baden-baden', 'fkb']},
    {code:'BCN', terms:['barcelona', 'bcn']},
    {code:'PMI', terms:['palma', 'mallorca', 'palma de mallorca', 'pmi']},
    {code:'LIS', terms:['lissabon', 'lisbon', 'lis']},
    {code:'LHR', terms:['london', 'heathrow', 'lhr']},
    {code:'CDG', terms:['paris', 'charles de gaulle', 'cdg']},
    {code:'FCO', terms:['rom', 'rome', 'fiumicino', 'fco']},
    {code:'JFK', terms:['new york', 'jfk']},
    {code:'HND', terms:['tokio', 'tokyo', 'haneda', 'hnd']},
    {code:'DXB', terms:['dubai', 'dxb']}
  ];

  const AIRPORT_OPTIONS = [
    'Frankfurt (FRA)',
    'München (MUC)',
    'Berlin (BER)',
    'Hamburg (HAM)',
    'Düsseldorf (DUS)',
    'Köln/Bonn (CGN)',
    'Stuttgart (STR)',
    'Nürnberg (NUE)',
    'Hannover (HAJ)',
    'Leipzig/Halle (LEJ)',
    'Saarbrücken (SCN)',
    'Karlsruhe / Baden-Baden (FKB)',
    'Barcelona (BCN)',
    'Palma de Mallorca (PMI)',
    'Lissabon (LIS)',
    'London Heathrow (LHR)',
    'Paris Charles de Gaulle (CDG)',
    'Rom Fiumicino (FCO)',
    'New York JFK (JFK)',
    'Tokio Haneda (HND)',
    'Dubai (DXB)'
  ];

  const runtime = {
    createProviderAdapter:null,
    runSearchPipeline:null,
    setTrip:()=>{},
    renderFlights:()=>{},
    buildSuggests:()=>{},
    getFlightData:()=>[],
    setFlightData:()=>{}
  };

  function configureTravelFlights(options = {}){
    if(typeof options.createProviderAdapter === 'function') runtime.createProviderAdapter = options.createProviderAdapter;
    if(typeof options.runSearchPipeline === 'function') runtime.runSearchPipeline = options.runSearchPipeline;
    if(typeof options.setTrip === 'function') runtime.setTrip = options.setTrip;
    if(typeof options.renderFlights === 'function') runtime.renderFlights = options.renderFlights;
    if(typeof options.buildSuggests === 'function') runtime.buildSuggests = options.buildSuggests;
    if(typeof options.getFlightData === 'function') runtime.getFlightData = options.getFlightData;
    if(typeof options.setFlightData === 'function') runtime.setFlightData = options.setFlightData;
  }

  function calcArr(hours, minutes, duration){
    const total = hours * 60 + minutes + duration;
    return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  }

  function normalizeAirportCode(value, fallback){
    const input = (value || '').trim();
    if(!input) return fallback;

    const iataMatch = input.match(/\b([A-Za-z]{3})\b/);
    if(iataMatch && /[A-Za-z]{3}/.test(iataMatch[1])){
      return iataMatch[1].toUpperCase();
    }

    const normalized = input
      .toLowerCase()
      .replace(/[()]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const matchedAirport = AIRPORT_ALIASES.find(airport =>
      airport.terms.some(term => normalized.includes(term))
    );

    if(matchedAirport) return matchedAirport.code;

    return input.substring(0, 3).toUpperCase() || fallback;
  }

  function initAirportSuggestions(){
    const datalistId = 'flight-airports';
    let datalist = global.document.getElementById(datalistId);
    if(!datalist){
      datalist = global.document.createElement('datalist');
      datalist.id = datalistId;
      global.document.body.appendChild(datalist);
    }
    datalist.innerHTML = AIRPORT_OPTIONS.map(option=>`<option value="${option}"></option>`).join('');

    ['f-from', 'f-to'].forEach(id => {
      const input = global.document.getElementById(id);
      if(input) input.setAttribute('list', datalistId);
    });
  }

  function genFlights(from, to, dep){
    const results = [];
    const fromCode = normalizeAirportCode(from, 'FRA');
    const toCode = normalizeAirportCode(to, 'BCN');
    AIRLINES.forEach((airline, i)=>{
      const depHour = 6 + i * 2 + Math.floor(Math.random() * 2);
      const durationMin = 90 + Math.floor(Math.random() * 240);
      const price = 89 + Math.floor(Math.random() * 400);
      const stops = i < 3 ? 0 : (Math.random() > 0.5 ? 0 : 1);
      results.push({
        id: `F${Date.now()}${i}`,
        airline,
        from: fromCode,
        to: toCode,
        depTime: `${String(depHour).padStart(2, '0')}:${Math.random() > 0.5 ? '00' : '30'}`,
        arrTime: calcArr(depHour, Math.floor(Math.random() * 60), durationMin),
        duration: `${Math.floor(durationMin / 60)}h ${durationMin % 60}m`,
        durationMin,
        depHour,
        stops,
        price,
        dep,
        baggageIncluded: Math.random() > 0.45,
        flexibleFare: Math.random() > 0.58,
        onTimeRate: 78 + Math.floor(Math.random() * 18),
        flightNum: `${airline.code}${1000 + Math.floor(Math.random() * 9000)}`
      });
    });
    return results;
  }

  function ensureFlightAdapter(){
    if(typeof runtime.createProviderAdapter !== 'function'){
      throw new Error('Travel flights runtime is not configured.');
    }
    return runtime.createProviderAdapter('flight', {
      source:'mock-flight-engine',
      async search(params){
        return genFlights(params.from, params.to, params.dep);
      }
    });
  }

  async function searchFlights(){
    const from = document.getElementById('f-from').value;
    const to = document.getElementById('f-to').value;
    if(!to.trim()){
      global.alert('Bitte Zielflughafen eingeben');
      return;
    }
    const dep = document.getElementById('f-dep').value;
    if(!dep){
      global.alert('Bitte ein Hinflugdatum eingeben');
      return;
    }
    const retInput = document.getElementById('f-ret');
    const ret = retInput?.disabled ? '' : (retInput?.value || '');
    const pax = parseInt(document.getElementById('f-pax').value) || 1;
    const loader = document.getElementById('f-loader');
    const results = document.getElementById('flight-results');
    const list = document.getElementById('f-list');

    runtime.setTrip({from, to, destination: to, depDate: dep, retDate: ret, pax});
    results.style.display = 'none';
    loader.classList.add('show');

    global.setTimeout(async ()=>{
      try {
        const data = await runtime.runSearchPipeline('flight', ensureFlightAdapter(), {from, to, dep, ret, pax});
        runtime.setFlightData(data);
        results.style.display = 'block';
        runtime.renderFlights();
        runtime.buildSuggests('page-flights');
      } catch(error){
        results.style.display = 'block';
        if(list){
          list.innerHTML = `<div class="card" style="padding:1rem;border:1px solid #f5c6cb;background:#fdf2f2;color:#721c24">Flugsuche fehlgeschlagen: ${error.message || 'Unbekannter Fehler'}</div>`;
        }
      } finally {
        loader.classList.remove('show');
      }
    }, 1200);
  }

  function openSuperFlights(){
    const from = document.getElementById('f-from').value;
    const to = document.getElementById('f-to').value;
    const dep = document.getElementById('f-dep').value;
    
    let url = 'https://www.super.com/travel/flights';
    if(to){
      url += `?destination=${encodeURIComponent(to)}`;
      if(from) url += `&origin=${encodeURIComponent(from)}`;
      if(dep) url += `&departureDate=${dep}`;
    }
    global.open(url, '_blank');
  }

  function openGoogleFlights(){
    const from = document.getElementById('f-from').value;
    const to = document.getElementById('f-to').value;
    const dep = document.getElementById('f-dep').value;
    const ret = document.getElementById('f-ret')?.disabled ? '' : (document.getElementById('f-ret')?.value || '');
    const pax = document.getElementById('f-pax')?.value || '1';
    const query = [
      'Google Flights',
      from ? `von ${from}` : '',
      to ? `nach ${to}` : '',
      dep ? `am ${dep}` : '',
      ret ? `zurueck ${ret}` : '',
      `${pax} Personen`
    ].filter(Boolean).join(' ');
    global.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank', 'noopener');
  }

  global.TravelLogikFlights = {
    configureTravelFlights,
    searchFlights,
    initAirportSuggestions,
    openSuperFlights,
    openGoogleFlights
  };

  global.searchFlights = searchFlights;
  global.openSuperFlights = openSuperFlights;
  global.openGoogleFlights = openGoogleFlights;
  global.document.addEventListener('DOMContentLoaded', initAirportSuggestions);
})(window);
