(function(global){
  'use strict';

  const COMMUNITY_DATA = {
    forums: [
      {title:'Barcelona unter 900€ im August', text:'Diskussionen zu Flugzeitpunkten, Strandhotels und City-vs.-Beach-Balance.', meta:['128 Beiträge','Trend: Preiswert','Aktiv heute']},
      {title:'Japan erste Reise', text:'Shinkansen-Pässe, Viertel zum Übernachten und 10-Tage-Routen für Einsteiger.', meta:['89 Beiträge','Guide-verlinkt','Sehr beliebt']},
      {title:'Familienurlaub Mallorca', text:'Kinderfreundliche Resorts, Mietwagen-Fragen und Tipps für Nebenstrände.', meta:['154 Beiträge','Familienfokus','Neue Antworten']}
    ],
    guides: [
      {title:'48 Stunden Lissabon', text:'Kulinarik, Tram-Linien, Rooftops und eine realistische Budgetspanne pro Tag.'},
      {title:'Bali smart buchen', text:'Wann Hotels günstiger sind, wie Transfers funktionieren und welche Regionen zu welchem Stil passen.'},
      {title:'New York mit Preisgefühl', text:'Hotelzonen, Metro-Tipps und welche Attraktionen ihren Preis wirklich wert sind.'}
    ],
    reviews: [
      {title:'Sea View Resort', rating:'4.8', text:'Top Preis-Leistung in der Nebensaison, ruhige Lage und starkes Frühstück.'},
      {title:'Eurowings FRA → BCN', rating:'4.2', text:'Nicht das günstigste Ticket, aber sehr fair bei Handgepäck und guter Abflugzeit.'},
      {title:'Sixt SUV Barcelona', rating:'4.5', text:'Schnelle Übernahme, faire Versicherungspakete und gute Fahrzeugqualität.'}
    ],
    benefits: [
      {title:'Vertrauen im Funnel', text:'User Generated Content reduziert Unsicherheit in der Buchungsentscheidung und verbessert Conversion.'},
      {title:'SEO & Wiederkehr', text:'Forenfragen, Guides und Bewertungen erzeugen Long-Tail-Traffic und mehr Wiederbesuche.'},
      {title:'Bessere Empfehlungen', text:'Community-Signale helfen dabei, Highlights, Problemfälle und echte Preis-Leistungs-Sieger zu erkennen.'}
    ]
  };

  const runtime = {
    ids: {
      forums: 'community-forums',
      guides: 'community-guides',
      reviews: 'community-reviews',
      benefits: 'community-benefits'
    },
    data: COMMUNITY_DATA
  };

  function configureTravelCommunity(options = {}){
    if(options.ids && typeof options.ids === 'object'){
      runtime.ids = {...runtime.ids, ...options.ids};
    }
    if(options.data && typeof options.data === 'object'){
      runtime.data = options.data;
    }
  }

  function getNode(key){
    return global.document.getElementById(runtime.ids[key]);
  }

  function renderSimpleCommunityList(items){
    return items.map(item=>`
      <div class="community-item">
        <strong>${item.title}</strong>
        <div style="font-size:.85rem;color:var(--text-light)">${item.text}</div>
      </div>`).join('');
  }

  function renderReviewList(items){
    return items.map(item=>`
      <div class="community-item">
        <strong>${item.title}</strong>
        <div class="review-stars">★★★★★ <span style="color:var(--text-light);font-size:.8rem">(${item.rating})</span></div>
        <div style="font-size:.85rem;color:var(--text-light);margin-top:.35rem">${item.text}</div>
      </div>`).join('');
  }

  function renderForumList(items){
    return items.map(item=>`
      <div class="forum-card">
        <strong>${item.title}</strong>
        <div style="font-size:.85rem;color:var(--text-light)">${item.text}</div>
        <div class="forum-meta">${(item.meta || []).map(meta=>`<span>${meta}</span>`).join('')}</div>
      </div>`).join('');
  }

  function renderCommunityHub(){
    const forumsEl = getNode('forums');
    const guidesEl = getNode('guides');
    const reviewsEl = getNode('reviews');
    const benefitsEl = getNode('benefits');
    const data = runtime.data || COMMUNITY_DATA;

    if(forumsEl) forumsEl.innerHTML = renderForumList(data.forums || []);
    if(guidesEl) guidesEl.innerHTML = renderSimpleCommunityList(data.guides || []);
    if(reviewsEl) reviewsEl.innerHTML = renderReviewList(data.reviews || []);
    if(benefitsEl) benefitsEl.innerHTML = renderSimpleCommunityList(data.benefits || []);
  }

  global.TravelLogikCommunity = {
    COMMUNITY_DATA,
    configureTravelCommunity,
    renderCommunityHub
  };

  global.COMMUNITY_DATA = COMMUNITY_DATA;
  global.renderCommunityHub = renderCommunityHub;
})(window);
