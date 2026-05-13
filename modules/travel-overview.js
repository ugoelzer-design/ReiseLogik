(function(global){
  'use strict';

  const MVP_ROADMAP = [
    {phase:'Heute nutzbar', status:'live', title:'Hostbare Beta mit erster Selbstbuchungsroute', text:'Klassische Hotels koennen bereits direkt in TravelLogik gebucht werden; Fluege, Mietwagen und Transfers bleiben klar als Anfrage oder Vorbereitung gefuehrt.'},
    {phase:'Naechster Schritt', status:'next', title:'Belastbare Hotel-Selbstbuchung', text:'Mehr echte Hoteldaten, klarere Buchungsbestaetigungen und sauberere Statuswechsel zwischen buchbar, anfragbar und vorbereitet.'},
    {phase:'Danach', status:'next', title:'Bundles & Assistenz', text:'Cross-Sell-Logik aus Flug, Hotel, Transfer und Mietwagen, um konkrete Reisevorschlaege schneller in buchbare Pakete zu ueberfuehren.'},
    {phase:'Spaeter', status:'later', title:'Content- und Community-Layer', text:'Guides, Bewertungen und wiederkehrende Nutzersignale koennen spaeter Vertrauen und Wiederkehr weiter staerken.'}
  ];

  const MONETIZATION_MODELS = [
    {title:'Klare Datenherkunft', text:'Jede Suche sollte erkennbar machen, ob Ergebnisse aus Demo-Daten, Live-APIs oder vorbereiteten Integrationen stammen.'},
    {title:'Weniger Overpromise', text:'Nur klassische Hotels versprechen heute eine lokale Selbstbuchung in TravelLogik. Alles andere bleibt bewusst Anfrage, Rueckfrage oder Vorbereitung.'},
    {title:'Erstnutzer sicher fuehren', text:'Leere Zustaende, Suchvorschlaege und naechste Schritte reduzieren Reibung und machen den Nutzen schneller sichtbar.'},
    {title:'Hosting-freundliche Grundlagen', text:'Konfigurierbare Datenquellen, defensive Speicherung und saubere Fallbacks erleichtern den Uebergang von lokal zu gehostet.'}
  ];

  const PRODUCT_MODELS = [
    {title:'Value Score', text:'Kombiniert Preis, Komfort, Flexibilität, Bewertungen und Profil-Fit zu einer schnell lesbaren Priorisierung.'},
    {title:'Provider Comparison', text:'Zeigt je Angebot alternative Buchungsquellen und die geschätzte Ersparnis gegenüber dem Marktdurchschnitt.'},
    {title:'Personal Match', text:'Gewichtet Suchergebnisse je nach Budgetfokus, Reisezweck und Komfortanspruch des Nutzers.'}
  ];

  const runtime = {
    ids: {
      kpis: 'overview-kpis',
      roadmap: 'roadmap-list',
      monetization: 'monetization-grid',
      models: 'model-list',
      recommendation: 'overview-recommendation',
      timeline: 'trip-timeline',
      expensesSummary: 'trip-expenses-summary'
    },
    getTravelerProfile: ()=>({style:'smart', budget:'mid', purpose:'leisure', priority:'value'}),
    getBookings: ()=>([]),
    getFlightData: ()=>([]),
    getHotelData: ()=>([]),
    getCarData: ()=>([])
  };

  function configureTravelOverview(options = {}){
    if(options.ids && typeof options.ids === 'object'){
      runtime.ids = {...runtime.ids, ...options.ids};
    }
    if(typeof options.getTravelerProfile === 'function') runtime.getTravelerProfile = options.getTravelerProfile;
    if(typeof options.getBookings === 'function') runtime.getBookings = options.getBookings;
    if(typeof options.getFlightData === 'function') runtime.getFlightData = options.getFlightData;
    if(typeof options.getHotelData === 'function') runtime.getHotelData = options.getHotelData;
    if(typeof options.getCarData === 'function') runtime.getCarData = options.getCarData;
  }

  function getNode(key){
    return global.document.getElementById(runtime.ids[key]);
  }

  function getRecommendationText(profile){
    if(profile.purpose === 'business'){
      return 'Kurze Wege, flexible Tarife und verlässliche Tagesrandzeiten werden priorisiert.';
    }
    if(profile.purpose === 'family'){
      return 'Familientaugliche Optionen mit gutem Preis-Leistungs-Verhältnis und wenig Reibung stehen vorne.';
    }
    return 'Ausgewogene Freizeitreisen mit hohem Gegenwert und klarer Preistransparenz werden bevorzugt.';
  }

  function getRecommendationTitle(profile){
    if(profile.style === 'comfort') return 'Komfortorientierte Auswahl';
    if(profile.style === 'balanced') return 'Ausgewogene Auswahl';
    return 'Smart-Saver Auswahl';
  }

  function renderOverviewKpis(){
    const container = getNode('kpis');
    if(!container) return;

    const bookings = runtime.getBookings() || [];
    const flightData = runtime.getFlightData() || [];
    const hotelData = runtime.getHotelData() || [];
    const carData = runtime.getCarData() || [];
    const profile = runtime.getTravelerProfile() || {};
    const activeBookings = bookings.filter(booking=>booking.status !== 'cancelled');
    const totalHandoffs = activeBookings.filter(booking=>booking.type === 'hotel').length;
    const confirmedHotelBookings = activeBookings.filter(booking=>booking.type === 'hotel' && booking.status === 'confirmed').length;
    const totalVolume = bookings
      .filter(booking=>booking.status !== 'cancelled')
      .reduce((sum, booking)=>sum + (booking.total || 0), 0);
    const activeSearches = [flightData.length, hotelData.length, carData.length].filter(Boolean).length;
    const cards = [
      {value:'3', label:'MVP-Module live'},
      {value:`${totalHandoffs} / ${confirmedHotelBookings}`, label:'Hotelbuchungen / bestaetigt'},
      {value:`€${totalVolume}`, label:'Gespeichertes Testvolumen'},
      {value:activeSearches || '0', label:`Aktive Suchkontexte · ${profile.priority || 'value'}`}
    ];

    container.innerHTML = cards.map(card=>`
      <div class="kpi-card">
        <div class="value">${card.value}</div>
        <div class="label">${card.label}</div>
      </div>`).join('');
  }
function renderTripTimeline(){
  const container = getNode('timeline');
  if(!container) return;
  const bookings = runtime.getBookings() || [];
  const activeBookings = bookings.filter(b=>b.status !== 'cancelled');

  // Create events from bookings and their history
  const events = [];
  activeBookings.forEach(booking => {
    // Created event
    events.push({
      date: new Date(booking.createdAt || Date.now()),
      type: 'Erfasst',
      title: booking.name,
      detail: booking.detail,
      icon: '📝'
    });

    // Status history events
    if(Array.isArray(booking.statusHistory)){
      booking.statusHistory.forEach(history => {
        if(history.to === 'booked' || history.to === 'confirmed'){
          events.push({
            date: new Date(history.at || Date.now()),
            type: history.to === 'booked' ? 'Gebucht' : 'Bestaetigt',
            title: booking.name,
            detail: `Status-Update: ${history.to}`,
            icon: '✅'
          });
        }
      });
    }
  });

  // Sort events by date descending
  events.sort((a,b) => b.date - a.date);

  if(!events.length){
    container.innerHTML = '<div class="empty-state">Noch keine Vorgaenge erfasst.</div>';
    return;
  }

  container.innerHTML = events.map(event => `
    <div class="timeline-item">
      <div class="timeline-date">${event.date.toLocaleString('de-DE')}</div>
      <div class="timeline-content">
        <div class="timeline-type">${event.icon} ${event.type}</div>
        <div style="font-weight:600">${event.title}</div>
        <div style="font-size:.78rem;color:var(--text-light)">${event.detail}</div>
      </div>
    </div>`).join('');
}

function renderTripExpensesSummary(){
  const container = getNode('expensesSummary');
  if(!container) return;
  const bookings = runtime.getBookings() || [];
  const activeBookings = bookings.filter(b=>b.status !== 'cancelled');

  const cats = [
    {label: 'Flüge', type: 'flight', icon: '✈️'},
    {label: 'Unterkunft', type: 'hotel', icon: '🏨'},
    {label: 'Mietwagen', type: 'car', icon: '🚗'},
    {label: 'Transfer', type: 'transfer', icon: '🚌'}
  ];

  const costs = cats.map(cat => {
    const amount = activeBookings
      .filter(b => b.type === cat.type)
      .reduce((sum, b) => sum + (b.total || 0), 0);
    return {...cat, amount};
  });

  const total = costs.reduce((sum, cat) => sum + cat.amount, 0);

  if(total === 0){
    container.innerHTML = '<div class="empty-state">Noch keine Buchungen mit Kosten erfasst.</div>';
    return;
  }

  let html = costs.filter(c => c.amount > 0).map(cat => `
    <div class="expense-row">
      <div class="expense-cat"><span>${cat.icon}</span> ${cat.label}</div>
      <div class="expense-val">€${cat.amount.toLocaleString('de-DE')}</div>
    </div>`).join('');

  html += `
    <div class="expense-total">
      <div class="expense-row" style="border:none">
        <span>Gesamt (Buchungen)</span>
        <span>€${total.toLocaleString('de-DE')}</span>
      </div>
    </div>`;

  container.innerHTML = html;
}

function renderOverview(){
  const roadmapEl = getNode('roadmap');
  const monetizationEl = getNode('monetization');
  const modelsEl = getNode('models');
  const recommendationEl = getNode('recommendation');
  const profile = runtime.getTravelerProfile() || {};
  const bookings = runtime.getBookings() || [];

  renderOverviewKpis();
  renderTripTimeline();
  renderTripExpensesSummary();

  // Sync budget if available
  if(global.TravelLogikBudget?.syncBudgetFromBookings){
    global.TravelLogikBudget.syncBudgetFromBookings(bookings);
  }

  if(roadmapEl){
      roadmapEl.innerHTML = MVP_ROADMAP.map(item=>`
        <div class="roadmap-item">
          <span class="status-chip status-${item.status}">${item.phase}</span>
          <strong>${item.title}</strong>
          <div style="font-size:.86rem;color:var(--text-light)">${item.text}</div>
        </div>`).join('');
    }

    if(monetizationEl){
      monetizationEl.innerHTML = MONETIZATION_MODELS.map(item=>`
        <div class="model-item">
          <strong>${item.title}</strong>
          <div style="font-size:.84rem;color:var(--text-light)">${item.text}</div>
        </div>`).join('');
    }

    if(modelsEl){
      modelsEl.innerHTML = PRODUCT_MODELS.map(item=>`
        <div class="model-item">
          <strong>${item.title}</strong>
          <div style="font-size:.84rem;color:var(--text-light)">${item.text}</div>
        </div>`).join('');
    }

    if(recommendationEl){
      recommendationEl.innerHTML = `
        <div class="recommendation-card">
          <span class="match-pill">Profil aktiv</span>
          <h3>${getRecommendationTitle(profile)}</h3>
          <p>${getRecommendationText(profile)}</p>
          <div class="meta-list">
            <span>Budget: ${profile.budget || 'mid'}</span>
            <span>Reisezweck: ${profile.purpose || 'leisure'}</span>
            <span>Priorität: ${profile.priority || 'value'}</span>
          </div>
        </div>`;
    }
  }

  global.TravelLogikOverview = {
    MVP_ROADMAP,
    MONETIZATION_MODELS,
    PRODUCT_MODELS,
    configureTravelOverview,
    renderOverview,
    renderOverviewKpis
  };

  global.renderOverview = renderOverview;
})(window);
