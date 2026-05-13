(function(global){
  'use strict';

  const TRANSFER_OPTIONS = [
    {
      id:'taxi', icon:'🚕', name:'Taxi / Mietwagen', price:'€€',
      desc:'Direkte Fahrt ohne Umwege. Preis je nach Entfernung.',
      pros:['Tür zu Tür','24/7 verfügbar','Gepäck kein Problem'],
      best:'Komfort + Flexibilität',
      links:[
        {label:'FreeNow öffnen', url:()=>`https://www.free-now.com/`},
        {label:'Taxi.eu', url:()=>`https://www.taxi.eu/`},
      ],
      color:'#f39c12'
    },
    {
      id:'uber', icon:'⚫', name:'Uber / Bolt', price:'€-€€',
      desc:'API-ready für Live-Preis, ETA und spätere Ride-Requests über Ihr eigenes Backend.',
      pros:['Preis via API abfragbar','ETA und Produktwahl moeglich','passt zu echtem Preisvergleich'],
      best:'Stadtgebiete + eigene Buchungslogik',
      links:[
        {label:'Bolt öffnen', url:()=>`https://bolt.eu/`},
      ],
      color:'#1c1c1c',
      api:true
    },
    {
      id:'shuttle', icon:'🚐', name:'Flughafen-Shuttle', price:'€',
      desc:'Shared Shuttle mit anderen Passagieren – günstigste Option.',
      pros:['Günstig','Kein Parken nötig','Direkt am Terminal'],
      best:'Sparfüchse',
      links:[
        {label:'GetTransfer', url:(f,t)=>`https://gettransfer.com/de/?from=${encodeURIComponent(f)}&to=${encodeURIComponent(t)}`},
        {label:'Welcome Pickups', url:()=>`https://www.welcomepickups.com/`},
      ],
      color:'#27ae60'
    },
    {
      id:'bus', icon:'🚌', name:'Öffentlicher Bus / Metro', price:'€',
      desc:'Lokale Linien – günstigste Option für Reisende mit wenig Gepäck.',
      pros:['Sehr günstig','Umweltfreundlich','Stadtgefühl'],
      best:'1-2 Personen, leichtes Gepäck',
      links:[
        {label:'Google Maps Route', url:(f,t)=>`https://www.google.com/maps/dir/${encodeURIComponent(f)}/${encodeURIComponent(t)}`},
        {label:'Rome2rio', url:(f,t)=>`https://www.rome2rio.com/s/${encodeURIComponent(f)}/${encodeURIComponent(t)}`},
      ],
      color:'#2e86c1'
    },
    {
      id:'train', icon:'🚆', name:'Zug / S-Bahn', price:'€-€€',
      desc:'Schnell & pünktlich – viele Großflughäfen direkt angebunden.',
      pros:['Schnell','Staufrei','Komfortabel'],
      best:'Direktverbindungen',
      links:[
        {label:'DB Navigator', url:()=>`https://www.bahn.de/`},
        {label:'Trainline', url:()=>`https://www.thetrainline.com/`},
      ],
      color:'#8e44ad'
    },
    {
      id:'private', icon:'🚗', name:'Privater Fahrer', price:'€€€',
      desc:'Chauffeur-Service mit Namensschild am Terminal. Maximaler Komfort.',
      pros:['Maximal komfortabel','Business-Klasse','Pünktlichkeitsgarantie'],
      best:'Business / Gruppen',
      links:[
        {label:'GetTransfer (Privat)', url:(f,t)=>`https://gettransfer.com/de/?from=${encodeURIComponent(f)}&to=${encodeURIComponent(t)}&transport=business`},
        {label:'Blacklane', url:()=>`https://www.blacklane.com/`},
      ],
      color:'#2c3e50'
    },
  ];

  const TRANSFER_TIPS = {
    default:[
      {icon:'⏰', title:'Früh planen', text:'Shuttle-Services 24–48h vorher anfragen oder reservieren, besonders in der Hauptsaison.'},
      {icon:'💵', title:'Wechselgeld bereitlegen', text:'Taxis im Ausland oft nur Bar – kleines Trinkgeld (10%) wird erwartet.'},
      {icon:'📱', title:'Offline-Karte laden', text:'Google Maps Bereich offline herunterladen – spart Datenvolumen & Nerven.'},
      {icon:'🏷️', title:'Namensschild-Service', text:'Bei Privat-Fahrern: Buchungsnummer bereithalten, Fahrer wartet am Terminal.'},
    ],
    europe:[
      {icon:'🚇', title:'Metro oft am günstigsten', text:'Europäische Flughäfen meist gut ans ÖPNV-Netz angebunden.'},
      {icon:'💳', title:'Kontaktlos zahlen', text:'In den meisten EU-Ländern akzeptieren Taxis Kreditkarte.'},
    ],
    longhaul:[
      {icon:'😴', title:'Nach Langstreckenflug', text:'Nach langen Fluegen Taxi oder Shuttle vorab anfragen - kein Stress mit OePNV und Gepaeck.'},
      {icon:'🧳', title:'Gepäck-Limit beachten', text:'Öffentliche Busse oft beschränkter Gepäcks-raum. Große Koffer: Taxi empfohlen.'},
    ]
  };

  const runtime = {
    createProviderAdapter:null,
    runSearchPipeline:null,
    getSearchResults:()=>[],
    getTrip:()=>({}),
    setTransferData:()=>{},
    getUberConfig:()=>({}),
    markDone:()=>{},
    fmtDate:(value)=>value
  };

  let transferSearchAdapter = null;
  let currentTransferMode = 'destination'; // 'destination' or 'departure'
  const HOME_STORAGE_KEY = 'tl_home_address';

  function configureTravelTransfers(options = {}){
    if(typeof options.createProviderAdapter === 'function') runtime.createProviderAdapter = options.createProviderAdapter;
    if(typeof options.runSearchPipeline === 'function') runtime.runSearchPipeline = options.runSearchPipeline;
    if(typeof options.getSearchResults === 'function') runtime.getSearchResults = options.getSearchResults;
    if(typeof options.getTrip === 'function') runtime.getTrip = options.getTrip;
    if(typeof options.setTransferData === 'function') runtime.setTransferData = options.setTransferData;
    if(typeof options.getUberConfig === 'function') runtime.getUberConfig = options.getUberConfig;
    if(typeof options.markDone === 'function') runtime.markDone = options.markDone;
    if(typeof options.fmtDate === 'function') runtime.fmtDate = options.fmtDate;
  }

  function switchTransferMode(mode){
    currentTransferMode = mode;
    const btnDest = document.getElementById('btn-tr-dest');
    const btnDep = document.getElementById('btn-tr-dep');
    if(btnDest) btnDest.classList.toggle('active', mode === 'destination');
    if(btnDep) btnDep.classList.toggle('active', mode === 'departure');

    const searchTitle = document.getElementById('tr-search-title');
    const labelFrom = document.getElementById('tr-label-from');
    const labelTo = document.getElementById('tr-label-to');
    const inputFrom = document.getElementById('tr-from');
    const inputTo = document.getElementById('tr-to');
    const contextIcon = document.getElementById('tr-context-icon');

    if(mode === 'departure'){
      if(searchTitle) searchTitle.textContent = '🔍 Zubringer zum Flughafen suchen';
      if(labelFrom) labelFrom.textContent = 'Startpunkt (Ihre Adresse)';
      if(labelTo) labelTo.textContent = 'Abflughafen';
      if(contextIcon) contextIcon.textContent = '🏠→✈️';
      
      const trip = runtime.getTrip?.() || {};
      const home = localStorage.getItem(HOME_STORAGE_KEY) || '';
      if(inputFrom) inputFrom.value = home;
      if(inputTo) inputTo.value = trip.from || 'Flughafen Frankfurt';
    } else {
      if(searchTitle) searchTitle.textContent = '🔍 Transfer am Zielort suchen';
      if(labelFrom) labelFrom.textContent = 'Ankunftsflughafen';
      if(labelTo) labelTo.textContent = 'Ziel (Hotel / Adresse)';
      if(contextIcon) contextIcon.textContent = '✈️→🏨';

      const trip = runtime.getTrip?.() || {};
      const dest = trip.destination || trip.to;
      if(inputFrom) inputFrom.value = trip.to ? `Flughafen ${trip.to}` : '';
      if(inputTo) inputTo.value = dest || '';
    }
    
    initTransferPage();
  }

  function saveHomeAddress(){
    const addr = document.getElementById('tr-home-address')?.value.trim();
    if(addr) localStorage.setItem(HOME_STORAGE_KEY, addr);
  }

  function loadHomeAddress(){
    const input = document.getElementById('tr-home-address');
    if(input) input.value = localStorage.getItem(HOME_STORAGE_KEY) || '';
  }

  function getTransferQuery(){
    const trip = runtime.getTrip?.() || {};
    const from = document.getElementById('tr-from').value;
    const to = document.getElementById('tr-to').value;
    const pax = parseInt(document.getElementById('tr-pax').value) || 2;
    return {from, to, pax};
  }

  function buildTransferContextSummary(trip){
    const parts = [];
    if(currentTransferMode === 'departure'){
      if(trip.depDate) parts.push(`Abflug am ${runtime.fmtDate(trip.depDate)}`);
    } else {
      if(trip.depDate) parts.push(`Anreise: ${runtime.fmtDate(trip.depDate)}`);
      if(trip.retDate) parts.push(`Abreise: ${runtime.fmtDate(trip.retDate)}`);
    }
    if(trip.pax) parts.push(`${trip.pax} Person${trip.pax > 1 ? 'en' : ''}`);
    return parts.join(' · ');
  }

  function getTransferPageElements(){
    return {
      contextCard: document.getElementById('transfer-context'),
      contextTitle: document.getElementById('tr-context-title'),
      contextSub: document.getElementById('tr-context-sub'),
      fromInput: document.getElementById('tr-from'),
      toInput: document.getElementById('tr-to'),
      paxInput: document.getElementById('tr-pax')
    };
  }

  function initTransferPage(){
    loadHomeAddress();
    const trip = runtime.getTrip?.() || {};
    const {
      contextCard,
      contextTitle,
      contextSub,
      fromInput,
      toInput,
      paxInput
    } = getTransferPageElements();
    if(!contextCard) return;

    if(currentTransferMode === 'departure'){
      if(trip.from){
        if(contextTitle) contextTitle.textContent = `Weg nach ${trip.from} planen`;
        if(contextSub) contextSub.textContent = buildTransferContextSummary(trip);
        contextCard.style.display = 'block';
        return;
      }
    } else {
      const dest = trip.destination || trip.to;
      if(dest){
        if(contextTitle) contextTitle.textContent = `Transfer nach ${dest} erkannt`;
        if(contextSub) contextSub.textContent = buildTransferContextSummary(trip);
        contextCard.style.display = 'block';
        return;
      }
    }

    contextCard.style.display = 'none';
  }

  function handleTransferPageActivation(){
    initTransferPage();
  }

  function estimateTransferBasePrice(optionId, pax){
    if(optionId === 'bus') return 9 * pax;
    if(optionId === 'shuttle') return 18 * pax;
    if(optionId === 'uber') return 22 * pax;
    if(optionId === 'taxi') return 34 * pax;
    if(optionId === 'train') return 16 * pax;
    return 49 * pax;
  }

  function ensureTransferSearchAdapter(){
    if(transferSearchAdapter) return transferSearchAdapter;
    if(typeof runtime.createProviderAdapter !== 'function'){
      throw new Error('Travel transfers runtime is not configured.');
    }

    transferSearchAdapter = runtime.createProviderAdapter('transfer', {
      source:'transfer-comparison-engine',
      async search(params){
        return TRANSFER_OPTIONS.map((opt, idx)=>({
          id:`TR${Date.now()}${idx}`,
          name:opt.name,
          provider:opt.name,
          category:opt.id,
          from:params.from,
          to:params.to,
          pax:params.pax,
          price:estimateTransferBasePrice(opt.id, params.pax),
          total:estimateTransferBasePrice(opt.id, params.pax),
          bestFor:opt.best,
          priceBand:opt.price,
          type:'transfer',
          transferMode: currentTransferMode,
          url:opt.links?.[0]?.url(params.from, params.to) || null,
          providerOffers:(opt.links || []).slice(0, 3).map((link, linkIdx)=>({
            name:link.label,
            price:Math.max(1, estimateTransferBasePrice(opt.id, params.pax) + (linkIdx === 0 ? 0 : linkIdx === 1 ? -2 : 4)),
            url:link.url(params.from, params.to)
          }))
        }));
      }
    });

    return transferSearchAdapter;
  }

  function getUberDeepLink(from, to){
    const uberConfig = runtime.getUberConfig?.() || {};
    const pickup = encodeURIComponent(from);
    const dropoff = encodeURIComponent(to);
    const clientId = encodeURIComponent(uberConfig.clientId || '');
    return `https://m.uber.com/ul/?client_id=${clientId}&action=setPickup&pickup=my_location&dropoff[formatted_address]=${dropoff}&dropoff[nickname]=${dropoff}&pickup[nickname]=${pickup}`;
  }

  function renderUberQuote(container, state){
    const el = document.getElementById(container);
    if(!el) return;
    if(state.kind === 'missing'){
      el.innerHTML = `<div class="alert alert-info" style="margin:.75rem 0 0">Uber API ist vorbereitet. Tragen Sie in den API-Einstellungen Client ID und Backend-URL ein.</div>`;
      return;
    }
    if(state.kind === 'loading'){
      el.innerHTML = `<div class="alert alert-info" style="margin:.75rem 0 0">⏳ Uber-Angebote werden über Ihr Backend geladen...</div>`;
      return;
    }
    if(state.kind === 'error'){
      el.innerHTML = `<div class="alert" style="background:#fdedec;border:1px solid #f5c6cb;color:#721c24;margin:.75rem 0 0">${state.message}</div>`;
      return;
    }
    const products = state.products || [];
    if(!products.length){
      el.innerHTML = `<div class="alert alert-info" style="margin:.75rem 0 0">Keine Uber-Produkte für diese Route erhalten.</div>`;
      return;
    }
    el.innerHTML = `
      <div style="margin-top:.75rem;display:grid;gap:.55rem">
        ${products.map(p=>`
          <div style="border:1px solid var(--border);border-radius:10px;padding:.75rem;background:#fff">
            <div style="display:flex;justify-content:space-between;gap:.75rem;align-items:flex-start">
              <div>
                <div style="font-weight:700">${p.name || 'Uber Produkt'}</div>
                <div style="font-size:.8rem;color:var(--text-light)">ETA ${p.etaMinutes ?? '–'} Min. · ${p.capacity ?? '–'} Plaetze</div>
              </div>
              <div style="text-align:right">
                <div style="font-size:1.05rem;font-weight:700;color:var(--primary)">${p.estimate || p.price || 'Preis offen'}</div>
                <div style="font-size:.75rem;color:${p.surgeMultiplier && p.surgeMultiplier > 1 ? 'var(--danger)' : 'var(--muted)'}">${p.surgeMultiplier && p.surgeMultiplier > 1 ? `Surge x${p.surgeMultiplier}` : 'Normaltarif'}</div>
              </div>
            </div>
            <div style="display:flex;gap:.45rem;flex-wrap:wrap;margin-top:.6rem">
              ${p.deepLink ? `<a href="${p.deepLink}" target="_blank" class="btn btn-primary btn-sm" style="text-decoration:none">Uber öffnen</a>` : ''}
              ${p.requestToken ? `<button class="btn btn-success btn-sm" onclick="alert('Ride Request Token: ${p.requestToken}')">Ride Request</button>` : ''}
            </div>
          </div>`).join('')}
      </div>`;
  }

  async function requestUberEstimate(containerId){
    const uberConfig = runtime.getUberConfig?.() || {};
    if(!(uberConfig.enabled && uberConfig.backendUrl && uberConfig.clientId)){
      renderUberQuote(containerId, {kind:'missing'});
      return;
    }
    const query = getTransferQuery();
    renderUberQuote(containerId, {kind:'loading'});
    try {
      const resp = await fetch(uberConfig.backendUrl.replace(/\/$/,'') + '/quote', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          pickup: query.from,
          dropoff: query.to,
          passengers: query.pax,
          clientId: uberConfig.clientId,
          redirectUri: uberConfig.redirectUri || null
        })
      });
      const data = await resp.json().catch(()=>({}));
      if(!resp.ok){
        throw new Error(data.error || `HTTP ${resp.status}`);
      }
      const products = (data.products || []).map(p=>({
        ...p,
        deepLink: p.deepLink || getUberDeepLink(query.from, query.to)
      }));
      renderUberQuote(containerId, {kind:'success', products});
    } catch(err){
      renderUberQuote(containerId, {
        kind:'error',
        message:`Uber API konnte nicht geladen werden: ${err.message}. Erwartet wird ein Backend-Endpunkt ${uberConfig.backendUrl.replace(/\/$/,'') + '/quote'} mit JSON-Antwort.`
      });
    }
  }

  async function buildTransfers(){
    const trip = runtime.getTrip?.() || {};
    const {from, to, pax} = getTransferQuery();
    const container = document.getElementById('tr-cards');
    const results = document.getElementById('transfer-results');
    let transferData = runtime.getSearchResults('transfer');

    try {
      if(!transferData.length || transferData[0]?.from !== from || transferData[0]?.to !== to || transferData[0]?.pax !== pax){
        transferData = await runtime.runSearchPipeline('transfer', ensureTransferSearchAdapter(), {from, to, pax});
      }
      runtime.setTransferData(transferData);

      document.getElementById('tr-route-label').textContent = `${from} → ${to} (${pax>1 ? `${pax} Personen` : `${pax} Person`})`;
      container.innerHTML = '';

      transferData.forEach((offer, idx) => {
        const opt = TRANSFER_OPTIONS[idx];
        const card = document.createElement('div');
        card.className = 'card';
        card.style.cssText = `border-left:4px solid ${opt.color};cursor:default`;

        const links = opt.links.map(link =>
          `<a href="${link.url(from,to)}" target="_blank" class="btn btn-outline btn-sm" style="text-decoration:none;font-size:.78rem">${link.label}</a>`
        ).join('');

        const prosHtml = opt.pros.map(pro=>`<li style="font-size:.8rem;color:var(--text-light);margin-left:1rem">${pro}</li>`).join('');

        const apiBlock = opt.api ? `
          <div id="uber-quote-box" style="margin-top:.4rem"></div>
          <div style="display:flex;gap:.4rem;flex-wrap:wrap;margin-top:.6rem">
            <button class="btn btn-primary btn-sm" onclick="requestUberEstimate('uber-quote-box')">Uber API Preis laden</button>
            <a href="${getUberDeepLink(from,to)}" target="_blank" class="btn btn-outline btn-sm" style="text-decoration:none">Uber Deeplink</a>
          </div>
          <div style="font-size:.76rem;color:var(--muted);margin-top:.5rem">Flow: TravelLogik Frontend → Ihr Backend → Uber OAuth / Pricing / Ride Requests</div>
        ` : '';

        card.innerHTML = `
          <div style="display:flex;align-items:center;gap:.7rem;margin-bottom:.7rem">
            <span style="font-size:2rem">${opt.icon}</span>
            <div>
              <div style="font-weight:700;font-size:1rem">${opt.name}</div>
              <span style="font-size:.75rem;padding:.15rem .55rem;border-radius:10px;background:${opt.color}22;color:${opt.color};font-weight:600">${opt.price}</span>
              <span style="font-size:.75rem;margin-left:.3rem;color:var(--muted)">· Am besten für: ${opt.best}</span>
            </div>
          </div>
          <p style="font-size:.85rem;color:var(--text-light);margin-bottom:.6rem">${opt.desc}</p>
          <ul style="margin-bottom:.8rem">${prosHtml}</ul>
          <div style="display:flex;justify-content:space-between;align-items:center;gap:.75rem;margin-bottom:.75rem">
            <div>
              <div style="font-size:1.2rem;font-weight:800;color:var(--primary)">ab €${offer.total}</div>
              <div style="font-size:.76rem;color:var(--success)">${offer.savings ? `bis zu €${offer.savings} via ${offer.bestProvider.provider}` : 'Direktpreis'}</div>
            </div>
            <span class="score-badge ${offer.valueScore>=82?'top':''}">${offer.valueScore}</span>
          </div>
          <div style="display:flex;gap:.4rem;flex-wrap:wrap">${links}</div>
          <div style="display:flex;gap:.4rem;flex-wrap:wrap;margin-top:.6rem">
            <button class="btn btn-success btn-sm" onclick="openBooking('transfer',${JSON.stringify(offer).replace(/"/g,'&quot;')})">Transfer buchen</button>
          </div>
          ${apiBlock}
        `;
        container.appendChild(card);
      });

      const tipContainer = document.getElementById('tr-tips');
      tipContainer.innerHTML = '';
      const tips = [...TRANSFER_TIPS.default, ...(pax>=3 ? [] : TRANSFER_TIPS.europe)];
      tips.slice(0,4).forEach(tip => {
        const el = document.createElement('div');
        el.style.cssText = 'display:flex;gap:.6rem;align-items:flex-start;background:#f8f9fa;border-radius:8px;padding:.7rem';
        el.innerHTML = `<span style="font-size:1.3rem">${tip.icon}</span><div><div style="font-weight:600;font-size:.85rem">${tip.title}</div><div style="font-size:.8rem;color:var(--text-light)">${tip.text}</div></div>`;
        tipContainer.appendChild(el);
      });

      if(trip.retDate) {
        document.getElementById('tr-return-note').textContent =
          `Rückfahrt am ${runtime.fmtDate(trip.retDate)}: Shuttle 24h vorher reservieren. Für Mietwagen gilt die Rückgabe am Flughafen.`;
      }

      results.style.display='block';
      runtime.markDone('transfer');
      results.scrollIntoView({behavior:'smooth',block:'start'});
    } catch(error){
      results.style.display = 'block';
      container.innerHTML = `<div class="card" style="padding:1rem;border:1px solid #f5c6cb;background:#fdf2f2;color:#721c24">Transferoptionen konnten nicht geladen werden: ${error.message || 'Unbekannter Fehler'}</div>`;
    }
  }

  global.TravelLogikTransfers = {
    configureTravelTransfers,
    handleTransferPageActivation,
    initTransferPage,
    buildTransfers,
    requestUberEstimate
  };

  global.handleTransferPageActivation = handleTransferPageActivation;
  global.initTransferPage = initTransferPage;
  global.buildTransfers = buildTransfers;
  global.requestUberEstimate = requestUberEstimate;
})(window);
