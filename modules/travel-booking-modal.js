(function(global){
  'use strict';

  const hotelReadiness = global.TravelLogikHotelReadiness || {};
  const deriveHotelBookingReadiness = typeof hotelReadiness.deriveHotelBookingReadiness === 'function'
    ? hotelReadiness.deriveHotelBookingReadiness
    : (offer)=>offer?.bookingReadiness || {canReserve:false, statusLabel:'Vorabpruefung noetig', summary:'Hotelstrecke vorbereitet.', missing:'Provider-Precheck fehlt.'};
  const hotelMvp = global.TravelLogikHotelMvp || {};
  const buildHotelBookingState = typeof hotelMvp.buildHotelBookingState === 'function'
    ? hotelMvp.buildHotelBookingState
    : ()=>({status:'demo', statusLabel:'Demo', technicalStage:'Nur lokale Vorbereitung', missingStep:'Live-Hotelsuche fehlt', missingDetail:'Es gibt noch keine echte Hotelquelle mit providerfaehigen Hoteldaten.'});
  const createHotelReservationSkeleton = typeof hotelMvp.createHotelReservationSkeleton === 'function'
    ? hotelMvp.createHotelReservationSkeleton
    : ()=>({status:'demo'});

  const runtime = {
    ensureOffer:(type, item)=>item,
    getTrip:()=>({}),
    getBookings:()=>[],
    setBookings:()=>{},
    getCurrentBookingItem:()=>null,
    setCurrentBookingItem:()=>{},
    getModalStep:()=>1,
    setModalStep:()=>{},
    buildBookingRecord:()=>null,
    syncTripCoreFromBookings:()=>{},
    persistBookings:()=>{},
    refreshRelatedViews:()=>{},
    getPilotConfig:()=>({contactEmail:'', contactLabel:'TravelLogik Pilotdesk'}),
    getModuleMeta:(type)=>({doneKey:type}),
    markDone:()=>{}
  };
  const CONTACT_STORAGE_KEY = 'tl_recent_contact';

  function configureTravelBookingModal(options = {}){
    if(typeof options.ensureOffer === 'function') runtime.ensureOffer = options.ensureOffer;
    if(typeof options.getTrip === 'function') runtime.getTrip = options.getTrip;
    if(typeof options.getBookings === 'function') runtime.getBookings = options.getBookings;
    if(typeof options.setBookings === 'function') runtime.setBookings = options.setBookings;
    if(typeof options.getCurrentBookingItem === 'function') runtime.getCurrentBookingItem = options.getCurrentBookingItem;
    if(typeof options.setCurrentBookingItem === 'function') runtime.setCurrentBookingItem = options.setCurrentBookingItem;
    if(typeof options.getModalStep === 'function') runtime.getModalStep = options.getModalStep;
    if(typeof options.setModalStep === 'function') runtime.setModalStep = options.setModalStep;
    if(typeof options.buildBookingRecord === 'function') runtime.buildBookingRecord = options.buildBookingRecord;
    if(typeof options.syncTripCoreFromBookings === 'function') runtime.syncTripCoreFromBookings = options.syncTripCoreFromBookings;
    if(typeof options.persistBookings === 'function') runtime.persistBookings = options.persistBookings;
    if(typeof options.refreshRelatedViews === 'function') runtime.refreshRelatedViews = options.refreshRelatedViews;
    if(typeof options.getPilotConfig === 'function') runtime.getPilotConfig = options.getPilotConfig;
    if(typeof options.getModuleMeta === 'function') runtime.getModuleMeta = options.getModuleMeta;
    if(typeof options.markDone === 'function') runtime.markDone = options.markDone;
  }

  function getBookingModalElements(){
    return {
      modal: document.getElementById('booking-modal'),
      modalTitle: document.getElementById('modal-title'),
      bookingSummary: document.getElementById('booking-summary'),
      travelerForms: document.getElementById('traveler-forms'),
      confirmRef: document.getElementById('confirm-ref'),
      confirmEmail: document.getElementById('confirm-email'),
      backButton: document.getElementById('btn-back'),
      nextButton: document.getElementById('btn-next'),
      finishButton: document.getElementById('btn-finish'),
      summaryLabel: document.getElementById('ps-label1'),
      summaryValue: document.getElementById('ps-val1'),
      taxValue: document.getElementById('ps-tax'),
      totalValue: document.getElementById('ps-total'),
      confirmStatus: document.getElementById('confirm-status'),
      confirmNext: document.getElementById('confirm-next'),
      confirmPilotBox: document.getElementById('confirm-pilot-box'),
      confirmBannerTitle: document.getElementById('confirm-banner-title'),
      confirmBannerText: document.getElementById('confirm-banner-text'),
      confirmDetails: document.getElementById('confirm-details')
    };
  }

  function toggleModalSteps(activeStep){
    ['step-1', 'step-2', 'step-3', 'step-4'].forEach((id)=>{
      const el = document.getElementById(id);
      if(el) el.style.display = id === `step-${activeStep}` ? 'block' : 'none';
    });
  }

  function setModalButtons(step){
    const {backButton, nextButton, finishButton} = getBookingModalElements();
    if(backButton) backButton.style.display = step > 1 ? 'inline-flex' : 'none';
    if(nextButton) nextButton.style.display = step < 4 ? 'inline-flex' : 'none';
    if(finishButton) finishButton.style.display = step === 4 ? 'inline-flex' : 'none';
  }

  function updateSteps(){
    const modalStep = runtime.getModalStep();
    for(let i = 1; i <= 4; i++){
      const dot = document.getElementById(`dot-${i}`);
      if(!dot) continue;
      dot.classList.remove('active', 'done');
      if(i < modalStep){
        dot.classList.add('done');
        dot.textContent = '✓';
      } else if(i === modalStep){
        dot.classList.add('active');
        dot.textContent = i;
      } else {
        dot.textContent = i;
      }
    }
  }

  function formatCard(el){
    el.value = el.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim();
  }

  function formatExp(el){
    el.value = el.value.replace(/\D/g, '').replace(/^(\d{2})(\d)/, '$1/$2');
  }

  function getFlightPassengerCount(){
    return parseInt(document.getElementById('f-pax')?.value) || 1;
  }

  function escapeHtml(value){
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatDate(value){
    if(!value) return 'Noch nicht gesetzt';
    const date = new Date(value);
    if(Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('de-DE', {
      day:'2-digit',
      month:'2-digit',
      year:'numeric'
    });
  }

  function formatDateTime(value){
    if(!value) return 'Noch nicht gesetzt';
    const date = new Date(value);
    if(Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('de-DE', {
      day:'2-digit',
      month:'2-digit',
      year:'numeric',
      hour:'2-digit',
      minute:'2-digit'
    });
  }

  function getHotelStatusClass(status){
    if(status === 'external-confirmed') return 'confirmed';
    if(status === 'external-booked') return 'external-completed';
    if(status === 'external-opened') return 'received';
    if(status === 'cancelled') return 'cancelled';
    return 'waiting';
  }

  function buildHotelTariffHint(offer){
    const hints = [];
    if(offer.roomType) hints.push(offer.roomType);
    if(offer.board) hints.push(offer.board);
    if(offer.rateName) hints.push(offer.rateName.replace(`${offer.roomType} · `, ''));
    if(offer.freeCancellation) hints.push('kostenfrei stornierbar');
    else if(offer.partiallyRefundable) hints.push('teilflexibel');
    if(offer.familyFriendly) hints.push('familiengeeignet');
    if(Array.isArray(offer.tags) && offer.tags.length){
      const tagHint = offer.tags.slice(0, 2).join(', ');
      hints.push(tagHint);
    }
    return hints.length ? hints.join(' · ') : `${offer.stars || 3}★ Standardrate`;
  }

  function buildHotelCancellation(offer, tripContext){
    if(offer.cancellationLabel){
      if((offer.freeCancellation || offer.partiallyRefundable) && tripContext.startDate){
        const deadline = new Date(tripContext.startDate);
        if(!Number.isNaN(deadline.getTime())){
          deadline.setDate(deadline.getDate() - (offer.freeCancellation ? 2 : 3));
          deadline.setHours(18, 0, 0, 0);
          return {
            deadline: deadline.toISOString(),
            label:`${offer.cancellationLabel} · lokal bis ${formatDateTime(deadline.toISOString())}`
          };
        }
      }
      return {
        deadline: '',
        label: offer.cancellationLabel
      };
    }
    if(offer.freeCancellation && tripContext.startDate){
      const deadline = new Date(tripContext.startDate);
      if(!Number.isNaN(deadline.getTime())){
        deadline.setDate(deadline.getDate() - 2);
        deadline.setHours(18, 0, 0, 0);
        return {
          deadline: deadline.toISOString(),
          label:`Lokal vermerkt bis ${formatDateTime(deadline.toISOString())}`
        };
      }
    }
    if(offer.freeCancellation === false){
      return {
        deadline: '',
        label:'Tarif aktuell ohne kostenfreie Stornierung markiert'
      };
    }
    return {
      deadline: '',
      label:'Keine lokale Stornofrist hinterlegt'
    };
  }

  function buildHotelConfirmationDetails(record){
    const reservation = record.hotelReservation || {};
    const detailRows = [
      ['Externe Referenz', reservation.externalReservationReference || record.externalReservationReference || 'Nicht vorhanden'],
      ['Status', record.statusLabel || 'Extern bestaetigt'],
      ['Check-in', formatDate(record.checkIn)],
      ['Check-out', formatDate(record.checkOut)],
      ['Gaeste', `${record.guests || 1}`],
      ['Zimmer', `${record.rooms || 1}`],
      ['Zimmer / Tarif', record.roomRateHint || 'Noch kein Tarifhinweis'],
      ['Verpflegung', record.boardType || 'Nicht hinterlegt'],
      ['Zimmerdetails', record.roomFacts || 'Nicht hinterlegt'],
      ['Ankunft', record.arrivalWindow || 'Nicht hinterlegt'],
      ['Zimmerwunsch', record.roomPreference || 'Nicht hinterlegt'],
      ['Bettwunsch', record.bedPreference || 'Nicht hinterlegt'],
      ['Storno', record.cancellationLabel || 'Keine lokale Stornoinfo'],
      ['Anbieter', reservation.provider || record.providerName || 'Nicht hinterlegt'],
      ['Externe URL', reservation.externalUrl || record.offerUrl || 'Nicht hinterlegt'],
      ['Kontakt', record.contactName || 'Nicht hinterlegt'],
      ['E-Mail', record.contactEmail || 'Nicht hinterlegt'],
      ['Telefon', record.contactPhone || 'Nicht hinterlegt'],
      ['Extern bestaetigt am', formatDateTime(record.confirmedAt || record.createdAt)]
    ];
    return `
      <div class="booking-confirm-grid">
        ${detailRows.map(([label, value])=>`
          <div class="booking-confirm-card">
            <div class="booking-confirm-label">${escapeHtml(label)}</div>
            <div class="booking-confirm-value">${escapeHtml(value)}</div>
          </div>
        `).join('')}
      </div>
      ${record.rateNote ? `
        <div class="booking-confirm-note">
          <strong>Tarifdetails</strong>
          <div>${escapeHtml(record.rateNote)}</div>
        </div>` : ''}
      ${record.requestNotes ? `
        <div class="booking-confirm-note">
          <strong>Hinweise zur Buchung</strong>
          <div>${escapeHtml(record.requestNotes)}</div>
        </div>` : ''}
      <div class="booking-confirm-note">
        <strong>Produktstand</strong>
        <div>TravelLogik fuehrt dieses Hotel nur als externen Buchungsfall. Die eigentliche Buchung lief beim Anbieter und wird hier ausschliesslich fuer Reise- und Kosten-Tracking dokumentiert.</div>
      </div>`;
  }

  function buildHotelPreparationDetails(record){
    const readiness = record.bookingReadiness || {};
    const reservation = record.hotelReservation || {};
    const detailRows = [
      ['Status', record.statusLabel || 'Vorgeschlagen'],
      ['Check-in', formatDate(record.checkIn)],
      ['Check-out', formatDate(record.checkOut)],
      ['Gaeste', `${record.guests || 1}`],
      ['Zimmer', `${record.rooms || 1}`],
      ['Zimmer / Tarif', record.roomRateHint || 'Noch kein Tarifhinweis'],
      ['Verpflegung', record.boardType || 'Nicht hinterlegt'],
      ['Storno', record.cancellationLabel || 'Keine lokale Stornoinfo'],
      ['Anbieter', reservation.provider || record.providerName || 'Nicht hinterlegt'],
      ['Externe URL', reservation.externalUrl || record.offerUrl || 'Noch keine URL gespeichert'],
      ['Kostenstatus', reservation.finalPrice || record.finalPrice ? `Finalpreis €${reservation.finalPrice || record.finalPrice}` : `Schaetzung €${record.total || 0}`],
      ['Hinweis', readiness.summary || 'Die Buchung findet extern beim Anbieter statt. TravelLogik speichert nur Tracking-Daten.'],
      ['Kontakt', record.contactName || 'Nicht hinterlegt'],
      ['E-Mail', record.contactEmail || 'Nicht hinterlegt'],
      ['Telefon', record.contactPhone || 'Nicht hinterlegt'],
      ['Erfasst am', formatDateTime(record.createdAt)]
    ];
    return `
      <div class="booking-confirm-grid">
        ${detailRows.map(([label, value])=>`
          <div class="booking-confirm-card">
            <div class="booking-confirm-label">${escapeHtml(label)}</div>
            <div class="booking-confirm-value">${escapeHtml(value)}</div>
          </div>
        `).join('')}
      </div>
      ${record.requestNotes ? `
        <div class="booking-confirm-note">
          <strong>Hinweise zur Buchung</strong>
          <div>${escapeHtml(record.requestNotes)}</div>
        </div>` : ''}
      <div class="booking-confirm-note">
        <strong>Ehrlicher Produktstand</strong>
        <div>TravelLogik fuehrt diesen Hotel-Fall nur fuer Reiseverlauf und Kosten-Tracking. Der Abschluss passiert extern beim Anbieter und wird hier nicht simuliert.</div>
      </div>`;
  }

  function readRecentContact(){
    try {
      const raw = global.TravelLogikProduct?.storage?.getItem(CONTACT_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (error){
      return {};
    }
  }

  function persistRecentContact(data){
    try {
      global.TravelLogikProduct?.storage?.setItem(CONTACT_STORAGE_KEY, JSON.stringify(data));
    } catch (error){
      console.warn('Kontakt konnte lokal nicht vorbefuellt werden.', error);
    }
  }

  function getHotelRooms(){
    return parseInt(document.getElementById('h-rooms')?.value) || 1;
  }

  function buildHotelStayFacts(offer){
    const tripContext = offer.tripContext || {};
    const guests = tripContext.pax || 1;
    const rooms = getHotelRooms();
    const facts = [
      `${offer.nights || 1} Naechte`,
      `${guests} Gast${guests > 1 ? 'e' : ''}`,
      `${rooms} Zimmer`
    ];
    if(tripContext.startDate && tripContext.endDate){
      facts.push(`${formatDate(tripContext.startDate)} bis ${formatDate(tripContext.endDate)}`);
    }
    return facts.join(' · ');
  }

  function buildHotelRoomFacts(offer){
    const facts = [];
    if(offer.bedding) facts.push(offer.bedding);
    if(offer.roomSize) facts.push(offer.roomSize);
    if(offer.roomView) facts.push(offer.roomView);
    if(offer.occupancyLabel) facts.push(offer.occupancyLabel);
    return facts.join(' · ');
  }

  function getHotelRoomOptions(offer){
    return Array.isArray(offer.roomOptions) ? offer.roomOptions : [];
  }

  function getSelectedHotelRoomOption(offer){
    const options = getHotelRoomOptions(offer);
    if(!options.length) return null;
    return options.find(option=>option.id === offer.selectedRoomOptionId) || options[0];
  }

  function applyHotelRoomOption(offer, option){
    if(!option) return offer;
    return {
      ...offer,
      selectedRoomOptionId: option.id,
      roomType: option.roomType,
      rateName: option.rateName,
      board: option.board,
      breakfastIncluded: option.breakfastIncluded,
      freeCancellation: option.freeCancellation,
      partiallyRefundable: option.partiallyRefundable,
      flexibilityLabel: option.flexibilityLabel,
      cancellationLabel: option.cancellationLabel,
      roomOptionNote: option.note,
      bedding: option.bedding,
      roomSize: option.roomSize,
      roomView: option.view,
      occupancyLabel: option.occupancyLabel,
      pricePerNight: option.pricePerNight,
      total: option.total
    };
  }

  function updateBookingPricingDisplay(bookingItem){
    const {summaryLabel, summaryValue, taxValue, totalValue} = getBookingModalElements();
    const pricing = buildBookingPricing(bookingItem.type, bookingItem.offer || bookingItem.item || {});
    if(summaryLabel) summaryLabel.textContent = pricing.breakdown;
    if(summaryValue) summaryValue.textContent = `€${pricing.price}`;
    if(taxValue) taxValue.textContent = `€${pricing.tax}`;
    if(totalValue) totalValue.textContent = `€${pricing.price + pricing.tax}`;
    bookingItem.price = pricing.price;
    bookingItem.tax = pricing.tax;
    bookingItem.total = pricing.price + pricing.tax;
    runtime.setCurrentBookingItem(bookingItem);
  }

  function renderHotelCheckoutSnapshot(offer){
    return `
      <div class="hotel-checkout-rail">
        <div class="hotel-checkout-title">Buchungszusammenfassung</div>
        <div class="hotel-checkout-row"><span>Aufenthalt</span><strong>${escapeHtml(buildHotelStayFacts(offer))}</strong></div>
        <div class="hotel-checkout-row"><span>Tarif</span><strong>${escapeHtml(offer.rateName || offer.roomType || 'Standard')}</strong></div>
        <div class="hotel-checkout-row"><span>Zimmerdetails</span><strong>${escapeHtml(buildHotelRoomFacts(offer) || 'Nicht hinterlegt')}</strong></div>
        <div class="hotel-checkout-row"><span>Verpflegung</span><strong>${escapeHtml(offer.board || 'Ohne Zusatz')}</strong></div>
        <div class="hotel-checkout-row"><span>Storno</span><strong>${escapeHtml(offer.cancellationLabel || 'Keine lokale Info')}</strong></div>
      </div>`;
  }

  function renderHotelStayPreferenceFields(){
    return `
      <div class="booking-detail-block" style="margin-bottom:1rem">
        <div class="booking-detail-block-title">Aufenthalt vorbereiten</div>
        <div class="form-row cols-2">
          <div class="form-group">
            <label>Geplante Ankunft</label>
            <select id="hotel-arrival-window">
              <option>Nachmittag (14:00-18:00)</option>
              <option>Frueher Abend (18:00-21:00)</option>
              <option>Spaete Anreise (nach 21:00)</option>
            </select>
          </div>
          <div class="form-group">
            <label>Zimmerlage</label>
            <select id="hotel-room-preference">
              <option>Standardlage</option>
              <option>Ruhiges Zimmer</option>
              <option>Hohe Etage</option>
              <option>Nahe Aufzug / kurzer Weg</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label>Bettwunsch</label>
          <select id="hotel-bed-preference">
            <option>Beste verfuegbare Option</option>
            <option>Doppelbett bevorzugt</option>
            <option>Getrennte Betten bevorzugt</option>
            <option>Familienaufstellung wenn moeglich</option>
          </select>
        </div>
      </div>`;
  }

  function prefillTravelerForms(type){
    const recentContact = readRecentContact();
    const firstNameEl = document.getElementById('pax-fn-0');
    const lastNameEl = document.getElementById('pax-ln-0');
    const emailEl = document.getElementById('contact-email');
    if(firstNameEl && recentContact.firstName) firstNameEl.value = recentContact.firstName;
    if(lastNameEl && recentContact.lastName) lastNameEl.value = recentContact.lastName;
    if(emailEl && recentContact.email) emailEl.value = recentContact.email;

    const requestNameEl = document.getElementById('request-name');
    const requestPhoneEl = document.getElementById('request-phone');
    const requestChannelEl = document.getElementById('request-channel');
    if(requestNameEl && recentContact.name) requestNameEl.value = recentContact.name;
    if(requestPhoneEl && recentContact.phone) requestPhoneEl.value = recentContact.phone;
    if(requestChannelEl && recentContact.preferredChannel){
      requestChannelEl.value = recentContact.preferredChannel;
    }

    const requestTypeEl = document.getElementById('request-type');
    if(requestTypeEl){
      if(type === 'hotel'){
        requestTypeEl.innerHTML = '<option selected>🏨 Hotel direkt buchen</option>';
        requestTypeEl.disabled = true;
      } else {
        requestTypeEl.disabled = false;
        requestTypeEl.innerHTML = `
          <option>🔎 Angebot pruefen</option>
          <option>📞 Rueckruf anfordern</option>
          <option>🧭 Beratung starten</option>`;
      }
    }
  }

  function buildBookingPricing(type, offer){
    if(type === 'flight'){
      const pax = getFlightPassengerCount();
      const base = offer.price || offer.pricing?.base || 0;
      const price = base * pax;
      return {
        title:`Flug ${offer.from} → ${offer.to}`,
        label:`${offer.airline.name} ${offer.flightNum} · ${offer.depTime}–${offer.arrTime}`,
        breakdown:`${offer.airline.name} (${pax}×€${base})`,
        price,
        tax:Math.round(price * 0.07),
        pax
      };
    }
    if(type === 'hotel'){
      const price = offer.total || offer.pricing?.total || 0;
      return {
        title:`Hotel: ${offer.name}`,
        label:`${offer.stars}★ · ${offer.nights} Nächte · ${offer.dest}`,
        breakdown:`${offer.nights} Nächte × €${offer.pricePerNight || offer.pricing?.base || 0}`,
        price,
        tax:Math.round(price * 0.05),
        pax:1
      };
    }
    if(type === 'car'){
      const price = offer.total || offer.pricing?.total || 0;
      return {
        title:`Mietwagen: ${offer.name}`,
        label:`${offer.class} · ${offer.provider} · ${offer.days} Tage`,
        breakdown:`${offer.days} Tage × €${offer.price || offer.pricing?.base || 0}`,
        price,
        tax:Math.round(price * 0.19),
        pax:1
      };
    }
    const trip = runtime.getTrip();
    const price = offer.total || offer.pricing?.total || 0;
    const pax = offer.pax || trip.pax || 1;
    return {
      title:`Transfer: ${offer.title}`,
      label:`${offer.providerName} · ${offer.bestFor || 'Transfer'} · ${pax} Person${pax > 1 ? 'en' : ''}`,
      breakdown:`${offer.providerName} · €${offer.price || offer.pricing?.base || price}`,
      price,
      tax:Math.round(price * 0.07),
      pax:1
    };
  }

  function buildTravelerForms(type, pax){
    let html = '';
    for(let i = 0; i < pax; i++){
      html += `<div style="margin-bottom:1rem;padding:1rem;background:var(--bg);border-radius:8px">
        <div style="font-weight:600;margin-bottom:.5rem">Person ${i + 1}</div>
        <div class="form-row cols-2">
          <div class="form-group"><label>Vorname</label><input type="text" placeholder="Max" id="pax-fn-${i}"></div>
          <div class="form-group"><label>Nachname</label><input type="text" placeholder="Mustermann" id="pax-ln-${i}"></div>
        </div>
        <div class="form-row cols-2">
          <div class="form-group"><label>Geburtsdatum</label><input type="date" id="pax-dob-${i}"></div>
          <div class="form-group"><label>Nationalität</label><select id="pax-nat-${i}"><option>Deutsch</option><option>Österreichisch</option><option>Schweizerisch</option><option>Andere</option></select></div>
        </div>
        ${type === 'flight' ? `<div class="form-group"><label>Reisepass-Nr.</label><input type="text" placeholder="C01X00T47" id="pax-pp-${i}"></div>` : ''}
        ${i === 0 ? `<div class="form-group" style="margin-top:.5rem"><label>E-Mail</label><input type="email" placeholder="reise@beispiel.de" id="contact-email"></div>` : ''}
      </div>`;
    }
    if(type !== 'hotel') return html;
    const currentBookingItem = runtime.getCurrentBookingItem();
    const offer = currentBookingItem?.offer || currentBookingItem?.item || {};
    return `
      ${renderHotelCheckoutSnapshot(offer)}
      ${renderHotelStayPreferenceFields()}
      ${html}
      <div class="booking-confirm-note" style="margin-top:.2rem">
        <strong>Hauptgast</strong>
        <div>TravelLogik nutzt diese Angaben lokal nur fuer Reiseverlauf und Kosten-Tracking. Die Hotelbuchung selbst findet extern beim Anbieter statt.</div>
      </div>`;
  }

  function buildBookingIntro(type, pricing){
    if(type === 'hotel'){
      const currentBookingItem = runtime.getCurrentBookingItem();
      const offer = currentBookingItem?.offer || currentBookingItem?.item || {};
      const externalUrl = offer.bookingUrl || offer.handoffUrl || offer.providerDeeplink || offer.url || offer.deepLink || '';
      const providerLabel = /booking\.com/i.test(externalUrl) ? 'Booking.com' : (offer.providerName || 'dem Anbieter');
      return `<div class="alert alert-info"><strong>${pricing.title}</strong><br>${pricing.label}<br><small>${escapeHtml(`Die Buchung findet extern bei ${providerLabel} statt. TravelLogik speichert hier nur ehrliche Tracking-Daten zu Aufenthalt und Kosten.`)}</small></div>`;
    }
    return `<div class="alert alert-info"><strong>${pricing.title}</strong><br>${pricing.label}<br><small>Die Auswahl wird als pilotfaehiger Anfrage-Entwurf vorbereitet, nicht als direkter Provider-Checkout.</small></div>`;
  }

  function renderHotelSelectionSummary(offer){
    const pricing = buildBookingPricing('hotel', offer);
    const selectedOption = getSelectedHotelRoomOption(offer);
    return `${buildBookingIntro('hotel', pricing)}
      <div class="booking-confirm-note" style="margin-top:0"><strong>Aufenthalt</strong><div>${escapeHtml(buildHotelStayFacts(offer))}</div></div>
      ${selectedOption ? `
        <div class="hotel-rate-list" style="margin-top:.75rem">
          ${getHotelRoomOptions(offer).map(option=>`
            <button class="hotel-rate-option${selectedOption.id === option.id ? ' active' : ''}" onclick="chooseHotelRateInModal('${escapeHtml(option.id)}')">
              <div class="hotel-rate-top">
                <strong>${escapeHtml(option.roomType)}</strong>
                <span>~€${escapeHtml(String(option.total))}</span>
              </div>
              <div class="hotel-rate-meta">${escapeHtml(option.board)} · ${escapeHtml(option.flexibilityLabel)}</div>
              <div class="hotel-rate-note">${escapeHtml(option.bedding)} · ${escapeHtml(option.roomSize)} · ${escapeHtml(option.view)}</div>
              <div class="hotel-rate-note">${escapeHtml(option.cancellationLabel)} · ${escapeHtml(option.occupancyLabel)}</div>
            </button>
          `).join('')}
        </div>
        <div class="booking-confirm-note" style="margin-top:.8rem">
          <strong>Aktuell gewaehlt</strong>
          <div>${escapeHtml(selectedOption.rateName)} · ${escapeHtml(selectedOption.note)}</div>
          <div style="margin-top:.35rem">${escapeHtml(buildHotelRoomFacts(offer))}</div>
        </div>` : ''}`;
  }

  function openBooking(type, item){
    const offer = runtime.ensureOffer(type, item);
    const bookingItem = {type, item: offer, offer};
    runtime.setCurrentBookingItem(bookingItem);
    runtime.setModalStep(1);
    updateSteps();
    setModalButtons(1);
    toggleModalSteps(1);

    const pricing = buildBookingPricing(type, offer);
    const {modal, modalTitle, bookingSummary, travelerForms, summaryLabel, summaryValue, taxValue, totalValue} = getBookingModalElements();
    if(modalTitle) modalTitle.textContent = pricing.title;
    if(bookingSummary) bookingSummary.innerHTML = type === 'hotel'
      ? renderHotelSelectionSummary(offer)
      : buildBookingIntro(type, pricing);
    if(summaryLabel) summaryLabel.textContent = pricing.breakdown;
    if(summaryValue) summaryValue.textContent = `€${pricing.price}`;
    if(taxValue) taxValue.textContent = `€${pricing.tax}`;
    if(totalValue) totalValue.textContent = `€${pricing.price + pricing.tax}`;

    bookingItem.price = pricing.price;
    bookingItem.tax = pricing.tax;
    bookingItem.total = pricing.price + pricing.tax;
    runtime.setCurrentBookingItem(bookingItem);

    if(travelerForms) travelerForms.innerHTML = buildTravelerForms(type, pricing.pax);
    prefillTravelerForms(type);
    if(modal) modal.classList.add('open');
  }

  function closeModal(){
    const {modal} = getBookingModalElements();
    if(modal) modal.classList.remove('open');
  }

  function confirmBookingStep(){
    const name = document.getElementById('request-name')?.value.trim() || '';
    const email = document.getElementById('contact-email')?.value.trim() || '';
    const phone = document.getElementById('request-phone')?.value.trim() || '';
    const notes = document.getElementById('request-notes')?.value.trim() || '';
    const requestType = document.getElementById('request-type')?.value || 'Angebot pruefen';
    const preferredChannel = document.getElementById('request-channel')?.value || 'E-Mail';
    const consent = !!document.getElementById('request-consent')?.checked;
    if(!name || !email || !consent){
      alert('Bitte Kontaktangaben und Einwilligung fuer die Anfrage ergaenzen.');
      return false;
    }
    persistRecentContact({
      name,
      firstName: document.getElementById('pax-fn-0')?.value.trim() || '',
      lastName: document.getElementById('pax-ln-0')?.value.trim() || '',
      email,
      phone,
      preferredChannel
    });

    const currentBookingItem = runtime.getCurrentBookingItem();
    const ref = 'TL' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const pilotConfig = runtime.getPilotConfig?.() || {};
    const pilotEmail = pilotConfig.contactEmail || '';
    const pilotLabel = pilotConfig.contactLabel || 'TravelLogik Pilotdesk';
    const responseTimeHours = pilotConfig.responseTimeHours || 24;
    const operatorName = pilotConfig.operatorName || pilotLabel;
    const opsContactChannel = pilotConfig.contactChannel || 'E-Mail';
    const offer = currentBookingItem.offer || currentBookingItem.item || {};
    const hotelArrivalWindow = document.getElementById('hotel-arrival-window')?.value || '';
    const hotelRoomPreference = document.getElementById('hotel-room-preference')?.value || '';
    const hotelBedPreference = document.getElementById('hotel-bed-preference')?.value || '';
    const {
      confirmRef,
      confirmEmail,
      confirmStatus,
      confirmNext,
      confirmPilotBox,
      confirmBannerTitle,
      confirmBannerText,
      confirmDetails
    } = getBookingModalElements();

    const bookings = runtime.getBookings().slice();
    const record = runtime.buildBookingRecord(ref, currentBookingItem, email);
    const createdAtLabel = new Date(record.createdAt || Date.now()).toLocaleString('de-DE', {
      day:'2-digit',
      month:'2-digit',
      year:'numeric',
      hour:'2-digit',
      minute:'2-digit'
    });
    const isHotelBooking = currentBookingItem.type === 'hotel';
    if(confirmRef) confirmRef.textContent = ref;
    if(confirmEmail) confirmEmail.textContent = isHotelBooking ? (email || 'lokal in TravelLogik gespeichert') : (pilotEmail || `${pilotLabel} (manuelle Uebergabe)`);

    if(isHotelBooking){
      const tripContext = offer.tripContext || {};
      const cancellation = buildHotelCancellation(offer, tripContext);
      const readiness = deriveHotelBookingReadiness(offer);
      const roomRateHint = buildHotelTariffHint(offer);
      const externalUrl = offer.bookingUrl || offer.handoffUrl || offer.providerDeeplink || offer.url || offer.deepLink || '';
      const providerLabel = /booking\.com/i.test(externalUrl) ? 'Booking.com' : (offer.providerName || 'Externer Anbieter');
      const statusLabel = 'Vorgeschlagen';
      const rooms = getHotelRooms();
      const guestSnapshot = [{
        firstName: document.getElementById('pax-fn-0')?.value.trim() || '',
        lastName: document.getElementById('pax-ln-0')?.value.trim() || '',
        type:'adult'
      }];
      const hotelReservation = {
        status: 'proposed',
        provider: providerLabel,
        externalUrl,
        externalReservationReference: '',
        guestSnapshot,
        priceSnapshot: {
          nightlyAmount: offer.pricePerNight || 0,
          totalAmount: record.total,
          currency: record.currency || 'EUR'
        }
      };
      const hotelSummary = [
        `TravelLogik externer Hotelfall ${ref}`,
        '',
        'STATUS',
        statusLabel,
        '',
        hotelReservation.externalReservationReference ? `Externe Reservierungsreferenz: ${hotelReservation.externalReservationReference}` : '',
        `Modul: ${runtime.getModuleMeta(currentBookingItem.type).label}`,
        `Hotel: ${record.name}`,
        `Details: ${record.detail}`,
        `Check-in: ${formatDate(tripContext.startDate)}`,
        `Check-out: ${formatDate(tripContext.endDate)}`,
        `Gaeste: ${tripContext.pax || 1}`,
        `Zimmer: ${rooms}`,
        `Zimmer / Tarif: ${roomRateHint}`,
        offer.roomOptionNote ? `Tarifdetail: ${offer.roomOptionNote}` : '',
        offer.board ? `Verpflegung: ${offer.board}` : '',
        buildHotelRoomFacts(offer) ? `Zimmerdetails: ${buildHotelRoomFacts(offer)}` : '',
        hotelArrivalWindow ? `Ankunft: ${hotelArrivalWindow}` : '',
        hotelRoomPreference ? `Zimmerlage: ${hotelRoomPreference}` : '',
        hotelBedPreference ? `Bettwunsch: ${hotelBedPreference}` : '',
        `Storno: ${cancellation.label}`,
        `Gesamtschaetzung: €${record.total}`,
        `Anbieter: ${providerLabel}`,
        externalUrl ? `Externe URL: ${externalUrl}` : '',
        `Erfasst am: ${createdAtLabel}`,
        `Kontakt: ${name}`,
        `E-Mail: ${email}`,
        phone ? `Telefon: ${phone}` : '',
        notes ? `Hinweise: ${notes}` : '',
        '',
        'NAECHSTER SCHRITT',
        'Hotel extern beim Anbieter buchen oder oeffnen und danach den Tracking-Status in TravelLogik aktualisieren.'
      ].filter(Boolean).join('\n');
      const hotelRecord = {
        ...record,
        workflow: 'external-hotel-tracking',
        externalReservationReference: hotelReservation.externalReservationReference || '',
        handoffProvider: providerLabel,
        handoffUrl: externalUrl,
        contactName: name,
        contactPhone: phone,
        requestNotes: notes,
        preferredChannel: preferredChannel,
        requestSummary: hotelSummary,
        requestSubject: `TravelLogik Hotelakte ${ref} - ${record.name}`,
        offerUrl: offer.url || offer.deepLink || '',
        bookingReadiness: readiness,
        hotelReservation,
        hotelBookingStatus: 'proposed',
        status: 'proposed',
        statusLabel,
        confirmedAt: '',
        lastUpdatedAt: record.createdAt,
        checkIn: tripContext.startDate || '',
        checkOut: tripContext.endDate || '',
        guests: tripContext.pax || 1,
        rooms,
        roomRateHint,
        boardType: offer.board || '',
        roomFacts: buildHotelRoomFacts(offer),
        arrivalWindow: hotelArrivalWindow,
        roomPreference: hotelRoomPreference,
        bedPreference: hotelBedPreference,
        rateNote: offer.roomOptionNote || '',
        cancellationDeadline: cancellation.deadline,
        cancellationLabel: cancellation.label,
        statusHistory: [{
          from: 'draft',
          to: 'proposed',
          at: record.createdAt
        }]
      };
      bookings.unshift(hotelRecord);
      runtime.setBookings(bookings);
      runtime.syncTripCoreFromBookings();
      runtime.persistBookings(bookings);
      runtime.refreshRelatedViews();

      if(confirmStatus){
        confirmStatus.textContent = statusLabel;
        confirmStatus.className = `status-pill status-${getHotelStatusClass('proposed')}`;
      }
      if(confirmRef) confirmRef.textContent = hotelReservation.externalReservationReference || ref;
      if(confirmEmail) confirmEmail.textContent = email || 'lokal gespeichert';
      if(confirmBannerTitle) confirmBannerTitle.textContent = 'Externer Hotelfall gespeichert.';
      if(confirmBannerText) confirmBannerText.textContent = 'Die Auswahl wurde fuer Reise- und Kosten-Tracking gespeichert. Die eigentliche Hotelbuchung findet weiterhin beim Anbieter statt.';
      if(confirmNext) confirmNext.textContent = 'Naechster Schritt: extern buchen oder Anbieter-Link oeffnen und danach den Tracking-Status in der Buchungsansicht aktualisieren.';
      if(confirmDetails) confirmDetails.innerHTML = buildHotelPreparationDetails(hotelRecord);
      if(confirmPilotBox){
        confirmPilotBox.innerHTML = `
          <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.75rem">
            <button class="btn btn-primary btn-sm" onclick="showPage('page-bookings')">Zu Buchungen</button>
            <button class="btn btn-outline btn-sm" onclick="copyPilotRequest('${ref}')">Tracking-Details kopieren</button>
            ${externalUrl ? `<button class="btn btn-outline btn-sm" onclick="window.open(${JSON.stringify(externalUrl)},'_blank','noopener')">Extern oeffnen</button>` : ''}
            <button class="btn btn-outline btn-sm" onclick="downloadBookingCalendar('${ref}')">In Kalender notieren</button>
          </div>
          <div style="font-size:.76rem;color:var(--text-light);margin-top:.55rem">${escapeHtml('TravelLogik fuehrt dieses Hotel nur fuer Kosten und Reiseverlauf. Abschluss und Bestaetigung laufen extern beim Anbieter.')}</div>`;
      }

      const doneKey = runtime.getModuleMeta(currentBookingItem.type).doneKey;
      if(doneKey) runtime.markDone(doneKey);
      return true;
    }

    const requestSummary = [
      `TravelLogik Pilotanfrage ${ref}`,
      '',
      'STATUS',
      'Eingegangen',
      '',
      'OPS-RAHMEN',
      `Pilot-Inbox: ${pilotEmail || 'manuelle Weitergabe erforderlich'}`,
      `Pilot-Team: ${pilotLabel}`,
      `Bearbeitet von: ${operatorName}`,
      `Standard-Rueckmeldung: innerhalb von ${responseTimeHours} Stunden via ${opsContactChannel}`,
      `Anfrage eingegangen am: ${createdAtLabel}`,
      '',
      `Modul: ${runtime.getModuleMeta(currentBookingItem.type).label}`,
      `Angebot: ${record.name}`,
      `Details: ${record.detail}`,
      `Gesamtschaetzung: €${record.total}`,
      `Anfrage-Typ: ${requestType}`,
      `Bevorzugter Kontaktweg: ${preferredChannel}`,
      `Kontakt: ${name}`,
      `E-Mail: ${email}`,
      phone ? `Telefon: ${phone}` : '',
      notes ? `Hinweise: ${notes}` : '',
      '',
      'NAECHSTER SCHRITT',
      `Bitte die Auswahl manuell pruefen und innerhalb von ${responseTimeHours} Stunden eine erste Rueckmeldung geben.`
    ].filter(Boolean).join('\n');
    const enrichedRecord = {
      ...record,
      contactName: name,
      contactPhone: phone,
      requestNotes: notes,
      requestType,
      preferredChannel,
      pilotEmail,
      pilotLabel,
      operatorName,
      responseTimeHours,
      opsContactChannel,
      requestSummary,
      requestSubject: `TravelLogik Pilotanfrage ${ref} - ${record.name}`,
      offerUrl: offer.url || offer.deepLink || '',
      status: 'received',
      lastUpdatedAt: record.createdAt,
      statusHistory: [{
        from: 'draft',
        to: 'received',
        at: record.createdAt
      }]
    };

    bookings.unshift(enrichedRecord);
    runtime.setBookings(bookings);
    runtime.syncTripCoreFromBookings();
    runtime.persistBookings(bookings);
    runtime.refreshRelatedViews();

    if(confirmStatus) confirmStatus.textContent = 'Eingegangen';
    if(confirmRef) confirmRef.textContent = ref;
    if(confirmEmail) confirmEmail.textContent = pilotEmail || `${pilotLabel} (manuelle Uebergabe)`;
    if(confirmBannerTitle) confirmBannerTitle.textContent = 'Anfrage lokal vorbereitet.';
    if(confirmBannerText) confirmBannerText.textContent = 'Die Auswahl wurde gespeichert und fuer die manuelle Weiterbearbeitung vorbereitet.';
    if(confirmDetails) confirmDetails.innerHTML = '';
    if(confirmNext) confirmNext.textContent = pilotEmail
      ? `${pilotLabel} bearbeitet diese Anfrage manuell. Erste Rueckmeldung idealerweise innerhalb von ${responseTimeHours} Stunden via ${opsContactChannel}.`
      : `Die Anfrage ist als sauberer Pilotfall vorbereitet. Fuer echten externen Test jetzt noch eine Pilot-Inbox konfigurieren oder den Text manuell weitergeben.`;
    if(confirmPilotBox){
      confirmPilotBox.innerHTML = `
        <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.75rem">
          <button class="btn btn-primary btn-sm" onclick="openPilotRequest('${ref}')">${pilotEmail ? 'An Pilot-Inbox senden' : 'Anfragetext anzeigen'}</button>
          <button class="btn btn-outline btn-sm" onclick="copyPilotRequest('${ref}')">Text kopieren</button>
        </div>
        <div style="font-size:.76rem;color:var(--text-light);margin-top:.55rem">${pilotEmail ? `Pilot-Inbox: ${pilotEmail} · Rueckmeldung innerhalb von ${responseTimeHours}h via ${opsContactChannel}` : 'Noch keine Pilot-Inbox konfiguriert. Hinterlegen Sie in den Einstellungen mindestens E-Mail, Rueckmeldefenster und Kontaktweg.'}</div>`;
    }

    const doneKey = runtime.getModuleMeta(currentBookingItem.type).doneKey;
    if(doneKey) runtime.markDone(doneKey);
    return true;
  }

  async function modalNext(){
    const modalStep = runtime.getModalStep();
    const currentBookingItem = runtime.getCurrentBookingItem();
    const isHotel = currentBookingItem?.type === 'hotel';
    const isFlight = currentBookingItem?.type === 'flight';
    const isCar = currentBookingItem?.type === 'car';
    const isTransfer = currentBookingItem?.type === 'transfer';

    if(modalStep === 1){
      const nextStep = 2;
      runtime.setModalStep(nextStep);
      toggleModalSteps(nextStep);
      updateSteps();
      setModalButtons(nextStep);
      return;
    }

    if(modalStep === 2){
      if(isHotel){
        // Hotels skip technical rate check in modal, they use honest tracking
      } else if(isFlight){
        await performFlightFareCheck();
      } else if(isCar){
        await performCarAvailabilityCheck();
      } else if(isTransfer){
        await performTransferPriceCheck();
      }
      const nextStep = 3;
      runtime.setModalStep(nextStep);
      toggleModalSteps(nextStep);
      updateSteps();
      setModalButtons(nextStep);
      return;
    }

    if(modalStep === 3){
      let success = false;
      if(isHotel){
        success = confirmBookingStep();
      } else if(isFlight){
        success = await performFlightBooking();
      } else if(isCar){
        success = await performCarBooking();
      } else if(isTransfer){
        success = await performTransferBooking();
      } else {
        success = confirmBookingStep();
      }
      
      if(!success) return;

      const nextStep = 4;
      runtime.setModalStep(nextStep);
      toggleModalSteps(nextStep);
      updateSteps();
      setModalButtons(nextStep);
    }
  }

  async function performCarAvailabilityCheck(){
    const currentBookingItem = runtime.getCurrentBookingItem();
    const offer = currentBookingItem.offer || currentBookingItem.item || {};
    const service = global.TravelLogikCarService;
    if(!service) return;

    const {nextButton} = getBookingModalElements();
    const originalText = nextButton.innerHTML;
    nextButton.disabled = true;
    nextButton.innerHTML = '<span class="spinner-sm"></span> Verfügbarkeit prüfen...';

    try {
      const result = await service.availabilityCheck({
        carId: offer.id,
        totalAmount: offer.total
      });

      if(result.status === 'failed'){
        alert(`Verfügbarkeits-Prüfung fehlgeschlagen: ${result.errors[0]?.message || 'Unbekannter Fehler'}`);
        return false;
      }

      currentBookingItem.offer.availabilityToken = result.availabilityToken;
      runtime.setCurrentBookingItem(currentBookingItem);
      return true;
    } catch(err){
      alert(`Technischer Fehler beim Car-Check: ${err.message}`);
      return false;
    } finally {
      nextButton.disabled = false;
      nextButton.innerHTML = originalText;
    }
  }

  async function performCarBooking(){
    const name = document.getElementById('request-name')?.value.trim() || '';
    const email = document.getElementById('contact-email')?.value.trim() || '';
    const consent = !!document.getElementById('request-consent')?.checked;
    if(!name || !email || !consent){
      alert('Bitte Kontaktangaben und Einwilligung fuer die Buchung ergaenzen.');
      return false;
    }

    const currentBookingItem = runtime.getCurrentBookingItem();
    const offer = currentBookingItem.offer || currentBookingItem.item || {};
    const service = global.TravelLogikCarService;
    if(!service) return false;

    const {nextButton} = getBookingModalElements();
    const originalText = nextButton.innerHTML;
    nextButton.disabled = true;

    try {
      nextButton.innerHTML = '<span class="spinner-sm"></span> Fahrzeug reservieren...';
      const prebookResult = await service.prebook({
        availabilityToken: offer.availabilityToken,
        totalAmount: offer.total
      });

      if(prebookResult.status === 'failed'){
        alert(`Car-Prebook fehlgeschlagen: ${prebookResult.errors[0]?.message || 'Unbekannter Fehler'}`);
        return false;
      }

      nextButton.innerHTML = '<span class="spinner-sm"></span> Buchung wird erstellt...';
      const resResult = await service.reservationCreate({
        prebookToken: prebookResult.prebookToken,
        carId: offer.id,
        driverName: name
      });

      if(resResult.status === 'failed'){
        alert(`Car-Buchung fehlgeschlagen: ${resResult.errors[0]?.message || 'Unbekannter Fehler'}`);
        return false;
      }

      finalizeCarBooking(resResult);
      return true;
    } catch(err){
      alert(`Technischer Fehler bei der Car-Buchung: ${err.message}`);
      return false;
    } finally {
      nextButton.disabled = false;
      nextButton.innerHTML = originalText;
    }
  }

  function finalizeCarBooking(resResult){
    const currentBookingItem = runtime.getCurrentBookingItem();
    const offer = currentBookingItem.offer || currentBookingItem.item || {};
    const email = document.getElementById('contact-email')?.value.trim() || '';
    
    const ref = resResult.externalReservationReference;
    const bookings = runtime.getBookings().slice();
    const record = runtime.buildBookingRecord(ref, currentBookingItem, email);

    const carRecord = {
      ...record,
      workflow: 'car-reservation',
      status: 'booked',
      statusLabel: 'Bestätigt',
      reservationId: resResult.reservationId,
      externalReservationReference: resResult.externalReservationReference,
      bookedAt: resResult.bookedAt,
      statusHistory: [{
        from: 'draft',
        to: 'booked',
        at: resResult.bookedAt
      }]
    };

    bookings.unshift(carRecord);
    runtime.setBookings(bookings);
    runtime.syncTripCoreFromBookings();
    runtime.persistBookings(bookings);
    runtime.refreshRelatedViews();

    const {
      confirmRef,
      confirmEmail,
      confirmStatus,
      confirmNext,
      confirmPilotBox,
      confirmBannerTitle,
      confirmBannerText,
      confirmDetails
    } = getBookingModalElements();

    if(confirmRef) confirmRef.textContent = ref;
    if(confirmEmail) confirmEmail.textContent = email;
    if(confirmStatus){
      confirmStatus.textContent = 'Bestätigt';
      confirmStatus.className = 'status-pill status-booked';
    }
    if(confirmBannerTitle) confirmBannerTitle.textContent = 'Mietwagen erfolgreich reserviert!';
    if(confirmBannerText) confirmBannerText.textContent = `Ihre Reservierung für den ${offer.name} wurde beim Anbieter ${offer.provider} bestätigt.`;
    if(confirmNext) confirmNext.textContent = 'Sie finden alle Details nun in Ihrer Reiseuebersicht.';
    if(confirmDetails) confirmDetails.innerHTML = `
      <div class="price-summary" style="margin-top:.8rem;background:var(--bg)">
        <div class="price-row"><span>Anbieter</span><strong>${offer.provider}</strong></div>
        <div class="price-row"><span>Fahrzeug</span><strong>${offer.name}</strong></div>
        <div class="price-row"><span>Referenz</span><strong>${resResult.externalReservationReference}</strong></div>
      </div>`;
    
    if(confirmPilotBox){
      confirmPilotBox.innerHTML = `
        <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.75rem">
          <button class="btn btn-primary btn-sm" onclick="showPage('page-bookings')">Zu meinen Buchungen</button>
        </div>`;
    }

    const doneKey = runtime.getModuleMeta(currentBookingItem.type).doneKey;
    if(doneKey) runtime.markDone(doneKey);
  }

  async function performTransferPriceCheck(){
    const currentBookingItem = runtime.getCurrentBookingItem();
    const offer = currentBookingItem.offer || currentBookingItem.item || {};
    const service = global.TravelLogikTransferService;
    if(!service) return;

    const {nextButton} = getBookingModalElements();
    const originalText = nextButton.innerHTML;
    nextButton.disabled = true;
    nextButton.innerHTML = '<span class="spinner-sm"></span> Preis prüfen...';

    try {
      const result = await service.priceCheck({
        transferId: offer.id,
        totalAmount: offer.total
      });

      currentBookingItem.offer.transferToken = result.transferToken;
      runtime.setCurrentBookingItem(currentBookingItem);
      return true;
    } catch(err){
      alert(`Technischer Fehler beim Transfer-Check: ${err.message}`);
      return false;
    } finally {
      nextButton.disabled = false;
      nextButton.innerHTML = originalText;
    }
  }

  async function performTransferBooking(){
    const name = document.getElementById('request-name')?.value.trim() || '';
    const email = document.getElementById('contact-email')?.value.trim() || '';
    const consent = !!document.getElementById('request-consent')?.checked;
    if(!name || !email || !consent){
      alert('Bitte Kontaktangaben und Einwilligung fuer die Buchung ergaenzen.');
      return false;
    }

    const currentBookingItem = runtime.getCurrentBookingItem();
    const offer = currentBookingItem.offer || currentBookingItem.item || {};
    const service = global.TravelLogikTransferService;
    if(!service) return false;

    const {nextButton} = getBookingModalElements();
    const originalText = nextButton.innerHTML;
    nextButton.disabled = true;

    try {
      nextButton.innerHTML = '<span class="spinner-sm"></span> Transfer buchen...';
      const resResult = await service.reservationCreate({
        transferToken: offer.transferToken,
        transferId: offer.id,
        passengerName: name
      });

      finalizeTransferBooking(resResult);
      return true;
    } catch(err){
      alert(`Technischer Fehler bei der Transfer-Buchung: ${err.message}`);
      return false;
    } finally {
      nextButton.disabled = false;
      nextButton.innerHTML = originalText;
    }
  }

  function finalizeTransferBooking(resResult){
    const currentBookingItem = runtime.getCurrentBookingItem();
    const offer = currentBookingItem.offer || currentBookingItem.item || {};
    const email = document.getElementById('contact-email')?.value.trim() || '';
    
    const ref = resResult.externalReservationReference;
    const bookings = runtime.getBookings().slice();
    const record = runtime.buildBookingRecord(ref, currentBookingItem, email);

    const transferRecord = {
      ...record,
      workflow: 'transfer-reservation',
      status: 'booked',
      statusLabel: 'Bestätigt',
      reservationId: resResult.reservationId,
      externalReservationReference: resResult.externalReservationReference,
      bookedAt: resResult.bookedAt,
      statusHistory: [{
        from: 'draft',
        to: 'booked',
        at: resResult.bookedAt
      }]
    };

    bookings.unshift(transferRecord);
    runtime.setBookings(bookings);
    runtime.syncTripCoreFromBookings();
    runtime.persistBookings(bookings);
    runtime.refreshRelatedViews();

    const {
      confirmRef,
      confirmEmail,
      confirmStatus,
      confirmNext,
      confirmPilotBox,
      confirmBannerTitle,
      confirmBannerText,
      confirmDetails
    } = getBookingModalElements();

    if(confirmRef) confirmRef.textContent = ref;
    if(confirmEmail) confirmEmail.textContent = email;
    if(confirmStatus){
      confirmStatus.textContent = 'Bestätigt';
      confirmStatus.className = 'status-pill status-booked';
    }
    if(confirmBannerTitle) confirmBannerTitle.textContent = 'Transfer erfolgreich gebucht!';
    if(confirmBannerText) confirmBannerText.textContent = `Ihre Fahrt von ${offer.from} nach ${offer.to} wurde bestätigt.`;
    if(confirmDetails) confirmDetails.innerHTML = `
      <div class="price-summary" style="margin-top:.8rem;background:var(--bg)">
        <div class="price-row"><span>Service</span><strong>${offer.name}</strong></div>
        <div class="price-row"><span>Referenz</span><strong>${resResult.externalReservationReference}</strong></div>
      </div>`;
    
    // Auto-Return Trip Logic
    const trip = runtime.getTrip?.() || {};
    const isDestinationTransfer = offer.transferMode === 'destination';
    
    if(isDestinationTransfer && trip.retDate){
      if(confirmPilotBox){
        confirmPilotBox.innerHTML = `
          <div class="card" style="margin-top:1rem;background:var(--accent-light);border-color:var(--accent);padding:.8rem">
            <div style="font-weight:700;color:var(--primary);margin-bottom:.3rem">🔄 Rückfahrt einplanen?</div>
            <p style="font-size:.82rem;margin-bottom:.6rem">Möchten Sie die passende Rückfahrt von <strong>${offer.to}</strong> zum Flughafen <strong>${offer.from}</strong> am <strong>${global.TravelLogikSettings?.fmtDate(trip.retDate)}</strong> direkt ebenfalls buchen?</p>
            <button class="btn btn-primary btn-sm" onclick="TravelLogikBookingModal.createReturnTransfer('${offer.id}')">Ja, Rückfahrt ebenfalls buchen</button>
            <button class="btn btn-outline btn-sm" onclick="showPage('page-bookings')">Nein, nur diese Fahrt</button>
          </div>`;
      }
    } else {
      if(confirmPilotBox){
        confirmPilotBox.innerHTML = `
          <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.75rem">
            <button class="btn btn-primary btn-sm" onclick="showPage('page-bookings')">Zu meinen Buchungen</button>
          </div>`;
      }
    }
    
    const doneKey = runtime.getModuleMeta(currentBookingItem.type).doneKey;
    if(doneKey) runtime.markDone(doneKey);
  }

  async function createReturnTransfer(originalOfferId){
    const bookings = runtime.getBookings();
    const originalBooking = bookings.find(b => b.offerSnapshot?.id === originalOfferId);
    if(!originalBooking) return;

    const offer = originalBooking.offerSnapshot;
    const trip = runtime.getTrip?.() || {};

    const {nextButton} = getBookingModalElements();
    const originalText = nextButton?.innerHTML;
    if(nextButton){
      nextButton.disabled = true;
      nextButton.innerHTML = '<span class="spinner-sm"></span> Rückfahrt wird erstellt...';
    }

    try {
      // Simulate booking service call for return
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const resResult = {
        externalReservationReference: 'TRF-RET-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
        reservationId: 'tres_ret_' + Math.random().toString(36).slice(2, 10),
        bookedAt: new Date().toISOString()
      };

      // Create return record by swapping from/to
      const email = originalBooking.contactEmail || '';
      const returnOffer = {
        ...offer,
        id: offer.id + '_ret',
        offerId: offer.id + '_ret',
        from: offer.to,
        to: offer.from,
        title: `✈️→🏨 Transfer: ${offer.to} → ${offer.from} (Rückreise)`
      };
      
      const ref = resResult.externalReservationReference;
      const allBookings = runtime.getBookings().slice();
      const record = runtime.buildBookingRecord(ref, {type:'transfer', offer: returnOffer, total: offer.total}, email);

      const returnRecord = {
        ...record,
        name: `Rückfahrt: ${offer.to} → ${offer.from}`,
        workflow: 'transfer-reservation',
        status: 'booked',
        statusLabel: 'Bestätigt',
        reservationId: resResult.reservationId,
        externalReservationReference: resResult.externalReservationReference,
        bookedAt: resResult.bookedAt,
        statusHistory: [{
          from: 'draft',
          to: 'booked',
          at: resResult.bookedAt
        }]
      };

      allBookings.unshift(returnRecord);
      runtime.setBookings(allBookings);
      runtime.syncTripCoreFromBookings();
      runtime.persistBookings(allBookings);
      runtime.refreshRelatedViews();

      alert('Die Rückfahrt wurde erfolgreich für den ' + (global.TravelLogikSettings?.fmtDate(trip.retDate) || 'Abreisetag') + ' gebucht!');
      closeModal();
      showPage('page-bookings');
    } catch(err){
      alert('Fehler bei der Rückfahrt-Buchung: ' + err.message);
    } finally {
      if(nextButton){
        nextButton.disabled = false;
        nextButton.innerHTML = originalText;
      }
    }
  }

  async function performFlightFareCheck(){
    const currentBookingItem = runtime.getCurrentBookingItem();
    const offer = currentBookingItem.offer || currentBookingItem.item || {};
    const service = global.TravelLogikFlightService;
    if(!service) return;

    const {nextButton} = getBookingModalElements();
    const originalText = nextButton.innerHTML;
    nextButton.disabled = true;
    nextButton.innerHTML = '<span class="spinner-sm"></span> Tarif prüfen...';

    try {
      const result = await service.fareCheck({
        flightId: offer.id,
        price: offer.price
      });

      if(result.status === 'failed'){
        alert(`Tarif-Prüfung fehlgeschlagen: ${result.errors[0]?.message || 'Unbekannter Fehler'}`);
        return false;
      }

      // Update offer with fare token
      currentBookingItem.offer.fareToken = result.fareToken;
      if(result.priceChanged){
        alert(`Der Preis hat sich geändert: Alt €${offer.price} -> Neu €${result.newPrice}`);
        currentBookingItem.offer.price = result.newPrice;
        currentBookingItem.offer.total = result.newPrice * (offer.tripContext?.pax || 1);
        updateBookingPricingDisplay(currentBookingItem);
      }
      runtime.setCurrentBookingItem(currentBookingItem);
      return true;
    } catch(err){
      alert(`Technischer Fehler beim Tarif-Check: ${err.message}`);
      return false;
    } finally {
      nextButton.disabled = false;
      nextButton.innerHTML = originalText;
    }
  }

  async function performFlightBooking(){
    const name = document.getElementById('request-name')?.value.trim() || '';
    const email = document.getElementById('contact-email')?.value.trim() || '';
    const consent = !!document.getElementById('request-consent')?.checked;
    if(!name || !email || !consent){
      alert('Bitte Kontaktangaben und Einwilligung fuer die Buchung ergaenzen.');
      return false;
    }

    const currentBookingItem = runtime.getCurrentBookingItem();
    const offer = currentBookingItem.offer || currentBookingItem.item || {};
    const service = global.TravelLogikFlightService;
    if(!service) return false;

    const {nextButton} = getBookingModalElements();
    const originalText = nextButton.innerHTML;
    nextButton.disabled = true;

    try {
      // 1. Prebook
      nextButton.innerHTML = '<span class="spinner-sm"></span> Flug reservieren...';
      const prebookResult = await service.prebook({
        fareToken: offer.fareToken,
        totalAmount: offer.total,
        guests: [{
          firstName: document.getElementById('pax-fn-0')?.value.trim() || '',
          lastName: document.getElementById('pax-ln-0')?.value.trim() || '',
          type: 'adult'
        }]
      });

      if(prebookResult.status === 'failed'){
        alert(`Flug-Prebook fehlgeschlagen: ${prebookResult.errors[0]?.message || 'Unbekannter Fehler'}`);
        return false;
      }

      // 2. Reservation Create
      nextButton.innerHTML = '<span class="spinner-sm"></span> Ticket wird ausgestellt...';
      const resResult = await service.reservationCreate({
        prebookToken: prebookResult.prebookToken,
        flightId: offer.id,
        guests: [{
          firstName: document.getElementById('pax-fn-0')?.value.trim() || '',
          lastName: document.getElementById('pax-ln-0')?.value.trim() || '',
          type: 'adult'
        }]
      });

      if(resResult.status === 'failed'){
        alert(`Flug-Buchung fehlgeschlagen: ${resResult.errors[0]?.message || 'Unbekannter Fehler'}`);
        return false;
      }

      // 3. Finalize
      finalizeFlightBooking(resResult);
      return true;
    } catch(err){
      alert(`Technischer Fehler bei der Flugbuchung: ${err.message}`);
      return false;
    } finally {
      nextButton.disabled = false;
      nextButton.innerHTML = originalText;
    }
  }

  function finalizeFlightBooking(resResult){
    const currentBookingItem = runtime.getCurrentBookingItem();
    const offer = currentBookingItem.offer || currentBookingItem.item || {};
    const email = document.getElementById('contact-email')?.value.trim() || '';
    
    const ref = resResult.pnr;
    const bookings = runtime.getBookings().slice();
    const record = runtime.buildBookingRecord(ref, currentBookingItem, email);

    const flightRecord = {
      ...record,
      workflow: 'flight-reservation',
      status: 'booked',
      statusLabel: 'Ticket ausgestellt',
      pnr: resResult.pnr,
      ticketNumbers: resResult.ticketNumbers,
      airlineConfirmation: resResult.airlineConfirmation,
      bookedAt: resResult.bookedAt,
      statusHistory: [{
        from: 'draft',
        to: 'booked',
        at: resResult.bookedAt
      }]
    };

    bookings.unshift(flightRecord);
    runtime.setBookings(bookings);
    runtime.syncTripCoreFromBookings();
    runtime.persistBookings(bookings);
    runtime.refreshRelatedViews();

    // Update UI
    const {
      confirmRef,
      confirmEmail,
      confirmStatus,
      confirmNext,
      confirmPilotBox,
      confirmBannerTitle,
      confirmBannerText,
      confirmDetails
    } = getBookingModalElements();

    if(confirmRef) confirmRef.textContent = ref;
    if(confirmEmail) confirmEmail.textContent = email;
    if(confirmStatus){
      confirmStatus.textContent = 'Ticket ausgestellt';
      confirmStatus.className = 'status-pill status-booked';
    }
    if(confirmBannerTitle) confirmBannerTitle.textContent = 'Flug erfolgreich gebucht!';
    if(confirmBannerText) confirmBannerText.textContent = `Ihr Ticket wurde ausgestellt (PNR: ${resResult.pnr}). Die Airline-Bestätigung liegt vor.`;
    if(confirmNext) confirmNext.textContent = 'Ihre Buchung ist nun in Ihrer Reiseuebersicht sichtbar. Sie erhalten in Kürze eine Bestätigungs-E-Mail von der Airline.';
    if(confirmDetails) confirmDetails.innerHTML = `
      <div class="price-summary" style="margin-top:.8rem;background:var(--bg)">
        <div class="price-row"><span>Fluggesellschaft</span><strong>${offer.airline?.name || 'Airline'}</strong></div>
        <div class="price-row"><span>Ticketnummern</span><strong>${resResult.ticketNumbers.join(', ')}</strong></div>
        <div class="price-row"><span>Buchungscode (PNR)</span><strong>${resResult.pnr}</strong></div>
      </div>`;
    
    if(confirmPilotBox){
      confirmPilotBox.innerHTML = `
        <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.75rem">
          <button class="btn btn-primary btn-sm" onclick="showPage('page-bookings')">Zu meinen Buchungen</button>
          <button class="btn btn-outline btn-sm" onclick="downloadBookingCalendar('${flightRecord.id}')">In Kalender notieren</button>
        </div>`;
    }

    const doneKey = runtime.getModuleMeta(currentBookingItem.type).doneKey;
    if(doneKey) runtime.markDone(doneKey);
  }

  function chooseHotelRateInModal(optionId){
    const currentBookingItem = runtime.getCurrentBookingItem();
    if(currentBookingItem?.type !== 'hotel') return;
    const currentOffer = currentBookingItem.offer || currentBookingItem.item || {};
    const option = getHotelRoomOptions(currentOffer).find(entry=>entry.id === optionId);
    if(!option) return;
    const nextOffer = applyHotelRoomOption(currentOffer, option);
    const nextBookingItem = {
      ...currentBookingItem,
      offer: nextOffer,
      item: nextOffer
    };
    runtime.setCurrentBookingItem(nextBookingItem);
    const {bookingSummary} = getBookingModalElements();
    if(bookingSummary) bookingSummary.innerHTML = renderHotelSelectionSummary(nextOffer);
    updateBookingPricingDisplay(nextBookingItem);
  }

  function modalBack(){
    const modalStep = runtime.getModalStep();
    if(modalStep > 1){
      const nextStep = modalStep - 1;
      runtime.setModalStep(nextStep);
      toggleModalSteps(nextStep);
      updateSteps();
      setModalButtons(nextStep);
    }
  }

  function registerBookingModalOverlay(){
    const {modal} = getBookingModalElements();
    modal?.addEventListener('click', function(e){
      if(e.target === this) closeModal();
    });
  }

  global.TravelLogikBookingModal = {
    configureTravelBookingModal,
    openBooking,
    closeModal,
    modalNext,
    modalBack,
    updateSteps,
    formatCard,
    formatExp,
    registerBookingModalOverlay,
    chooseHotelRateInModal,
    createReturnTransfer
  };

  global.openBooking = openBooking;
  global.closeModal = closeModal;
  global.modalNext = modalNext;
  global.modalBack = modalBack;
  global.updateSteps = updateSteps;
  global.formatCard = formatCard;
  global.formatExp = formatExp;
  global.chooseHotelRateInModal = chooseHotelRateInModal;
})(window);
