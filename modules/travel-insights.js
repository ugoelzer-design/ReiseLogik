(function(global){
  'use strict';

  const core = global.TravelLogikCore;
  const comparison = global.TravelLogikComparison;

  if(!core){
    throw new Error('TravelLogikCore must be loaded before TravelLogikInsights.');
  }
  if(!comparison){
    throw new Error('TravelLogikComparison must be loaded before TravelLogikInsights.');
  }

  function renderProviderStrip(containerId, items, priceKey){
    const container = document.getElementById(containerId);
    if(!container) return;
    if(!items.length){ container.innerHTML=''; return; }
    const groups = items.slice(0,3).map(item=>{
      const bestProvider = item.bestProvider || core.getPreferredProviderQuote(item);
      const comparisonBase = comparison.getComparisonBaseValue(item, priceKey);
      const delta = Math.round(comparisonBase - bestProvider.total);
      const providerUrl = bestProvider.url || (bestProvider.name === 'Super.com' ? 'https://www.super.com/travel' : null);
      
      return `
      <div class="provider-card">
        <div class="provider-top">
          <div>
            <div class="provider-name">${bestProvider.provider}</div>
            <div style="font-size:.8rem;color:var(--text-light)">${item.rankingBadge}</div>
          </div>
          <span class="score-badge ${item.valueScore>=82?'top':''}">${item.valueScore}</span>
        </div>
        <div class="provider-price">€${bestProvider.total}</div>
        <div class="provider-delta ${delta<=0?'':'loss'}">${delta<=0 ? `bis zu €${Math.abs(delta)} günstiger` : `€${delta} über Direktpreis`}</div>
        ${providerUrl ? `<button class="btn btn-outline btn-sm" style="width:100%;margin-top:.6rem" onclick="window.open('${providerUrl}','_blank')">${bestProvider.name === 'Super.com' ? 'Super.com öffnen' : 'Anbieter öffnen'} ↗</button>` : ''}
      </div>`;
    });
    container.innerHTML = groups.join('');
  }

  function renderInsights(containerId, items, config){
    const container = document.getElementById(containerId);
    if(!container) return;
    if(!items.length){ container.innerHTML=''; return; }
    const cheapest = items.reduce((best, item)=>item[config.priceKey] < best[config.priceKey] ? item : best, items[0]);
    const bestValue = items.reduce((best, item)=>item.valueScore > best.valueScore ? item : best, items[0]);
    const avgPrice = Math.round(items.reduce((sum, item)=>sum + item[config.priceKey], 0) / items.length);
    container.innerHTML = [
      {label:'Beste Value-Wahl', value:`${bestValue.valueScore}/100`, sub:`${config.bestLabel(bestValue)}`},
      {label:'Niedrigster Preis', value:`€${cheapest[config.priceKey]}`, sub:`${config.cheapestLabel(cheapest)}`},
      {label:'Durchschnitt', value:`€${avgPrice}`, sub:config.avgText},
      {label:'Mögliche Ersparnis', value:`€${Math.max(...items.map(i=>i.savings||0))}`, sub:'über alternative Provider'}
    ].map(card=>`
    <div class="insight-card">
      <div class="insight-label">${card.label}</div>
      <div class="insight-value">${card.value}</div>
      <div class="insight-sub">${card.sub}</div>
    </div>`).join('');
  }

  function renderRecommendation(containerId, title, text, item){
    const container = document.getElementById(containerId);
    if(!container) return;
    if(!item){ container.innerHTML=''; return; }
    container.innerHTML = `
    <div class="recommendation-card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:.8rem;flex-wrap:wrap">
        <div>
          <span class="match-pill">✨ ${item.matchLabel}</span>
          <h3>${title}</h3>
          <p>${text}</p>
        </div>
        <span class="score-badge ${item.valueScore>=82?'top':''}">${item.valueScore}</span>
      </div>
      <div class="meta-list">${(item.highlights||[]).map(label=>`<span>${label}</span>`).join('')}</div>
    </div>`;
  }

  function renderComparisonSection(type, list){
    const config = comparison.getComparisonConfig(type);
    if(!config || !list.length) return;
    renderRecommendation(`${type}-recommendation`, config.recommendation.title, config.recommendation.text, list[0]);
    renderProviderStrip(`${type}-provider-strip`, list, config.insights.priceKey);
    renderInsights(`${type}-insights`, list, config.insights);
  }

  global.TravelLogikInsights = {
    renderProviderStrip,
    renderComparisonSection,
    renderInsights,
    renderRecommendation
  };
})(window);
