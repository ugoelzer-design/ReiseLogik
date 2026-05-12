(function(global){
  'use strict';

  const DAY_MS = 86400000;
  const BUD_CATS = [
    {icon:'✈️',name:'Flüge',key:'flight',hint:'Hin- & Rückflug gesamt'},
    {icon:'🏨',name:'Unterkunft',key:'hotel',hint:'Hotel / Ferienwohnung'},
    {icon:'🚗',name:'Mietwagen / Transfer',key:'car',hint:'Alle Transporte vor Ort'},
    {icon:'🍽️',name:'Essen & Trinken',key:'food',hint:'Pro Tag × Reisetage'},
    {icon:'🎡',name:'Aktivitäten',key:'activity',hint:'Ausflüge, Eintritte'},
    {icon:'🛍️',name:'Shopping & Souvenirs',key:'shopping',hint:''},
    {icon:'🛡️',name:'Versicherung',key:'insurance',hint:'Reise- & Krankenversicherung'},
    {icon:'📋',name:'Diverses',key:'misc',hint:'Trinkgeld, unvorhergesehen'},
  ];

  const runtime = {
    ids: {
      from: 'bud-from',
      to: 'bud-to',
      pax: 'bud-pax',
      level: 'bud-level',
      total: 'bud-total',
      dest: 'bud-dest',
      rows: 'bud-rows',
      sum: 'bud-sum',
      kpiTotal: 'bud-kpi-total',
      kpiUsed: 'bud-kpi-used',
      kpiRest: 'bud-kpi-rest',
      kpiRestBox: 'bud-kpi-rest-box',
      tips: 'bud-tips',
      tipsCard: 'bud-tips-card'
    }
  };

  function configureTravelBudget(options = {}){
    if(options.ids && typeof options.ids === 'object'){
      runtime.ids = {...runtime.ids, ...options.ids};
    }
  }

  function getNode(key){
    return document.getElementById(runtime.ids[key]);
  }

  function seedBudgetDates(){
    const fromEl = getNode('from');
    const toEl = getNode('to');
    if(!fromEl || !toEl) return;

    const today = new Date();
    const fmt = d => d.toISOString().split('T')[0];
    const add = (d, n) => {
      const next = new Date(d);
      next.setDate(next.getDate() + n);
      return next;
    };

    fromEl.value = fmt(add(today, 30));
    toEl.value = fmt(add(today, 37));
  }

  function getDays(){
    const from = getNode('from')?.value;
    const to = getNode('to')?.value;
    if(!from || !to) return 7;
    return Math.max(1, Math.round((new Date(to) - new Date(from)) / DAY_MS));
  }

  function getPax(){
    return parseInt(getNode('pax')?.value) || 2;
  }

  function getLevel(){
    return parseFloat(getNode('level')?.value) || 1.5;
  }

  function getBudgetDefaults(){
    const days = getDays();
    const pax = getPax();
    const level = getLevel();
    return {
      flight: Math.round(180 * pax * level),
      hotel: Math.round(90 * days * level),
      car: Math.round(45 * days * level),
      food: Math.round(40 * days * pax * level),
      activity: Math.round(30 * days * pax * level),
      shopping: Math.round(50 * pax),
      insurance: Math.round(25 * pax),
      misc: Math.round(20 * days * pax),
    };
  }

  function isCategoryOverBudget(value, total){
    return total > 0 && value > total;
  }

  function updateBudget(){
    const total = parseInt(getNode('total')?.value) || 3000;
    const defaults = getBudgetDefaults();
    const destination = getNode('dest')?.value;
    const totalEl = getNode('kpiTotal');
    const rowsEl = getNode('rows');
    if(totalEl) totalEl.textContent = '€' + total.toLocaleString('de-DE');
    if(!rowsEl) return;

    rowsEl.innerHTML = BUD_CATS.map(category => {
      const value = defaults[category.key] || 0;
      const pct = Math.min(100, Math.round(value / total * 100));
      return `<div class="budget-row">
        <div class="budget-cat-icon">${category.icon}</div>
        <div class="budget-cat-name">${category.name}<div style="font-size:.74rem;color:var(--muted)">${category.hint}</div></div>
        <div class="budget-bar-wrap">
          <div class="budget-bar"><div class="budget-bar-fill ${isCategoryOverBudget(value, total)?'over':''}" id="bbar-${category.key}" style="width:${pct}%"></div></div>
        </div>
        <input class="budget-input" type="number" id="binp-${category.key}" value="${value}" oninput="recalcBudget(${total})">
      </div>`;
    }).join('');

    recalcBudget(total);

    if(destination){
      const destLower = destination.toLowerCase();
      let livingCostHint = '';
      
      if(/(schweiz|norwegen|island|usa|new york|london|kopenhagen|singapur|dubai)/.test(destLower)){
        livingCostHint = '⚠️ **Hohe Lebenshaltungskosten:** Planen Sie ca. 50-80% mehr Budget für Verpflegung und Aktivitäten ein als im EU-Schnitt.';
      } else if(/(thailand|bali|vietnam|indonesien|türkei|bulgarien|georgien|marokko)/.test(destLower)){
        livingCostHint = '✅ **Günstige Lebenshaltungskosten:** Lokales Essen und Transport sind oft sehr preiswert (ca. 40-60% unter EU-Niveau).';
      } else {
        livingCostHint = 'ℹ️ **Moderate Lebenshaltungskosten:** Die Preise für Verpflegung entsprechen weitgehend dem westeuropäischen Durchschnitt.';
      }

      const tips = [
        livingCostHint,
        `🏷️ Hotels in ${destination} frühzeitig buchen (3+ Monate) spart bis zu 30%`,
        '🍴 Mittagessen in lokalen Restaurants statt Touristenmeile – Hälfte des Preises',
        '🚌 Öffentliche Verkehrsmittel statt Taxi nutzen',
        '🎟️ Museumspässe & City-Cards kaufen – oft 20-40% günstiger',
      ];
      const tipsEl = getNode('tips');
      const tipsCardEl = getNode('tipsCard');
      if(tipsEl){
        tipsEl.innerHTML = tips.map(tip=>{
          const formatted = tip.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
          return `<div style="padding:.4rem 0;border-bottom:1px solid var(--border);font-size:.88rem">${formatted}</div>`;
        }).join('');
      }
      if(tipsCardEl){
        tipsCardEl.style.display = 'block';
      }
    } else {
      const tipsEl = getNode('tips');
      const tipsCardEl = getNode('tipsCard');
      if(tipsEl) tipsEl.innerHTML = '';
      if(tipsCardEl) tipsCardEl.style.display = 'none';
    }
  }

  function recalcBudget(total){
    let sum = 0;
    BUD_CATS.forEach(category => {
      const value = parseInt(document.getElementById('binp-' + category.key)?.value) || 0;
      sum += value;
      const pct = Math.min(100, Math.round(value / (total || 1) * 100));
      const bar = document.getElementById('bbar-' + category.key);
      if(bar){
        bar.style.width = pct + '%';
        bar.className = 'budget-bar-fill ' + (isCategoryOverBudget(value, total) ? 'over' : '');
      }
    });

    const sumText = '€' + sum.toLocaleString('de-DE');
    const sumEl = getNode('sum');
    const usedEl = getNode('kpiUsed');
    if(sumEl) sumEl.textContent = sumText;
    if(usedEl) usedEl.textContent = sumText;

    const rest = total - sum;
    const restEl = getNode('kpiRest');
    if(restEl){
      restEl.textContent = (rest >= 0 ? '€' : '−€') + Math.abs(rest).toLocaleString('de-DE');
    }

    const restBoxEl = getNode('kpiRestBox');
    if(restBoxEl){
      restBoxEl.className = 'budget-kpi ' + (rest < 0 ? 'over' : 'ok');
    }
  }

  function syncBudgetFromBookings(bookings = []){
    const activeBookings = bookings.filter(b => b.status !== 'cancelled');
    const costs = {
      flight: 0,
      hotel: 0,
      car: 0,
      activity: 0
    };

    activeBookings.forEach(booking => {
      const type = booking.type === 'transfer' ? 'car' : booking.type;
      if(costs.hasOwnProperty(type)){
        costs[type] += (booking.total || 0);
      }
    });

    // Update inputs if they exist
    let changed = false;
    Object.keys(costs).forEach(key => {
      const input = document.getElementById('binp-' + key);
      if(input && costs[key] > 0){
        input.value = Math.round(costs[key]);
        changed = true;
      }
    });

    if(changed){
      const total = parseInt(getNode('total')?.value) || 3000;
      recalcBudget(total);
    }
  }

  function clearBudget(){
    const defaults = getBudgetDefaults();
    Object.keys(defaults).forEach(key => {
      const input = document.getElementById('binp-' + key);
      if(input) input.value = defaults[key];
    });
    const total = parseInt(getNode('total')?.value) || 3000;
    recalcBudget(total);
  }

  document.addEventListener('DOMContentLoaded', () => {
    seedBudgetDates();
    updateBudget();
  });

  global.TravelLogikBudget = {
    BUD_CATS,
    configureTravelBudget,
    getDays,
    getPax,
    getLevel,
    getBudgetDefaults,
    updateBudget,
    recalcBudget,
    syncBudgetFromBookings,
    clearBudget
  };

  global.updateBudget = updateBudget;
  global.recalcBudget = recalcBudget;
})(window);
