(function(global){
  'use strict';

  const PACK_CATEGORIES = {
    '📄 Dokumente': {
      base: ['Reisepass / Personalausweis','Flugtickets (Ausdruck)','Hotelvoucher','Krankenversicherungskarte','Reiseversicherung','Impfpass','Führerschein (für Mietwagen)'],
      business: ['Visitenkarten','Laptop','Notebook'],
      family: ['Kinderreisepass','Kinderausweis'],
    },
    '👕 Kleidung': {
      warm: ['T-Shirts (×'+0+')','Shorts (×3)','Badeanzug / Badehose','Leichtes Sommerkleid / Hemd','Flip-Flops','Leichter Pullover (Abend)','Unterwäsche (×7)','Socken (×5)'],
      kalt: ['Warme Jacke','Thermounterwäsche','Pullover (×3)','Jeans (×2)','Wanderstiefel','Mütze & Handschuhe','Schal','Regenjacke'],
      berg: ['Wanderhose','Funktionsshirts','Fleecejacke','Regenjacke','Wanderstiefel','Kompressionsstrümpfe','Sonnenschutz-Shirt'],
      tropisch: ['Leichte Kleidung (×5)','Regen-Poncho','Badekleidung (×2)','Sonnenschutz-Kleidung'],
      mild: ['Hosen (×2)','T-Shirts (×4)','Leichte Jacke','Sneakers','Kleine Regenjacke'],
      base: [],
      aktiv: ['Sportbekleidung (×3)','Sportschuhe','Schwimmbekleidung'],
      kultur: ['Schicker Ausgehoutfit'],
      business: ['Anzug / Businesskleid','Krawatte / Schal','Formelle Schuhe'],
      family: ['Kinderbekleidung (×5)','Babybody (×5)'],
      relax: ['Strandkleid','Kaftan / Pareo'],
    },
    '🧴 Hygiene & Gesundheit': {
      base: ['Zahnbürste & Zahnpasta','Shampoo & Duschgel','Deodorant','Rasierer / Damenrasierer','Haarbürste','Sonnencreme LSF 50+','Lippenschutz','Pflaster & Wundspray','Schmerzmittel','Durchfallmittel','Antihistaminika','Verhütungsmittel'],
      tropisch: ['Mückenschutz DEET 30%+','Malaria-Prophylaxe','Reiseapotheke erweitert','Durchfall-Elektrolyte'],
      kalt: ['Lippenpflegestift','Körperlotion'],
      berg: ['Sonnencreme LSF 50+ (Höhe)','Blasenpflaster','Muskelgel'],
    },
    '📱 Elektronik': {
      base: ['Smartphone + Ladekabel','Powerbank','Reiseadapter','Kopfhörer','Kreditkarte (Ausland)'],
      business: ['Laptop + Netzteil','Maus','Präsentations-Adapter','Ladekabel USB-C'],
      aktiv: ['Action-Kamera (GoPro)','Halterung'],
      base2: ['Kamera + Speicherkarte'],
    },
    '🎒 Diverses': {
      base: ['Reisekissen (Flug)','Schlafmaske','Ohrstöpsel','Kleines Schloss (Koffer)','Wäschebeutel','Trinkflasche','Buch / E-Reader','Snacks für die Reise'],
      strand: ['Strandtasche','Schnorchelset','Wasserdichte Tasche'],
      berg: ['Wanderstöcke','Kompass','Headlamp'],
      family: ['Schnuller','Babynahrung','Spielzeug','Reisebett'],
    },
    '💊 Medizin': {
      base: ['Fieberthermometer','Ibuprofen','Magenmittel','Desinfektionsmittel','Verbandsmaterial','Einmalhandschuhe'],
      tropisch: ['Malaria-Medikament','Reisekrankheitstabletten','Rehydrations-Salze'],
    },
  };

  const runtime = {
    setTrip: ()=>{},
    markDone: ()=>{}
  };

  function configureTravelPacklist(options = {}){
    if(typeof options.setTrip === 'function') runtime.setTrip = options.setTrip;
    if(typeof options.markDone === 'function') runtime.markDone = options.markDone;
  }

  function generatePacklist(){
    const dest = document.getElementById('pl-dest')?.value || 'Reiseziel';
    const klima = document.getElementById('pl-klima')?.value;
    const style = document.getElementById('pl-style')?.value;
    const days = parseInt(document.getElementById('pl-days')?.value) || 7;
    const titleEl = document.getElementById('pl-title');
    if(titleEl) titleEl.textContent = `Packliste – ${dest} (${days} Tage)`;

    const categories = [];
    for(const [categoryName, data] of Object.entries(PACK_CATEGORIES)){
      let items = [...(data.base || []), ...(data.base2 || [])];
      if(data[klima]) items = [...items, ...data[klima]];
      if(data[style]) items = [...items, ...data[style]];
      items = items.map(item=>item.replace('×' + 0, '×' + Math.ceil(days / 2)));
      items = [...new Set(items)];
      if(items.length > 0) categories.push({name: categoryName, items});
    }

    let html = '';
    categories.forEach((category, categoryIndex) => {
      html += `<div class="pack-category">
        <div class="pack-cat-header" onclick="togglePackCat(this)">
          <span>${category.name}</span>
          <span class="pack-cat-progress" id="prog-${categoryIndex}">0/${category.items.length}</span>
          <span>▼</span>
        </div>
        <div class="pack-items" id="cat-body-${categoryIndex}">
          ${category.items.map((item, itemIndex) => `
            <div class="pack-item" id="pi-${categoryIndex}-${itemIndex}">
              <input type="checkbox" id="cb-${categoryIndex}-${itemIndex}" onchange="updatePackProgress(${categoryIndex},${category.items.length})">
              <label for="cb-${categoryIndex}-${itemIndex}">${item}</label>
              <button class="del-item" onclick="delPackItem('pi-${categoryIndex}-${itemIndex}')">✕</button>
            </div>`).join('')}
          <div class="pack-add-row">
            <input type="text" placeholder="Eigenen Artikel hinzufügen..." style="flex:1;font-size:.83rem;padding:.35rem .6rem;border:1.5px solid var(--border);border-radius:6px" id="padd-${categoryIndex}">
            <button class="btn btn-outline btn-sm" onclick="addPackItem(${categoryIndex})">+</button>
          </div>
        </div>
      </div>`;
    });

    const categoriesEl = document.getElementById('pl-categories');
    if(categoriesEl) categoriesEl.innerHTML = html;
    const containerEl = document.getElementById('packlist-container');
    if(containerEl) containerEl.style.display = 'block';
    updateTotalPackProgress();
    runtime.setTrip({destination: dest});
    runtime.markDone('packlist');
  }

  function togglePackCat(el){
    const body = el.nextElementSibling;
    if(body) body.style.display = body.style.display === 'none' ? '' : 'none';
  }

  function refreshCategoryProgress(){
    document.querySelectorAll('[id^="cat-body-"]').forEach(categoryBody => {
      const categoryIndex = categoryBody.id.replace('cat-body-', '');
      const checked = categoryBody.querySelectorAll('input[type=checkbox]:checked').length;
      const all = categoryBody.querySelectorAll('input[type=checkbox]').length;
      const progressEl = document.getElementById(`prog-${categoryIndex}`);
      if(progressEl) progressEl.textContent = `${checked}/${all}`;
    });
  }

  function delPackItem(id){
    document.getElementById(id)?.remove();
    refreshCategoryProgress();
    updateTotalPackProgress();
  }

  function addPackItem(categoryIndex){
    const input = document.getElementById(`padd-${categoryIndex}`);
    if(!input?.value.trim()) return;
    const itemsEl = document.getElementById(`cat-body-${categoryIndex}`);
    const addRow = itemsEl?.querySelector('.pack-add-row');
    if(!itemsEl || !addRow) return;

    const uid = Date.now();
    const item = document.createElement('div');
    item.className = 'pack-item';
    item.id = 'pi-custom-' + uid;
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `cb-c-${uid}`;
    checkbox.setAttribute('onchange', 'updateTotalPackProgress()');
    const label = document.createElement('label');
    label.setAttribute('for', `cb-c-${uid}`);
    label.textContent = input.value;
    const removeButton = document.createElement('button');
    removeButton.className = 'del-item';
    removeButton.setAttribute('onclick', `delPackItem('pi-custom-${uid}')`);
    removeButton.textContent = '✕';
    item.appendChild(checkbox);
    item.appendChild(label);
    item.appendChild(removeButton);
    itemsEl.insertBefore(item, addRow);
    input.value = '';
    refreshCategoryProgress();
    updateTotalPackProgress();
  }

  function updatePackProgress(categoryIndex){
    const checked = document.querySelectorAll(`#cat-body-${categoryIndex} input[type=checkbox]:checked`).length;
    const all = document.querySelectorAll(`#cat-body-${categoryIndex} input[type=checkbox]`).length;
    const progressEl = document.getElementById(`prog-${categoryIndex}`);
    if(progressEl) progressEl.textContent = `${checked}/${all}`;

    document.querySelectorAll('#pl-categories .pack-item').forEach(item => {
      const checkbox = item.querySelector('input[type=checkbox]');
      if(checkbox?.checked) item.classList.add('checked');
      else item.classList.remove('checked');
    });

    updateTotalPackProgress();
  }

  function updateTotalPackProgress(){
    refreshCategoryProgress();
    const all = document.querySelectorAll('#pl-categories input[type=checkbox]');
    const checked = document.querySelectorAll('#pl-categories input[type=checkbox]:checked');
    const pct = all.length ? Math.round(checked.length / all.length * 100) : 0;
    const progressEl = document.getElementById('pl-progress');
    const statsEl = document.getElementById('pl-stats');
    if(progressEl) progressEl.style.width = pct + '%';
    if(statsEl) statsEl.textContent = `${checked.length} von ${all.length} gepackt (${pct}%)`;
  }

  function checkAll(){
    document.querySelectorAll('#pl-categories input[type=checkbox]').forEach(checkbox => {
      checkbox.checked = true;
      checkbox.closest('.pack-item')?.classList.add('checked');
    });
    updateTotalPackProgress();
  }

  function uncheckAll(){
    document.querySelectorAll('#pl-categories input[type=checkbox]').forEach(checkbox => {
      checkbox.checked = false;
      checkbox.closest('.pack-item')?.classList.remove('checked');
    });
    updateTotalPackProgress();
  }

  function exportPacklist(){
    const title = document.getElementById('pl-title')?.textContent || 'Packliste';
    let text = title + '\n' + '='.repeat(40) + '\n\n';
    document.querySelectorAll('.pack-category').forEach(category => {
      text += category.querySelector('.pack-cat-header span')?.textContent || '';
      text += '\n';
      category.querySelectorAll('.pack-item label').forEach(label => {
        const checkbox = label.previousElementSibling;
        text += (checkbox?.checked ? '[✓] ' : '[ ] ') + label.textContent + '\n';
      });
      text += '\n';
    });
    const blob = new Blob([text], {type:'text/plain'});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'TravelLogik_Packliste.txt';
    link.click();
  }

  global.TravelLogikPacklist = {
    PACK_CATEGORIES,
    configureTravelPacklist,
    generatePacklist,
    togglePackCat,
    delPackItem,
    addPackItem,
    updatePackProgress,
    updateTotalPackProgress,
    checkAll,
    uncheckAll,
    exportPacklist
  };

  global.generatePacklist = generatePacklist;
  global.togglePackCat = togglePackCat;
  global.delPackItem = delPackItem;
  global.addPackItem = addPackItem;
  global.updatePackProgress = updatePackProgress;
  global.updateTotalPackProgress = updateTotalPackProgress;
  global.checkAll = checkAll;
  global.uncheckAll = uncheckAll;
  global.exportPacklist = exportPacklist;
})(window);
