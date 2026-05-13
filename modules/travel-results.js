(function(global){
  'use strict';

  const hotelReadiness = global.TravelLogikHotelReadiness || {};
  const buildHotelReadinessCopy = typeof hotelReadiness.buildHotelReadinessCopy === 'function'
    ? hotelReadiness.buildHotelReadinessCopy
    : ()=>({badgeTone:'demo', headline:'Demo', body:'Hoteldaten sind lokal vorbereitet.'});
  const isHotelActuallyBookable = typeof hotelReadiness.isHotelActuallyBookable === 'function'
    ? hotelReadiness.isHotelActuallyBookable
    : ()=>false;

  const runtime = {
    getFlights:()=>[],
    getHotels:()=>[],
    setHotels:()=>{},
    getCars:()=>[],
    getAccommodationType:()=>({type:'lodging'}),
    getHotelSearchContext:()=>({checkin:'', checkout:'', guests:2}),
    getHotelHandoffSummary:()=>null,
    getBestProviderLabel:()=> 'Anbieter',
    renderComparisonSection:()=>{},
    openBooking:(type, item)=>global.openBooking?.(type, item),
    handoffHotelBooking:(item, url)=>global.startHotelHandoff?.(item, url)
  };
  let expandedHotelId = null;

  function configureTravelResults(options = {}){
    if(typeof options.getFlights === 'function') runtime.getFlights = options.getFlights;
    if(typeof options.getHotels === 'function') runtime.getHotels = options.getHotels;
    if(typeof options.setHotels === 'function') runtime.setHotels = options.setHotels;
    if(typeof options.getCars === 'function') runtime.getCars = options.getCars;
    if(typeof options.getAccommodationType === 'function') runtime.getAccommodationType = options.getAccommodationType;
    if(typeof options.getHotelSearchContext === 'function') runtime.getHotelSearchContext = options.getHotelSearchContext;
    if(typeof options.getHotelHandoffSummary === 'function') runtime.getHotelHandoffSummary = options.getHotelHandoffSummary;
    if(typeof options.getBestProviderLabel === 'function') runtime.getBestProviderLabel = options.getBestProviderLabel;
    if(typeof options.renderComparisonSection === 'function') runtime.renderComparisonSection = options.renderComparisonSection;
    if(typeof options.openBooking === 'function') runtime.openBooking = options.openBooking;
    if(typeof options.handoffHotelBooking === 'function') runtime.handoffHotelBooking = options.handoffHotelBooking;
  }

  function escapeHtml(value){
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function safeExternalUrl(url){
    if(typeof url !== 'string') return '#';
    const trimmed = url.trim();
    return /^https?:\/\//i.test(trimmed) ? trimmed : '#';
  }

  function getHotelExternalBookingUrl(hotel){
    const directUrl = hotel?.bookingUrl || hotel?.handoffUrl || hotel?.providerDeeplink || hotel?.url || hotel?.deepLink || '';
    const safeDirectUrl = safeExternalUrl(directUrl);
    if(safeDirectUrl !== '#') return safeDirectUrl;
    const destination = hotel?.dest || hotel?.address || hotel?.name || '';
    return safeExternalUrl(`https://www.booking.com/searchresults.de.html?ss=${encodeURIComponent(destination)}`);
  }

  function getHotelExternalBookingLabel(url){
    return /booking\.com/i.test(url || '') ? 'Booking.com pruefen' : 'Extern pruefen';
  }

  function buildGoogleSearchUrl(query){
    return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  }

  function buildGoogleFlightsUrl(flight){
    const query = [
      'Google Flights',
      flight?.from ? `von ${flight.from}` : '',
      flight?.to ? `nach ${flight.to}` : '',
      flight?.dep ? `am ${flight.dep}` : '',
      flight?.airline?.name || ''
    ].filter(Boolean).join(' ');
    return buildGoogleSearchUrl(query);
  }

  function buildGoogleHotelsUrl(hotel, context = {}){
    const query = [
      'Google Hotels',
      hotel?.name || hotel?.dest || hotel?.address || '',
      context.checkin && context.checkout ? `${context.checkin} bis ${context.checkout}` : '',
      context.guests ? `${context.guests} Gaeste` : ''
    ].filter(Boolean).join(' ');
    return buildGoogleSearchUrl(query);
  }

  function buildGoogleCarsUrl(car){
    const query = [
      'Mietwagen',
      car?.pickup || '',
      car?.class || '',
      car?.provider || ''
    ].filter(Boolean).join(' ');
    return buildGoogleSearchUrl(query);
  }

  function serializeInlineItem(item){
    return JSON.stringify(item).replace(/"/g, '&quot;');
  }

  function formatDate(value){
    if(!value) return '';
    const date = new Date(value);
    if(Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('de-DE', {
      day:'2-digit',
      month:'2-digit'
    });
  }

  function getHotelRoomOptions(hotel){
    return Array.isArray(hotel.roomOptions) ? hotel.roomOptions : [];
  }

  function getSelectedRoomOption(hotel){
    const options = getHotelRoomOptions(hotel);
    if(!options.length) return null;
    return options.find(option=>option.id === hotel.selectedRoomOptionId) || options[0];
  }

  function buildHotelOfferForBooking(hotel){
    const selectedOption = getSelectedRoomOption(hotel);
    if(!selectedOption) return hotel;
    return {
      ...hotel,
      selectedRoomOptionId: selectedOption.id,
      roomType: selectedOption.roomType,
      rateName: selectedOption.rateName,
      board: selectedOption.board,
      breakfastIncluded: selectedOption.breakfastIncluded,
      freeCancellation: selectedOption.freeCancellation,
      partiallyRefundable: selectedOption.partiallyRefundable,
      flexibilityLabel: selectedOption.flexibilityLabel,
      cancellationLabel: selectedOption.cancellationLabel,
      roomOptionNote: selectedOption.note,
      maxGuestsPerRoom: selectedOption.maxGuestsPerRoom,
      bedding: selectedOption.bedding,
      roomSize: selectedOption.roomSize,
      roomView: selectedOption.view,
      occupancyFits: selectedOption.occupancyFits,
      recommendedRooms: selectedOption.recommendedRooms,
      occupancyLabel: selectedOption.occupancyLabel,
      pricePerNight: selectedOption.pricePerNight,
      total: selectedOption.total
    };
  }

  function selectHotelRoomOption(hotelId, optionId){
    const hotels = runtime.getHotels().slice();
    const index = hotels.findIndex(hotel=>String(hotel.offerId || hotel.id) === String(hotelId));
    if(index < 0) return;
    const hotel = hotels[index];
    if(!getHotelRoomOptions(hotel).some(option=>option.id === optionId)) return;
    hotels[index] = {
      ...hotel,
      selectedRoomOptionId: optionId
    };
    runtime.setHotels(hotels);
    renderHotels(hotels);
  }

  function toggleHotelDetails(hotelId){
    expandedHotelId = expandedHotelId === hotelId ? null : hotelId;
    renderHotels();
  }

  function renderScoreTags(tags, extraStyle = ''){
    return `<div class="score-line"${extraStyle ? ` style="${extraStyle}"` : ''}>${(tags || []).map(tag=>`<span class="score-tag">${tag}</span>`).join('')}</div>`;
  }

  function renderHotelRecommendation(list, searchContext){
    const container = document.getElementById('hotel-recommendation');
    if(!container) return;
    if(!list.length){
      container.innerHTML = '';
      return;
    }
    const top = buildHotelOfferForBooking(list[0]);
    const reason = `${escapeHtml(top.matchLabel || 'Starker Fit')} · ${escapeHtml(top.rateName || top.roomType || 'Tarif')} · ca. ${escapeHtml(String(top.pricePerNight || 0))}€ pro Nacht`;
    container.innerHTML = `
      <div class="price-summary" style="margin-top:0;margin-bottom:1rem">
        <div style="display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;flex-wrap:wrap">
          <div>
            <div class="insight-label">Empfohlene Auswahl</div>
            <div style="font-size:1.05rem;font-weight:700;color:var(--primary);margin-top:.2rem">${escapeHtml(top.name)}</div>
            <div style="font-size:.82rem;color:var(--text-light);margin-top:.25rem">${reason}</div>
            ${top.airportMinutes ? `<div style="font-size:.78rem;color:var(--text-light);margin-top:.25rem">${escapeHtml(top.airportAccessLabel || 'Flughafenbezug')} · ca. ${escapeHtml(String(top.airportMinutes))} Min bis Flughafen</div>` : ''}
          </div>
          <div style="text-align:right">
            <div class="score-badge ${top.valueScore >= 82 ? 'top' : ''}" style="margin-left:auto">${escapeHtml(String(top.valueScore || 0))}</div>
            <div style="font-size:.78rem;color:var(--text-light);margin-top:.35rem">Es werden maximal 5 passende Hoteloptionen gezeigt.</div>
          </div>
        </div>
      </div>`;
  }

  function renderHotelDetailPanel(hotel, selectedOption){
    const amenityBlocks = Array.isArray(hotel.amenityBlocks) ? hotel.amenityBlocks : [];
    const nearbySpots = Array.isArray(hotel.nearbySpots) ? hotel.nearbySpots : [];
    return `
      <div class="hotel-detail-panel">
        <div class="hotel-detail-grid">
          <div class="hotel-detail-card">
            <div class="hotel-detail-label">Aufenthalt vor Ort</div>
            <div class="hotel-detail-value">${escapeHtml(hotel.neighborhood || hotel.dest || '')}</div>
            <div class="hotel-detail-note">Check-in ab ${escapeHtml(hotel.checkInFrom || '15:00')} · Check-out bis ${escapeHtml(hotel.checkOutUntil || '11:00')} · ${escapeHtml(hotel.frontDesk || 'Rezeption vor Ort')}</div>
          </div>
          <div class="hotel-detail-card">
            <div class="hotel-detail-label">Passend fuer</div>
            <div class="hotel-detail-value">${escapeHtml(hotel.idealFor || 'Externe Hotelbuchung mit lokalem Tracking')}</div>
            <div class="hotel-detail-note">${escapeHtml(hotel.transportNote || '')}</div>
          </div>
          <div class="hotel-detail-card hotel-detail-card-wide">
            <div class="hotel-detail-label">Gewaehlter Tarif im Kontext</div>
            <div class="hotel-detail-value">${escapeHtml(selectedOption.rateName)}</div>
            <div class="hotel-detail-note">${escapeHtml(selectedOption.bedding)} · ${escapeHtml(selectedOption.roomSize)} · ${escapeHtml(selectedOption.view)} · ${escapeHtml(selectedOption.occupancyLabel)}</div>
          </div>
          <div class="hotel-detail-card hotel-detail-card-wide">
            <div class="hotel-detail-label">Lokaler Eindruck</div>
            <div class="hotel-detail-note">${escapeHtml(hotel.reviewSnippet || '')}</div>
            <div class="hotel-detail-chip-row">
              ${(hotel.localHighlights || []).map(item=>`<span class="hotel-detail-chip">${escapeHtml(item)}</span>`).join('')}
            </div>
          </div>
          <div class="hotel-detail-card hotel-detail-card-wide">
            <div class="hotel-detail-label">Rund um das Hotel</div>
            <div class="hotel-detail-note">${nearbySpots.map(spot=>escapeHtml(spot)).join(' · ') || 'Noch keine lokalen Punkte hinterlegt'}</div>
          </div>
          ${amenityBlocks.map(block=>`
            <div class="hotel-detail-card">
              <div class="hotel-detail-label">${escapeHtml(block.title)}</div>
              <div class="hotel-detail-note">${(block.items || []).map(item=>escapeHtml(item)).join(' · ')}</div>
            </div>
          `).join('')}
          <div class="hotel-detail-card hotel-detail-card-wide">
            <div class="hotel-detail-label">Buchungshinweis</div>
            <div class="hotel-detail-note">${escapeHtml(hotel.policyNote || 'Die Rate bleibt lokal nachvollziehbar, ohne Provider- oder Zahlungslogik vorzutäuschen.')}</div>
          </div>
        </div>
      </div>`;
  }

  function renderHotelSourceStatus(status){
    const container = document.getElementById('h-source-status');
    if(!container) return;
    if(!status){
      container.innerHTML = '';
      container.style.display = 'none';
      return;
    }

    const palette = status.mode === 'live'
      ? {bg:'#eafaf1', border:'#b7e4c7', text:'#1e8449'}
      : status.mode === 'fallback'
      ? {bg:'#fdf2f2', border:'#f5c6cb', text:'#a93226'}
      : {bg:'#fff8e8', border:'#f9e79f', text:'#9a7d0a'};

    container.style.display = 'block';
    container.innerHTML = `
      <div style="background:${palette.bg};border:1px solid ${palette.border};color:${palette.text};padding:.7rem .9rem;border-radius:10px;font-size:.82rem">
        <div style="display:flex;justify-content:space-between;gap:.75rem;flex-wrap:wrap">
          <strong>${status.label}</strong>
          <span>${status.detail || ''}</span>
        </div>
        <div style="margin-top:.45rem;font-size:.78rem;line-height:1.5">
          <strong>Produktstatus:</strong> Klassische Hotels sind die erste Route in Richtung echter Buchbarkeit. TravelLogik trennt jetzt sauber zwischen Demo, Live-Suche, Vorpruefung und spaeter buchbarer Provider-Strecke.
        </div>
      </div>`;
  }

  function renderHotelHandoffStatus(){
    const container = document.getElementById('hotel-handoff-status');
    if(!container) return;

    const summary = runtime.getHotelHandoffSummary?.();
    if(!summary?.count){
      container.innerHTML = '';
      container.style.display = 'none';
      return;
    }

    const detail = summary.latestName
      ? `Letzter Tracking-Fall: ${escapeHtml(summary.latestName)}${summary.latestAtLabel ? ` · ${escapeHtml(summary.latestAtLabel)}` : ''}`
      : 'Hotel extern fuer Tracking erfasst';
    const progressBits = [];
    if(summary.proposedCount) progressBits.push(`${summary.proposedCount} vorgeschlagen`);
    if(summary.openedCount) progressBits.push(`${summary.openedCount} extern geoeffnet`);
    if(summary.bookedCount) progressBits.push(`${summary.bookedCount} extern gebucht`);
    if(summary.confirmedCount) progressBits.push(`${summary.confirmedCount} extern bestaetigt`);
    const progressLine = progressBits.length
      ? `<div style="margin-top:.45rem;font-size:.78rem;line-height:1.5"><strong>Lokaler Funnel:</strong> ${progressBits.join(' · ')}</div>`
      : '';

    container.style.display = 'block';
    container.innerHTML = `
      <div style="background:#eef6ff;border:1px solid #cfe2ff;color:#1f4f82;padding:.75rem .9rem;border-radius:10px;font-size:.82rem">
        <div style="display:flex;justify-content:space-between;gap:.75rem;flex-wrap:wrap">
          <strong>${summary.count} externer Hotelfall${summary.count > 1 ? 'e' : ''} lokal gespeichert</strong>
          <span>${detail}</span>
        </div>
        <div style="margin-top:.45rem;font-size:.78rem;line-height:1.5">
          Hotels werden in TravelLogik nur fuer Reiseverlauf und Kosten-Tracking gefuehrt. Die eigentliche Buchung findet immer beim externen Anbieter statt.
        </div>
        ${progressLine}
      </div>`;
  }

  function getDisplayList(data, fallbackLoader, compareFn){
    if(Array.isArray(data)) return data.slice();
    return fallbackLoader().slice().sort(compareFn);
  }

  function renderFlights(data){
    const list = getDisplayList(data, runtime.getFlights, (a, b)=>b.valueScore - a.valueScore || a.price - b.price);
    document.getElementById('f-count').textContent = `${list.length} Flüge gefunden`;
    runtime.renderComparisonSection('flight', list);
    document.getElementById('f-list').innerHTML = list.map(f=>{
      const googleFlightsUrl = buildGoogleFlightsUrl(f);
      return `
      <div class="flight-card" onclick="openBooking('flight',${serializeInlineItem(f)})">
        <div class="flight-route">
          <div>
            <div class="flight-city">${escapeHtml(f.from)}</div>
            <div class="flight-time">${escapeHtml(f.depTime)}</div>
            <div class="flight-info">${escapeHtml(f.flightNum)}</div>
          </div>
          <div class="flight-arrow">
            <div class="flight-dur">${escapeHtml(f.duration)}</div>
            <div class="flight-line"></div>
            <div style="margin-top:.2rem">
              <span class="stops-badge ${f.stops===0?'direct':''}">${f.stops===0?'Direktflug':f.stops+' Zwischenh.'}</span>
            </div>
          </div>
          <div>
            <div class="flight-city">${escapeHtml(f.to)}</div>
            <div class="flight-time">${escapeHtml(f.arrTime)}</div>
            <div class="flight-info"><span class="airline-badge">${escapeHtml(f.airline.logo)} ${escapeHtml(f.airline.name)}</span> <span class="match-pill">${escapeHtml(f.matchLabel)}</span></div>
            ${renderScoreTags((f.highlights || []).map(escapeHtml))}
          </div>
        </div>
        <div class="flight-price">
          <div class="score-badge ${f.valueScore>=82?'top':''}" style="margin-left:auto;margin-bottom:.35rem">${f.valueScore}</div>
          <div class="amount">€${f.price}</div>
          <div class="per">pro Person</div>
          <div style="font-size:.76rem;color:var(--success);margin-top:.2rem">${f.savings ? `bis zu €${f.savings} günstiger via ${runtime.getBestProviderLabel(f)}` : 'Direktpreis ist Bestpreis'}</div>
          <button class="btn btn-primary btn-sm" style="margin-top:.5rem" onclick="event.stopPropagation();window.open('${googleFlightsUrl}','_blank','noopener')">Bei Google pruefen</button>
          <button class="btn btn-outline btn-sm" style="margin-top:.35rem" onclick="event.stopPropagation();openBooking('flight',${serializeInlineItem(f)})">Anfrage merken</button>
        </div>
      </div>
    `;
    }).join('');
  }

  function renderHotels(data){
    const list = getDisplayList(data, runtime.getHotels, (a, b)=>b.valueScore - a.valueScore || a.pricePerNight - b.pricePerNight);
    document.getElementById('h-count').textContent = `${list.length} Hotels gefunden`;
    runtime.renderComparisonSection('hotel', list);

    const {
      checkin = '',
      checkout = '',
      guests = 2,
      rooms = 1
    } = runtime.getHotelSearchContext();
    const accommodationType = runtime.getAccommodationType() || {type:'lodging'};
    const isPrimaryBookableRoute = accommodationType.type === 'lodging';
    renderHotelHandoffStatus();
    renderHotelRecommendation(list, {checkin, checkout, guests, rooms});

    document.getElementById('h-list').innerHTML = list.map(h=>{
      const offer = buildHotelOfferForBooking(h);
      const selectedOption = getSelectedRoomOption(offer);
      const dest = h.dest || '';
      const mapsUrl = safeExternalUrl(h.googleUrl || `https://www.google.com/maps/search/${encodeURIComponent(h.name+' '+dest)}`);
      const imageHtml = h.photoUrl
        ? `<img src="${safeExternalUrl(h.photoUrl)}" style="width:200px;height:140px;object-fit:cover;cursor:pointer" onclick="window.open('${mapsUrl}','_blank')" onerror="this.style.display='none'">`
        : `<div class="hotel-img-placeholder" style="cursor:pointer;width:200px;height:140px" onclick="window.open('${mapsUrl}','_blank')">${escapeHtml(h.emoji||'🏨')}</div>`;
      const priceLevel = h.priceLevel || 2;
      const priceHtml = `
        <div class="hotel-price"><div class="amount">~€${offer.pricePerNight}</div><div class="per">pro Nacht*</div></div>
        <div style="font-size:.8rem;color:var(--muted);text-align:right">~€${offer.total} (${h.nights} N.)</div>
        <div style="font-size:.72rem;color:var(--warn);text-align:right;margin-top:.15rem">${'€'.repeat(priceLevel)}<span style="opacity:.25">${'€'.repeat(Math.max(0,4-priceLevel))}</span></div>
        <div style="font-size:.68rem;color:var(--muted);text-align:right">*Preisschätzung</div>`;
      const extraUrl = safeExternalUrl(accommodationType.type==='hostel'
        ? `https://www.hostelworld.com/s?q=${encodeURIComponent(dest)}&type=city&from=${checkin}&to=${checkout}&guests=${guests}`
        : accommodationType.type==='campground'
        ? `https://www.campspace.com/de/s?location=${encodeURIComponent(dest)}`
        : `https://www.airbnb.de/s/${encodeURIComponent(dest)}/homes?checkin=${checkin}&checkout=${checkout}&adults=${guests}${accommodationType.type==='vacation_rental'?'&room_types[]=Entire+home%2Fapt':''}`);
      const extraLabel = accommodationType.type==='hostel' ? '🛏 Hostelworld' : accommodationType.type==='campground' ? '⛺ Campspace' : '🏡 Airbnb';
      const extraColor = accommodationType.type==='hostel' ? '#f5a623' : accommodationType.type==='campground' ? '#27ae60' : '#ff5a5f';
      const routeBadge = isPrimaryBookableRoute
        ? (()=>{ 
            const readiness = buildHotelReadinessCopy(offer);
            const palette = readiness.badgeTone === 'bookable'
              ? {bg:'#eafaf1', text:'#1e8449', border:'#b7e4c7'}
              : readiness.badgeTone === 'precheck'
              ? {bg:'#eef6ff', text:'#1f4f82', border:'#cfe2ff'}
              : readiness.badgeTone === 'live-search'
              ? {bg:'#fff8e8', text:'#9a7d0a', border:'#f9e79f'}
              : {bg:'#f8f1ff', text:'#6c3483', border:'#e8daef'};
            return `<span style="display:inline-flex;align-items:center;gap:.3rem;padding:.2rem .55rem;border-radius:999px;background:${palette.bg};color:${palette.text};border:1px solid ${palette.border};font-size:.72rem;font-weight:700;margin-top:.55rem">${escapeHtml(readiness.headline)}</span>`;
          })()
        : `<span style="display:inline-flex;align-items:center;gap:.3rem;padding:.2rem .55rem;border-radius:999px;background:#fff8e8;color:#9a7d0a;border:1px solid #f9e79f;font-size:.72rem;font-weight:700;margin-top:.55rem">Vorbereitet</span>`;
      const routeCopy = isPrimaryBookableRoute
        ? `Buchung findet beim Anbieter statt. TravelLogik speichert nur Reisedaten, Kostenschaetzung und den externen Tracking-Status.`
        : `${extraLabel.replace(/^[^A-Za-z]+/, '').trim()} ist hier nur als vorbereitete Weiterleitung gedacht. Diese Unterform ist noch keine echte Buchungsroute in TravelLogik.`;
      const externalBookingUrl = getHotelExternalBookingUrl(offer);
      const googleHotelsUrl = buildGoogleHotelsUrl(offer, {checkin, checkout, guests});
      const primaryActionLabel = getHotelExternalBookingLabel(externalBookingUrl);
      const stayMeta = [
        h.nights ? `${h.nights} Naechte` : '',
        guests ? `${guests} Gast${guests > 1 ? 'e' : ''}` : '',
        rooms ? `${rooms} Zimmer` : '',
        checkin && checkout ? `${checkin} bis ${checkout}` : ''
      ].filter(Boolean).join(' · ');
      const actionButtons = isPrimaryBookableRoute
        ? `
              <button class="btn btn-success btn-sm" onclick="event.stopPropagation();window.open('${googleHotelsUrl}','_blank','noopener')">Google Hotels</button>
              <button class="btn btn-outline btn-sm" onclick="event.stopPropagation();startHotelHandoff(${serializeInlineItem(offer)},${JSON.stringify(externalBookingUrl)})">${primaryActionLabel}</button>
              <button class="btn btn-outline btn-sm" onclick="event.stopPropagation();openBooking('hotel',${serializeInlineItem(offer)})">Fuer Tracking erfassen</button>
              <button class="btn btn-outline btn-sm" onclick="event.stopPropagation();toggleHotelDetails('${escapeHtml(String(h.offerId || h.id))}')">${expandedHotelId === String(h.offerId || h.id) ? 'Details ausblenden' : 'Mehr Details'}</button>`
        : `
              <button class="btn btn-sm" style="background:${extraColor};color:#fff" onclick="event.stopPropagation();window.open('${extraUrl}','_blank','noopener')">Extern pruefen</button>
              <button class="btn btn-outline btn-sm" onclick="event.stopPropagation();openBooking('hotel',${serializeInlineItem(offer)})">Rueckfrage senden</button>`;
      const roomOptionsHtml = selectedOption
        ? `<div class="hotel-rate-list">
            ${getHotelRoomOptions(h).map(option=>{
              const isActive = option.id === selectedOption.id;
              return `
                <button class="hotel-rate-option${isActive ? ' active' : ''}" onclick="event.stopPropagation();selectHotelRoomOption('${escapeHtml(String(h.offerId || h.id))}','${escapeHtml(option.id)}')">
                  <div class="hotel-rate-top">
                    <strong>${escapeHtml(option.roomType)}</strong>
                    <span>~€${escapeHtml(String(option.total))}</span>
                  </div>
                  <div class="hotel-rate-meta">${escapeHtml(option.board)} · ${escapeHtml(option.flexibilityLabel)}</div>
                  <div class="hotel-rate-note">${escapeHtml(option.bedding)} · ${escapeHtml(option.roomSize)} · ${escapeHtml(option.view)}</div>
                  <div class="hotel-rate-note">${escapeHtml(option.cancellationLabel)} · ${escapeHtml(option.occupancyLabel)}</div>
                </button>`;
            }).join('')}
          </div>
          <div class="hotel-rate-summary">
            <strong>Aktuell gewaehlt:</strong> ${escapeHtml(selectedOption.rateName)} · ${escapeHtml(selectedOption.note)}
            ${checkin && checkout ? `<span> · ${escapeHtml(formatDate(checkin))} bis ${escapeHtml(formatDate(checkout))}</span>` : ''}
            <span> · ${escapeHtml(selectedOption.bedding)} · ${escapeHtml(selectedOption.roomSize)}</span>
          </div>`
        : '';

      return `
      <div class="hotel-card">
        ${imageHtml}
        <div class="hotel-info">
          <div class="hotel-name" style="cursor:pointer" onclick="window.open('${mapsUrl}','_blank')">${escapeHtml(h.name)} <span style="font-size:.72rem;color:var(--success)">↗ Google Maps</span></div>
          <div class="stars">${'★'.repeat(h.stars || 3)}</div>
          <div class="hotel-loc">📍 ${escapeHtml(h.address || dest)}</div>
          <div style="font-size:.78rem;color:var(--primary);font-weight:600;margin-top:.25rem">${escapeHtml(stayMeta)}</div>
          <div class="hotel-tags">${(h.tags || []).slice(0,5).map(t=>`<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>
          ${h.airportAccessLabel ? `<div style="font-size:.76rem;color:var(--text-light);margin-top:.45rem"><strong>${escapeHtml(h.airportAccessLabel)}</strong>${h.airportMinutes ? ` · ca. ${escapeHtml(String(h.airportMinutes))} Min bis Flughafen` : ''}</div>` : ''}
          ${routeBadge}
          <div style="font-size:.76rem;color:var(--text-light);line-height:1.5;margin-top:.45rem">${routeCopy}</div>
          ${isPrimaryBookableRoute ? roomOptionsHtml : ''}
        </div>
        <div class="hotel-price-col">
          <div style="display:flex;gap:.5rem;align-items:center">
            <div class="rating-badge">${h.rating}</div>
            <div class="score-badge ${h.valueScore>=82?'top':''}">${h.valueScore}</div>
          </div>
          <div>
            ${priceHtml}
            ${renderScoreTags((h.highlights || []).map(escapeHtml), 'justify-content:flex-end')}
            <div style="font-size:.76rem;color:var(--success);text-align:right;margin-top:.35rem">${h.savings ? `bis zu €${h.savings} sparen via ${runtime.getBestProviderLabel(h)}` : 'Bester Direktpreis'}</div>
            ${isPrimaryBookableRoute ? `<div style="font-size:.72rem;color:var(--text-light);text-align:right;margin-top:.35rem">${escapeHtml('TravelLogik bucht dieses Hotel nicht selbst. Der Abschluss passiert extern beim Anbieter.')}</div>` : ''}
            <div style="display:flex;gap:.4rem;margin-top:.6rem;justify-content:flex-end;flex-wrap:wrap">
              <button class="btn btn-outline btn-sm" onclick="event.stopPropagation();window.open('${mapsUrl}','_blank','noopener')">Maps</button>
              ${actionButtons}
            </div>
          </div>
        </div>
        ${expandedHotelId === String(h.offerId || h.id) ? renderHotelDetailPanel(offer, selectedOption) : ''}
      </div>`;
    }).join('');
  }

  function renderCars(data){
    const list = getDisplayList(data, runtime.getCars, (a, b)=>b.valueScore - a.valueScore || a.price - b.price);
    document.getElementById('c-count').textContent = `${list.length} Fahrzeuge gefunden`;
    runtime.renderComparisonSection('car', list);
    document.getElementById('c-list').innerHTML = list.map(c=>{
      const googleCarsUrl = buildGoogleCarsUrl(c);
      return `
      <div class="car-card" onclick="openBooking('car',${serializeInlineItem(c)})">
        <div class="car-icon">${escapeHtml(c.emoji)}</div>
        <div>
          <div class="car-name">${escapeHtml(c.name)}</div>
          <div class="car-class">${escapeHtml(c.class)} · ${escapeHtml(c.provider)}</div>
          <div class="car-features">
            <span class="car-feat">👤 ${c.seats} Sitze</span>
            <span class="car-feat">🧳 ${c.bags} Koffer</span>
            <span class="car-feat">❄️ Klima</span>
            <span class="car-feat">⚙️ ${escapeHtml(c.transmission)}</span>
            <span class="car-feat">${c.freeCancellation?'✅ Flexibel':'🔒 Fix'}</span>
          </div>
        </div>
        <div style="text-align:right;min-width:130px">
          <div class="score-badge ${c.valueScore>=82?'top':''}" style="margin-left:auto;margin-bottom:.35rem">${c.valueScore}</div>
          <div style="font-size:1.3rem;font-weight:700;color:var(--primary)">€${c.price}<span style="font-size:.75rem;color:var(--muted)">/Tag</span></div>
          <div style="font-size:.8rem;color:var(--muted)">€${c.total} (${c.days} T.)</div>
          <div style="font-size:.76rem;color:var(--success);margin-top:.2rem">${c.savings ? `bis zu €${c.savings} sparen` : 'Direktpreis ist Bestpreis'}</div>
          <button class="btn btn-primary btn-sm" style="margin-top:.5rem" onclick="event.stopPropagation();window.open('${googleCarsUrl}','_blank','noopener')">Bei Google pruefen</button>
          <button class="btn btn-outline btn-sm" style="margin-top:.35rem" onclick="event.stopPropagation();openBooking('car',${serializeInlineItem(c)})">Anfrage merken</button>
        </div>
      </div>
    `;
    }).join('');
  }

  global.TravelLogikResults = {
    configureTravelResults,
    renderHotelHandoffStatus,
    renderHotelSourceStatus,
    renderFlights,
    renderHotels,
    renderCars,
    selectHotelRoomOption,
    toggleHotelDetails
  };

  global.selectHotelRoomOption = selectHotelRoomOption;
  global.toggleHotelDetails = toggleHotelDetails;
})(window);
