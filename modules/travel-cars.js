(function(global){
  'use strict';

  const CAR_TEMPLATES = [
    {name:'VW Polo o.ä.',class:'Klein',emoji:'🚗',seats:5,bags:1,ac:true,transmission:'Automatik',provider:'Sixt',price:28},
    {name:'Toyota Yaris o.ä.',class:'Klein',emoji:'🚙',seats:5,bags:1,ac:true,transmission:'Manuell',provider:'Europcar',price:22},
    {name:'VW Golf o.ä.',class:'Mittelklasse',emoji:'🚘',seats:5,bags:2,ac:true,transmission:'Automatik',provider:'Hertz',price:45},
    {name:'BMW 3er o.ä.',class:'Mittelklasse',emoji:'🏎️',seats:5,bags:2,ac:true,transmission:'Automatik',provider:'Avis',price:58},
    {name:'Ford Kuga o.ä.',class:'SUV',emoji:'🚐',seats:5,bags:4,ac:true,transmission:'Automatik',provider:'Budget',price:65},
    {name:'Mercedes GLE o.ä.',class:'SUV',emoji:'🛻',seats:7,bags:5,ac:true,transmission:'Automatik',provider:'Sixt',price:89},
    {name:'Tesla Model 3',class:'Elektro',emoji:'⚡',seats:5,bags:3,ac:true,transmission:'Automatik',provider:'Europcar',price:75},
    {name:'BMW 7er o.ä.',class:'Luxus',emoji:'🚀',seats:5,bags:3,ac:true,transmission:'Automatik',provider:'Hertz',price:120}
  ];

  const runtime = {
    createProviderAdapter:null,
    runSearchPipeline:null,
    renderCars:()=>{},
    getCarData:()=>[],
    setCarData:()=>{}
  };

  let carSearchAdapter = null;

  function configureTravelCars(options = {}){
    if(typeof options.createProviderAdapter === 'function') runtime.createProviderAdapter = options.createProviderAdapter;
    if(typeof options.runSearchPipeline === 'function') runtime.runSearchPipeline = options.runSearchPipeline;
    if(typeof options.renderCars === 'function') runtime.renderCars = options.renderCars;
    if(typeof options.getCarData === 'function') runtime.getCarData = options.getCarData;
    if(typeof options.setCarData === 'function') runtime.setCarData = options.setCarData;
  }

  function buildTemplateCars(params){
    return CAR_TEMPLATES
      .filter(car=>params.classFilter === 'Alle Klassen' || car.class === params.classFilter.split(' ')[0])
      .map((car, index)=>({
        ...car,
        id:`C${Date.now()}${index}`,
        pickup:params.pickup,
        days:params.days,
        total:car.price * params.days,
        freeCancellation:Math.random() > 0.4
      }));
  }

  function ensureCarSearchAdapter(){
    if(carSearchAdapter) return carSearchAdapter;
    if(typeof runtime.createProviderAdapter !== 'function'){
      throw new Error('Travel cars runtime is not configured.');
    }

    carSearchAdapter = runtime.createProviderAdapter('car', {
      source:'local-car-templates',
      async search(params){
        return buildTemplateCars(params);
      }
    });

    return carSearchAdapter;
  }

  async function searchCars(){
    const pickup = document.getElementById('c-pickup').value;
    if(!pickup.trim()){
      global.alert('Bitte Abholort eingeben');
      return;
    }

    const from = document.getElementById('c-from').value;
    const to = document.getElementById('c-to').value;
    if(!from || !to){
      global.alert('Bitte Abhol- und Rückgabedatum auswählen');
      return;
    }
    const rawDays = Math.round((new Date(to) - new Date(from)) / 86400000);
    if(!Number.isFinite(rawDays) || rawDays <= 0){
      global.alert('Bitte gültige Mietdaten mit mindestens einem Tag auswählen');
      return;
    }
    const days = Math.max(1, rawDays);
    const classFilter = document.getElementById('c-class').value;
    const loader = document.getElementById('c-loader');
    const results = document.getElementById('car-results');
    const list = document.getElementById('c-list');

    results.style.display = 'none';
    loader.classList.add('show');

    global.setTimeout(async ()=>{
      try {
        const data = await runtime.runSearchPipeline('car', ensureCarSearchAdapter(), {
          pickup,
          from,
          to,
          days,
          classFilter
        });
        runtime.setCarData(data);
        results.style.display = 'block';
        runtime.renderCars();
      } catch(error){
        results.style.display = 'block';
        if(list){
          list.innerHTML = `<div class="card" style="padding:1rem;border:1px solid #f5c6cb;background:#fdf2f2;color:#721c24">Mietwagensuche fehlgeschlagen: ${error.message || 'Unbekannter Fehler'}</div>`;
        }
      } finally {
        loader.classList.remove('show');
      }
    }, 900);
  }

  global.TravelLogikCars = {
    configureTravelCars,
    searchCars
  };

  global.searchCars = searchCars;
})(window);
