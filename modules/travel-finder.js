(function(global){
  'use strict';

  const DESTINATIONS = [
    {name:'Barcelona',country:'Spanien',emoji:'🏛️',bg:'linear-gradient(135deg,#f9c74f,#f8961e)',klima:['strand','mild'],activity:['kultur','food','party'],dauer:['kurz','mittel'],budget:['mid'],flug:['kurz'],desc:'Gaudi, Tapas, Strand & Nightlife',best:'Mai–Okt',price:'ab 600€',tags:['Architektur','Strand','Kulinarik']},
    {name:'Malediven',country:'Malediven',emoji:'🏝️',bg:'linear-gradient(135deg,#4cc9f0,#023e8a)',klima:['strand','tropisch'],activity:['relax','sport'],dauer:['mittel','lang'],budget:['high','lux'],flug:['lang'],desc:'Weißer Sand, türkisblaues Wasser, Overwater-Bungalows',best:'Nov–Apr',price:'ab 2.800€',tags:['Luxus','Tauchen','Romantik']},
    {name:'Kyoto',country:'Japan',emoji:'⛩️',bg:'linear-gradient(135deg,#ff9a9e,#ffecd2)',klima:['mild'],activity:['kultur','food'],dauer:['lang','xl'],budget:['high'],flug:['xl'],desc:'Tempel, Geishas, Kirschblüten & Zen',best:'Mär–Mai, Sep–Nov',price:'ab 2.200€',tags:['Kultur','Tempel','Küche']},
    {name:'Mallorca',country:'Spanien',emoji:'🌅',bg:'linear-gradient(135deg,#a8edea,#fed6e3)',klima:['strand','mild'],activity:['relax','sport','food'],dauer:['kurz','mittel'],budget:['low','mid'],flug:['kurz'],desc:'Sonne, Strand, Cala-Buchten & Sangria',best:'Mai–Okt',price:'ab 350€',tags:['Strand','Familie','Aktivurlaub']},
    {name:'New York',country:'USA',emoji:'🗽',bg:'linear-gradient(135deg,#667eea,#764ba2)',klima:['mild'],activity:['kultur','food','party'],dauer:['kurz','mittel'],budget:['high','lux'],flug:['lang'],desc:'Broadway, Central Park, World-Class Food',best:'Apr–Jun, Sep–Nov',price:'ab 1.400€',tags:['Metropole','Kultur','Shopping']},
    {name:'Safari Kenia',country:'Kenia',emoji:'🦁',bg:'linear-gradient(135deg,#f6d365,#fda085)',klima:['tropisch'],activity:['natur'],dauer:['lang','xl'],budget:['high','lux'],flug:['lang'],desc:'Big Five, Masai Mara, unberührte Wildnis',best:'Jul–Okt',price:'ab 2.500€',tags:['Safari','Natur','Abenteuer']},
    {name:'Lissabon',country:'Portugal',emoji:'🚋',bg:'linear-gradient(135deg,#fddb92,#d1fdff)',klima:['mild','strand'],activity:['kultur','food','party'],dauer:['kurz','mittel'],budget:['low','mid'],flug:['kurz'],desc:'Fado, Pasteis, Tram & Atlantik-Flair',best:'Apr–Okt',price:'ab 450€',tags:['Städtetrip','Kulinarik','Nightlife']},
    {name:'Bali',country:'Indonesien',emoji:'🌺',bg:'linear-gradient(135deg,#84fab0,#8fd3f4)',klima:['tropisch'],activity:['relax','kultur','sport'],dauer:['lang','xl'],budget:['mid'],flug:['xl'],desc:'Tempel, Reisfelder, Surfen & Yoga',best:'Mai–Sep',price:'ab 1.200€',tags:['Spirituell','Strand','Yoga']},
    {name:'Dolomiten',country:'Italien',emoji:'🏔️',bg:'linear-gradient(135deg,#a18cd1,#fbc2eb)',klima:['berg'],activity:['natur','sport'],dauer:['kurz','mittel'],budget:['mid'],flug:['kurz'],desc:'UNESCO-Welterbe, Wandern, Klettern, Hüttenzauber',best:'Jun–Sep, Dez–Mär',price:'ab 700€',tags:['Wandern','Natur','Berge']},
    {name:'Dubai',country:'VAE',emoji:'🌆',bg:'linear-gradient(135deg,#f7971e,#ffd200)',klima:['strand','tropisch'],activity:['relax','party','food'],dauer:['kurz','mittel'],budget:['high','lux'],flug:['mittel'],desc:'Wolkenkratzer, Wüste, Luxus & Shoppingmalls',best:'Nov–Apr',price:'ab 1.100€',tags:['Luxus','Shopping','Wüste']},
    {name:'Prag',country:'Tschechien',emoji:'🏰',bg:'linear-gradient(135deg,#e0c3fc,#8ec5fc)',klima:['mild'],activity:['kultur','food','party'],dauer:['kurz'],budget:['low'],flug:['kurz'],desc:'Märchenhafte Altstadt, Bier & Böhmische Küche',best:'Apr–Okt',price:'ab 280€',tags:['Städtetrip','Günstig','Kultur']},
    {name:'Marokko',country:'Marokko',emoji:'🕌',bg:'linear-gradient(135deg,#ff9966,#ff5e62)',klima:['mild','tropisch'],activity:['kultur','natur','food'],dauer:['mittel'],budget:['low','mid'],flug:['kurz','mittel'],desc:'Medinas, Sahara, Souks & Berberkultur',best:'Mär–Mai, Sep–Nov',price:'ab 500€',tags:['Exotisch','Kultur','Abenteuer']},
  ];

  const runtime = {
    setTrip: ()=>{},
    showPage: ()=>{},
    searchFlights: ()=>{},
    searchHotels: ()=>{},
    getTrip: ()=>({})
  };
  const HARD_FILTER_GROUPS = ['budget', 'dauer', 'flug'];
  const SOFT_PREFERENCE_GROUPS = ['klima', 'activity'];
  const MIN_DESTINATION_MATCH_PERCENT = 60;
  const GROUP_LABELS = {
    klima: 'Klima',
    activity: 'Aktivität',
    dauer: 'Reisedauer',
    budget: 'Budget',
    flug: 'Flugdauer'
  };
  const VALUE_LABELS = {
    klima: {
      strand: 'Strand & Sonne',
      berg: 'Berge & Natur',
      mild: 'Mild & angenehm',
      tropisch: 'Tropisch & exotisch',
      schnee: 'Schnee & Winter'
    },
    activity: {
      kultur: 'Kultur & Geschichte',
      party: 'Nightlife & Party',
      natur: 'Natur & Wandern',
      food: 'Kulinarik',
      sport: 'Wassersport',
      relax: 'Entspannung & Spa'
    },
    dauer: {
      kurz: '2-4 Tage',
      mittel: '5-9 Tage',
      lang: '10-14 Tage',
      xl: '3+ Wochen'
    },
    budget: {
      low: 'unter 500 EUR',
      mid: '500-1.500 EUR',
      high: '1.500-3.000 EUR',
      lux: '3.000 EUR+'
    },
    flug: {
      kurz: 'bis 3h',
      mittel: '3-6h',
      lang: '6-12h',
      xl: '12h+'
    }
  };

  function configureTravelFinder(options = {}){
    if(typeof options.setTrip === 'function') runtime.setTrip = options.setTrip;
    if(typeof options.showPage === 'function') runtime.showPage = options.showPage;
    if(typeof options.searchFlights === 'function') runtime.searchFlights = options.searchFlights;
    if(typeof options.searchHotels === 'function') runtime.searchHotels = options.searchHotels;
    if(typeof options.getTrip === 'function') runtime.getTrip = options.getTrip;
  }

  function bindMoodPills(){
    global.document.querySelectorAll('.mood-pill').forEach(pill => {
      pill.addEventListener('click', function(){
        const group = this.dataset.group;
        const wasSelected = this.classList.contains('sel');
        global.document.querySelectorAll(`.mood-pill[data-group="${group}"]`).forEach(item=>item.classList.remove('sel'));
        if(!wasSelected) this.classList.add('sel');
      });
    });
  }

  function getSelections(){
    const selections = {};
    global.document.querySelectorAll('.mood-pill.sel').forEach(pill => {
      const group = pill.dataset.group;
      if(!group || !pill.dataset.val) return;
      if(!selections[group]) selections[group] = [];
      if(!selections[group].includes(pill.dataset.val)) selections[group].push(pill.dataset.val);
    });
    return selections;
  }

  function matchesSelectionGroup(destination, selections, group){
    const selectedValues = selections[group];
    if(!selectedValues || !selectedValues.length) return true;
    return !!(destination[group] && destination[group].some(value=>selectedValues.includes(value)));
  }

  function getMatchedValues(destination, selections, group){
    const selectedValues = selections[group];
    if(!selectedValues || !selectedValues.length || !destination[group]) return [];
    return destination[group].filter(value=>selectedValues.includes(value));
  }

  function getSelectedCount(selections, groups){
    return groups.reduce((count, group)=>count + ((selections[group] && selections[group].length) ? 1 : 0), 0);
  }

  function buildSelectionLabel(group, values){
    if(!values || !values.length) return '';
    const labelMap = VALUE_LABELS[group] || {};
    return values.map(value=>labelMap[value] || value).join(' / ');
  }

  function formatActiveHardSelections(selections){
    return HARD_FILTER_GROUPS
      .filter(group=>selections[group] && selections[group].length)
      .map(group=>`${GROUP_LABELS[group]}: ${buildSelectionLabel(group, selections[group])}`)
      .join(' · ');
  }

  function evaluateDestination(destination, selections){
    const hardFailures = HARD_FILTER_GROUPS
      .filter(group=>!matchesSelectionGroup(destination, selections, group))
      .map(group=>({group, selectedValues: selections[group] || []}));
    const softMatches = SOFT_PREFERENCE_GROUPS
      .filter(group=>getMatchedValues(destination, selections, group).length)
      .map(group=>({
        group,
        matchedValues: getMatchedValues(destination, selections, group)
      }));
    const selectedSoftCount = getSelectedCount(selections, SOFT_PREFERENCE_GROUPS);
    const softMatchCount = softMatches.length;
    const score = selectedSoftCount === 0
      ? 100
      : Math.round((softMatchCount / selectedSoftCount) * 100);
    return {
      destination,
      passesFilters: hardFailures.length === 0,
      hardFailures,
      softMatches,
      softMatchCount,
      selectedSoftCount,
      score
    };
  }

  function scoreDestination(destination, selections){
    return evaluateDestination(destination, selections).score;
  }

  function passesFinderFilters(destination, selections){
    return evaluateDestination(destination, selections).passesFilters;
  }

  function parsePriceValue(priceLabel){
    const normalized = String(priceLabel || '').replace(/[^\d]/g, '');
    return normalized ? parseInt(normalized, 10) : Number.MAX_SAFE_INTEGER;
  }

  function compareEvaluations(a, b){
    if(b.score !== a.score) return b.score - a.score;
    if(b.softMatchCount !== a.softMatchCount) return b.softMatchCount - a.softMatchCount;
    const priceDiff = parsePriceValue(a.destination.price) - parsePriceValue(b.destination.price);
    if(priceDiff !== 0) return priceDiff;
    return a.destination.name.localeCompare(b.destination.name, 'de');
  }

  function createDestinationKey(name){
    return String(name || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'ziel';
  }

  function buildDetailLine(label, value){
    return `
      <div style="display:flex;justify-content:space-between;gap:.75rem;padding:.3rem 0;border-bottom:1px solid #edf2f7">
        <span style="font-size:.8rem;color:var(--muted)">${label}</span>
        <span style="font-size:.82rem;color:var(--text);font-weight:600;text-align:right">${value}</span>
      </div>
    `;
  }

  function renderDestinationDetails(destination, softMatches, softReason){
    const matchingHighlights = softMatches.length
      ? softMatches.map(item=>buildSelectionLabel(item.group, item.matchedValues)).join(' · ')
      : 'Passend vor allem über Ihre Muss-Kriterien';
    return `
      <div class="finder-detail-panel" style="margin-top:.75rem;padding:.85rem;border:1px solid #e7eef6;border-radius:14px;background:#f8fbff">
        <div style="font-size:.82rem;font-weight:700;color:var(--text);margin-bottom:.5rem">Mehr Details zu diesem Vorschlag</div>
        <div style="font-size:.8rem;color:var(--text-light);margin-bottom:.6rem">${softReason}</div>
        <div style="display:grid;gap:.2rem">
          ${buildDetailLine('Warum dieser Vorschlag', matchingHighlights)}
          ${buildDetailLine('Klima', buildSelectionLabel('klima', destination.klima))}
          ${buildDetailLine('Aktivitäten', buildSelectionLabel('activity', destination.activity))}
          ${buildDetailLine('Empfohlene Dauer', buildSelectionLabel('dauer', destination.dauer))}
          ${buildDetailLine('Typische Flugdauer', buildSelectionLabel('flug', destination.flug))}
          ${buildDetailLine('Budget-Niveau', buildSelectionLabel('budget', destination.budget))}
        </div>
      </div>
    `;
  }

  function renderResultCard(evaluation){
    const { destination, score, softMatches, selectedSoftCount, isFallbackSuggestion } = evaluation;
    const detailKey = createDestinationKey(destination.name);
    const softReason = isFallbackSuggestion
      ? `Bester verfügbarer Vorschlag. Aktuell unter ${MIN_DESTINATION_MATCH_PERCENT}% Match, aber passend zu Ihren Muss-Kriterien.`
      : softMatches.length
      ? `Passt zu: ${softMatches.map(item=>buildSelectionLabel(item.group, item.matchedValues)).join(' · ')}`
      : selectedSoftCount
        ? 'Erfüllt Ihre harten Kriterien, aber ohne zusätzlichen Klima-/Aktivitäts-Match.'
        : 'Erfüllt Ihre ausgewählten Muss-Kriterien.';
    return `
      <div class="dest-card" style="cursor:pointer" onclick="toggleFinderDetails('${detailKey}')">
        <div class="dest-banner" style="background:${destination.bg}">
          ${destination.emoji}
          <span class="dest-match">${score}% Match</span>
        </div>
        <div class="dest-body">
          <div class="dest-name">${destination.name} <span style="font-size:.8rem;color:var(--muted);font-weight:400">${destination.country}</span></div>
          <div class="dest-tags">${destination.tags.map(tag=>`<span class="tag">${tag}</span>`).join('')}</div>
          <div class="dest-info">📅 Beste Reisezeit: ${destination.best}</div>
          <div class="dest-price">✈️ ${destination.price} p.P.</div>
          <div style="font-size:.82rem;color:var(--text-light);margin-top:.3rem">${destination.desc}</div>
          <div style="font-size:.8rem;color:var(--muted);margin-top:.45rem">${softReason}</div>
          <div style="font-size:.78rem;color:var(--accent);font-weight:700;margin-top:.55rem">Tippen für mehr Details</div>
          <div id="finder-details-${detailKey}" style="display:none">
            ${renderDestinationDetails(destination, softMatches, softReason)}
          </div>
          <div style="display:flex;gap:.5rem;margin-top:.8rem">
            <button class="btn btn-primary btn-sm" style="flex:1" onclick="startBookingFromFinder('${destination.name}', event)">✈️ Flüge</button>
            <button class="btn btn-success btn-sm" style="flex:1" onclick="showHotelsFromFinder('${destination.name}', event)">🏨 Hotels</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderEmptyState(selections){
    const failureSummary = formatActiveHardSelections(selections);
    const hasSoftSelections = getSelectedCount(selections, SOFT_PREFERENCE_GROUPS) > 0;
    const hint = failureSummary
      ? `Keine Ziele passen aktuell zu ${failureSummary}. Lockern Sie am ehesten eines dieser Muss-Kriterien.`
      : hasSoftSelections
        ? `Keine Ziele erreichen aktuell mindestens ${MIN_DESTINATION_MATCH_PERCENT}% Match. Lockern Sie Klima- oder Aktivitätswünsche leicht.`
        : 'Keine Ziele gefunden. Passen Sie Budget, Reisedauer oder Flugdauer leicht an.';
    return `
      <div class="card" style="grid-column:1/-1;padding:1.1rem 1.2rem">
        <div style="font-size:1rem;font-weight:700;margin-bottom:.35rem">Keine passenden Reiseziele gefunden</div>
        <div style="font-size:.9rem;color:var(--text-light)">${hint}</div>
      </div>
    `;
  }

  function findDestinations(){
    const selections = getSelections();
    const selectedSoftCount = getSelectedCount(selections, SOFT_PREFERENCE_GROUPS);
    const evaluations = DESTINATIONS.map(destination=>evaluateDestination(destination, selections));
    const matching = evaluations
      .filter(evaluation=>evaluation.passesFilters)
      .sort(compareEvaluations);
    const preferred = matching
      .filter(evaluation=>selectedSoftCount === 0 || evaluation.score >= MIN_DESTINATION_MATCH_PERCENT);
    const scored = preferred.length
      ? preferred
      : matching.length
        ? [{...matching[0], isFallbackSuggestion: selectedSoftCount > 0}]
        : [];
    const countEl = global.document.getElementById('finder-count');
    const gridEl = global.document.getElementById('dest-grid');
    const resultsEl = global.document.getElementById('finder-results');
    if(countEl) countEl.textContent = scored.length
      ? preferred.length
        ? `${scored.length} Reiseziele gefunden`
        : '1 konkreter Vorschlag gefunden'
      : '0 Reiseziele gefunden';
    if(gridEl){
      gridEl.innerHTML = scored.length
        ? scored.map(renderResultCard).join('')
        : renderEmptyState(selections);
    }
    if(resultsEl) resultsEl.style.display = 'block';
  }

  function toggleFinderDetails(detailKey){
    global.document.querySelectorAll('[id^="finder-details-"]').forEach(el => {
      if(el.id !== `finder-details-${detailKey}`) el.style.display = 'none';
    });
    const panel = global.document.getElementById(`finder-details-${detailKey}`);
    if(panel) panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  }

  function startBookingFromFinder(name, event){
    event?.stopPropagation?.();
    runtime.setTrip({to:name, destination:name});
    const toEl = global.document.getElementById('f-to');
    if(toEl) toEl.value = name;
    runtime.showPage('page-flights');
    runtime.searchFlights();
  }

  function showHotelsFromFinder(name, event){
    event?.stopPropagation?.();
    runtime.setTrip({destination:name, to:name});
    const hotelDestEl = global.document.getElementById('h-dest');
    if(hotelDestEl) hotelDestEl.value = name;

    const today = new Date();
    const fmt = d => d.toISOString().split('T')[0];
    const add = (d, n) => {
      const next = new Date(d);
      next.setDate(next.getDate() + n);
      return next;
    };
    const trip = runtime.getTrip() || {};
    const dep = trip.depDate || fmt(add(today, 7));
    const ret = trip.retDate || fmt(add(new Date(dep), 3));
    const inEl = global.document.getElementById('h-in');
    const outEl = global.document.getElementById('h-out');
    if(inEl) inEl.value = dep;
    if(outEl) outEl.value = ret;

    runtime.showPage('page-hotels');
    global.setTimeout(()=>runtime.searchHotels(), 80);
  }

  global.TravelLogikFinder = {
    configureTravelFinder,
    getSelections,
    scoreDestination,
    findDestinations,
    toggleFinderDetails,
    startBookingFromFinder,
    showHotelsFromFinder
  };

  global.findDestinations = findDestinations;
  global.toggleFinderDetails = toggleFinderDetails;
  global.startBookingFromFinder = startBookingFromFinder;
  global.showHotelsFromFinder = showHotelsFromFinder;

  global.document.addEventListener('DOMContentLoaded', bindMoodPills);
})(window);
