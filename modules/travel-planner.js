(function(global){
  'use strict';

  const ACTIVITIES = {
    'Kultur & Geschichte': [
      ['09:00','Stadtführung & historische Altstadt'],['11:30','Besuch Nationalmuseum'],
      ['14:00','Mittagessen – lokale Küche'],['15:30','Schloss / Kathedrale Besichtigung'],
      ['18:00','Abendessen in der Altstadt'],['20:30','Kulturveranstaltung / Theater'],
    ],
    'Strand & Entspannung': [
      ['09:00','Frühstück am Hotel'],['10:00','Strandtag – Liegestuhl & Meer'],
      ['13:00','Strandrestaurant – frische Meeresfrüchte'],['15:00','Wassersport oder Bootstour'],
      ['18:00','Sonnenuntergang am Strand'],['20:00','Abendessen Strandpromenade'],
    ],
    'Abenteuer & Sport': [
      ['07:00','Früher Start – Wanderung/Trek'],['10:30','Aussichtspunkt & Pause'],
      ['13:00','Picknick in der Natur'],['15:00','Klettern / Radtour / Kajak'],
      ['18:30','Erholung & Abendessen'],['20:00','Reisetagebuch schreiben'],
    ],
    'Kulinarik & Lifestyle': [
      ['10:00','Marktbesuch & lokale Produkte'],['12:00','Mittagessen im Gourmetrestaurant'],
      ['14:30','Kochkurs – regionale Spezialitäten'],['17:00','Weinprobe / Degustationsmenü'],
      ['20:00','Fine Dining – Restaurantreservierung'],['22:00','Bar & Nachtleben erkunden'],
    ],
    'Städtetrip & Shopping': [
      ['09:30','Frühstück im Trendcafé'],['10:30','Einkaufsviertel erkunden'],
      ['13:00','Lunch & Stadtbummel'],['15:00','Design-Museen & Galerien'],
      ['17:30','Boutiquen & lokale Designer'],['20:00','Trendiges Abendrestaurant'],
    ],
  };

  const WEATHER_ICONS = ['☀️','🌤️','⛅','🌥️','🌦️'];
  const TIPS = {
    'Kultur & Geschichte':['📸 Museumspässe kaufen – oft 20-30% günstiger','🕐 Früh aufstehen – Sehenswürdigkeiten ohne Massen','📚 Lokalen Reiseführer in der Bibliothek ausleihen'],
    'Strand & Entspannung':['🧴 Sonnenschutz LSF 50+ nicht vergessen','🏖️ Strand-Equipment früh morgens reservieren','🐠 Schnorchelausrüstung vor Ort günstiger leihen'],
    'Abenteuer & Sport':['🥾 Festes Schuhwerk unbedingt mitnehmen','💧 Mindestens 2L Wasser pro Tag mitnehmen','📱 Offline-Karten herunterladen (maps.me)'],
    'Kulinarik & Lifestyle':['🍽️ Restaurants vorab reservieren','🛒 Markt: Dienstag/Samstag meist frischste Ware','🥂 Weinprobe: Weingüter direkt kontaktieren'],
    'Städtetrip & Shopping':['🚇 ÖPNV-Tageskarte kaufen spart viel','🏪 Samstags früh – Wochenmärkte der Einheimischen','💳 Kreditkarte mit 0% Auslandsgebühr nutzen'],
  };

  const runtime = {
    setTrip:()=>{},
    markDone:()=>{}
  };

  function configureTravelPlanner(options = {}){
    if(typeof options.setTrip === 'function') runtime.setTrip = options.setTrip;
    if(typeof options.markDone === 'function') runtime.markDone = options.markDone;
  }

  function renderPlannerWeather(from, days){
    const weatherEl = document.getElementById('weather-widget');
    if(!weatherEl) return;
    const weekdays = ['So','Mo','Di','Mi','Do','Fr','Sa'];
    let html = '';
    for(let i = 0; i < Math.min(days, 7); i++){
      const date = new Date(from);
      date.setDate(date.getDate() + i);
      const temp = 18 + Math.floor(Math.random() * 12);
      html += `<div class="weather-day"><div class="weather-icon">${WEATHER_ICONS[Math.floor(Math.random() * WEATHER_ICONS.length)]}</div><div class="weather-temp">${temp}°C</div><div class="weather-label">${weekdays[date.getDay()]}</div></div>`;
    }
    weatherEl.innerHTML = html;
  }

  function renderPlannerDays(from, days, style){
    const activities = ACTIVITIES[style] || ACTIVITIES['Kultur & Geschichte'];
    const daysEl = document.getElementById('itinerary-days');
    if(!daysEl) return;

    let html = '';
    for(let i = 0; i < days; i++){
      const date = new Date(from);
      date.setDate(date.getDate() + i);
      const dateStr = date.toLocaleDateString('de-DE', {weekday:'long', day:'numeric', month:'long'});
      html += `<div class="day-block">
        <div class="day-header" onclick="toggleDay(this)">
          <span class="day-title">Tag ${i + 1} – ${dateStr}</span>
          <span>▼</span>
        </div>
        <div class="activity-list">
          ${activities.map(activity=>`<div class="activity-item">
            <div class="activity-time">${activity[0]}</div>
            <div><div class="activity-name">${activity[1]}</div></div>
          </div>`).join('')}
          <div class="add-activity">
            <input type="text" placeholder="Aktivität hinzufügen..." style="flex:1;font-size:.85rem;padding:.4rem .7rem">
            <button class="btn btn-outline btn-sm" onclick="addActivity(this)">+ Add</button>
          </div>
        </div>
      </div>`;
    }
    daysEl.innerHTML = html;
  }

  function renderPlannerTips(style){
    const tipsEl = document.getElementById('travel-tips');
    if(!tipsEl) return;
    const tips = TIPS[style] || [];
    tipsEl.innerHTML = tips.map(tip=>`<div style="padding:.4rem 0;border-bottom:1px solid var(--border);font-size:.9rem">${tip}</div>`).join('');
  }

  function generateItinerary(){
    const dest = document.getElementById('p-dest')?.value || '';
    if(!dest.trim()){
      alert('Bitte Reiseziel eingeben');
      return;
    }
    const from = document.getElementById('p-from')?.value || '';
    const to = document.getElementById('p-to')?.value || '';
    const style = document.getElementById('p-style')?.value || 'Kultur & Geschichte';
    if(!from || !to){
      alert('Bitte Reisedaten eingeben');
      return;
    }

    const daysRaw = Math.round((new Date(to) - new Date(from)) / 86400000);
    if(!Number.isFinite(daysRaw) || daysRaw <= 0){
      alert('Bitte gültige Reisedaten mit mindestens einem Reisetag eingeben');
      return;
    }
    const days = Math.max(1, daysRaw);
    const titleEl = document.getElementById('p-title');
    if(titleEl) titleEl.textContent = `${dest} · ${days} Tage · ${style}`;

    renderPlannerWeather(from, days);
    renderPlannerDays(from, days, style);
    renderPlannerTips(style);

    const itineraryEl = document.getElementById('itinerary-container');
    if(itineraryEl) itineraryEl.style.display = 'block';
    runtime.setTrip({destination: dest, depDate: from, retDate: to});
    runtime.markDone('planner');
  }

  function toggleDay(el){
    const body = el.nextElementSibling;
    if(body) body.style.display = body.style.display === 'none' ? 'block' : 'none';
  }

  function addActivity(btn){
    const input = btn.previousElementSibling;
    if(!input?.value.trim()) return;
    const item = document.createElement('div');
    item.className = 'activity-item';
    const time = document.createElement('div');
    time.className = 'activity-time';
    time.textContent = '–';
    const wrapper = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'activity-name';
    name.textContent = input.value;
    wrapper.appendChild(name);
    item.appendChild(time);
    item.appendChild(wrapper);
    btn.parentElement.insertAdjacentElement('beforebegin', item);
    input.value = '';
  }

  function exportPlan(){
    const dest = document.getElementById('p-dest')?.value || 'Reiseplan';
    const content = document.getElementById('itinerary-container')?.innerText || '';
    const blob = new Blob([content], {type:'text/plain'});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `TravelLogik_${dest}_Reiseplan.txt`;
    link.click();
  }

  global.TravelLogikPlanner = {
    configureTravelPlanner,
    generateItinerary,
    toggleDay,
    addActivity,
    exportPlan
  };

  global.generateItinerary = generateItinerary;
  global.toggleDay = toggleDay;
  global.addActivity = addActivity;
  global.exportPlan = exportPlan;
})(window);
