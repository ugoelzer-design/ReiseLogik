(function(global){
  'use strict';

  const runtime = {
    getBookings:()=>[],
    setBookings:()=>{},
    syncTripCoreFromBookings:()=>{},
    persistBookings:()=>{},
    refreshRelatedViews:()=>{},
    getModuleMeta:(type)=>({label:type, icon:'📄'}),
    getPilotConfig:()=>({contactEmail:'', contactLabel:'TravelLogik Pilotdesk', responseTimeHours:24, contactChannel:'E-Mail'}),
    openBooking:(type, item)=>global.openBooking?.(type, item)
  };
  let activeFilter = 'all';

  function configureTravelBookings(options = {}){
    if(typeof options.getBookings === 'function') runtime.getBookings = options.getBookings;
    if(typeof options.setBookings === 'function') runtime.setBookings = options.setBookings;
    if(typeof options.syncTripCoreFromBookings === 'function') runtime.syncTripCoreFromBookings = options.syncTripCoreFromBookings;
    if(typeof options.persistBookings === 'function') runtime.persistBookings = options.persistBookings;
    if(typeof options.refreshRelatedViews === 'function') runtime.refreshRelatedViews = options.refreshRelatedViews;
    if(typeof options.getModuleMeta === 'function') runtime.getModuleMeta = options.getModuleMeta;
    if(typeof options.getPilotConfig === 'function') runtime.getPilotConfig = options.getPilotConfig;
    if(typeof options.openBooking === 'function') runtime.openBooking = options.openBooking;
  }

  function getBookingTypeLabel(type){
    const meta = runtime.getModuleMeta(type);
    return `${meta.icon || '📄'} ${meta.label || type}`;
  }

  function escapeHtml(value){
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getStatusLabel(status){
    if(status === 'pending' || status === 'received') return 'Eingegangen';
    if(status === 'demo' || status === 'live-search' || status === 'precheck-required' || status === 'ready-to-book' || status === 'prepared' || status === 'proposed') return 'Vorgeschlagen';
    if(status === 'redirected' || status === 'external-opened') return 'Extern geoeffnet';
    if(status === 'external-completed' || status === 'booked' || status === 'external-booked') return 'Extern gebucht';
    if(status === 'confirmed' || status === 'external-confirmed') return 'Extern bestaetigt';
    if(status === 'failed') return 'Fehlgeschlagen';
    if(status === 'reviewing') return 'In Pruefung';
    if(status === 'waiting') return 'Rueckmeldung offen';
    if(status === 'completed') return 'Abgeschlossen';
    if(status === 'cancelled') return 'Storniert';
    if(status === 'archived') return 'Archiviert';
    return 'Offen';
  }

  function getBookingKindLabel(booking){
    if(isExternalHotelHandoff(booking)) return 'Externer Hotel-Handoff';
    if(isCurrentHotelTracking(booking)) return 'Externer Hotel-Tracking-Fall';
    if(isLegacyHotelTracking(booking)) return 'Externer Hotel-Tracking-Fall (alt)';
    return 'Anfragepfad';
  }

  function normalizeStatus(status){
    if(status === 'pending') return 'received';
    if(status === 'demo' || status === 'live-search' || status === 'precheck-required' || status === 'ready-to-book' || status === 'prepared') return 'proposed';
    if(status === 'redirected') return 'external-opened';
    if(status === 'external-completed' || status === 'booked') return 'external-booked';
    if(status === 'confirmed') return 'external-confirmed';
    return status || 'received';
  }

  function getStatusClass(status){
    const normalized = normalizeStatus(status);
    if(normalized === 'proposed') return 'waiting';
    if(normalized === 'external-opened') return 'received';
    if(normalized === 'external-booked') return 'external-completed';
    if(normalized === 'external-confirmed') return 'confirmed';
    if(normalized === 'failed') return 'cancelled';
    if(['received','reviewing','waiting','redirected','external-completed','completed','confirmed','cancelled','archived'].includes(normalized)) return normalized;
    return 'pending';
  }

  function isExternalHotelHandoff(booking){
    return booking?.workflow === 'external-hotel-handoff';
  }

  function isCurrentHotelTracking(booking){
    return ['external-hotel-tracking', 'hotel-external-tracking'].includes(booking?.workflow);
  }

  function isLegacyHotelTracking(booking){
    return ['self-serve-hotel-booking','hotel-booking-prepared','hotel-reservation'].includes(booking?.workflow);
  }

  function isSelfServeHotelBooking(booking){
    return isTrackedHotelBooking(booking) && normalizeStatus(booking?.status) === 'external-confirmed';
  }

  function isPreparedHotelBooking(booking){
    return isTrackedHotelBooking(booking) && ['proposed','external-opened','external-booked'].includes(normalizeStatus(booking?.status));
  }

  function isTrackedHotelBooking(booking){
    return isExternalHotelHandoff(booking) || isCurrentHotelTracking(booking) || isLegacyHotelTracking(booking);
  }

  function isHotelBooking(booking){
    return booking?.type === 'hotel';
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

  function buildRequestSummary(booking){
    if(isHotelBooking(booking)){
      const latestRedirectAt = booking.lastRedirectedAt || booking.lastUpdatedAt || booking.createdAt;
      const finalPrice = booking.finalPrice || booking.hotelReservation?.finalPrice || '';
      const hotelReservation = booking.hotelReservation || {};
      const normalizedStatus = normalizeStatus(booking.status);
      const nextStep = normalizedStatus === 'proposed'
        ? 'Hotel extern beim Anbieter oeffnen und danach den Tracking-Status aktualisieren.'
        : normalizedStatus === 'external-opened'
          ? 'Wenn der Abschluss erfolgt ist, lokal auf "Extern gebucht" oder direkt auf "Extern bestaetigt" setzen.'
          : normalizedStatus === 'external-booked'
            ? 'Bei finaler Bestaetigung den Status auf "Extern bestaetigt" stellen und wenn bekannt Endpreis oder Referenz nachtragen.'
            : normalizedStatus === 'external-confirmed'
              ? 'Der Hotel-Fall ist fuer Reise- und Kosten-Tracking abgeschlossen und kann bei Bedarf spaeter archiviert werden.'
              : 'Der externe Hotel-Fall bleibt nur noch dokumentiert sichtbar.';
      return [
        `TravelLogik externer Hotel-Fall ${booking.id}`,
        '',
        'STATUS',
        getStatusLabel(booking.status),
        '',
        `Hotel: ${booking.name}`,
        `Details: ${booking.detail}`,
        `Anbieter: ${booking.handoffProvider || hotelReservation.provider || booking.providerName || 'Nicht hinterlegt'}`,
        `Externe URL: ${booking.handoffUrl || hotelReservation.externalUrl || booking.offerUrl || 'nicht gespeichert'}`,
        hotelReservation.externalReservationReference ? `Externe Referenz: ${hotelReservation.externalReservationReference}` : '',
        `Erfasst am: ${formatDateTime(booking.createdAt)}`,
        booking.lastRedirectedAt ? `Zuletzt extern geoeffnet: ${formatDateTime(latestRedirectAt)}` : '',
        booking.lastExternalCompletionAt ? `Extern gebucht am: ${formatDateTime(booking.lastExternalCompletionAt)}` : '',
        booking.confirmedAt ? `Extern bestaetigt am: ${formatDateTime(booking.confirmedAt)}` : '',
        `Kostenschaetzung: €${booking.total || 0}`,
        finalPrice ? `Finaler Preis: €${finalPrice}` : '',
        booking.handoffSource ? `Quelle: ${booking.handoffSource}` : '',
        booking.confirmedBy ? `Bestaetigt von: ${booking.confirmedBy}` : '',
        booking.opsNote ? `Ops-Notiz: ${booking.opsNote}` : '',
        '',
        'HINWEIS',
        'TravelLogik fuehrt Hotels nur als externe Buchungsfaelle fuer Reiseverlauf und Kosten-Tracking. Abschluss, Zahlung und finale Bestaetigung laufen beim Anbieter.',
        '',
        'NAECHSTER SCHRITT',
        nextStep
      ].filter(Boolean).join('\n');
    }

    const pilotLabel = booking.pilotLabel || runtime.getPilotConfig?.().contactLabel || 'TravelLogik Pilotdesk';
    const pilotEmail = booking.pilotEmail || runtime.getPilotConfig?.().contactEmail || 'manuelle Weitergabe erforderlich';
    const responseTimeHours = booking.responseTimeHours || runtime.getPilotConfig?.().responseTimeHours || 24;
    const opsContactChannel = booking.opsContactChannel || runtime.getPilotConfig?.().contactChannel || 'E-Mail';
    const operatorName = booking.operatorName || pilotLabel;
    return [
      `TravelLogik Pilotanfrage ${booking.id}`,
      '',
      'STATUS',
      getStatusLabel(booking.status),
      '',
      'OPS-RAHMEN',
      `Pilot-Inbox: ${pilotEmail}`,
      `Pilot-Team: ${pilotLabel}`,
      `Bearbeitet von: ${operatorName}`,
      `Standard-Rueckmeldung: innerhalb von ${responseTimeHours} Stunden via ${opsContactChannel}`,
      `Anfrage eingegangen am: ${formatDateTime(booking.createdAt)}`,
      `Letzte Aktivitaet: ${formatDateTime(booking.lastUpdatedAt || booking.createdAt)}`,
      '',
      `Modul: ${getBookingTypeLabel(booking.type)}`,
      `Angebot: ${booking.name}`,
      `Details: ${booking.detail}`,
      `Gesamtschaetzung: €${booking.total}`,
      booking.requestType ? `Anfrage-Typ: ${booking.requestType}` : '',
      booking.preferredChannel ? `Bevorzugter Kontaktweg: ${booking.preferredChannel}` : '',
      booking.contactName ? `Kontakt: ${booking.contactName}` : '',
      booking.contactEmail ? `E-Mail: ${booking.contactEmail}` : '',
      booking.contactPhone ? `Telefon: ${booking.contactPhone}` : '',
      booking.requestNotes ? `Hinweise: ${booking.requestNotes}` : '',
      '',
      'NAECHSTER SCHRITT',
      ['completed','cancelled'].includes(normalizeStatus(booking.status))
        ? 'Vorgang ist abgeschlossen und bleibt als Pilotfall dokumentiert.'
        : `Bitte manuell pruefen und innerhalb von ${responseTimeHours} Stunden eine erste Rueckmeldung geben.`
    ].filter(Boolean).join('\n');
  }

  function getPrimaryAction(booking){
    const status = normalizeStatus(booking.status);
    if(isExternalHotelHandoff(booking)){
      if(status === 'redirected') return {label:'Extern abgeschlossen', nextStatus:'external-completed'};
      if(status === 'external-completed') return {label:'Buchung bestaetigt', nextStatus:'confirmed'};
      return null;
    }
    if(status === 'received') return {label:'In Pruefung', nextStatus:'reviewing'};
    if(status === 'reviewing') return {label:'Rueckmeldung offen', nextStatus:'waiting'};
    if(status === 'waiting') return {label:'Abschliessen', nextStatus:'completed'};
    return null;
  }

  function summarizeOps(bookings){
    return bookings.reduce((acc, booking)=>{
      const status = normalizeStatus(booking.status);
      acc[status] = (acc[status] || 0) + 1;
      if(isHotelBooking(booking)) acc.hotelTotal = (acc.hotelTotal || 0) + 1;
      if(status === 'proposed') acc.hotelProposed = (acc.hotelProposed || 0) + 1;
      if(status === 'external-opened') acc.hotelOpened = (acc.hotelOpened || 0) + 1;
      if(status === 'external-booked') acc.hotelBooked = (acc.hotelBooked || 0) + 1;
      if(status === 'external-confirmed') acc.hotelConfirmed = (acc.hotelConfirmed || 0) + 1;
      if(!isTrackedHotelBooking(booking)) acc.requests = (acc.requests || 0) + 1;
      return acc;
    }, {proposed:0, 'external-opened':0, 'external-booked':0, 'external-confirmed':0, failed:0, received:0, reviewing:0, waiting:0, completed:0, cancelled:0, archived:0, hotelTotal:0, hotelProposed:0, hotelOpened:0, hotelBooked:0, hotelConfirmed:0, requests:0});
  }

  function matchesFilter(booking, filter){
    if(filter === 'hotels') return isHotelBooking(booking);
    if(filter === 'requests') return !isTrackedHotelBooking(booking) && booking.status !== 'cancelled';
    if(filter === 'confirmed') return isHotelBooking(booking) && normalizeStatus(booking.status) === 'external-confirmed';
    if(filter === 'open') return ['proposed','external-opened','external-booked','received','reviewing','waiting'].includes(normalizeStatus(booking.status));
    if(filter === 'archived') return normalizeStatus(booking.status) === 'archived';
    return true;
  }

  function getVisibleBookings(bookings){
    return bookings.filter(booking=>matchesFilter(booking, activeFilter));
  }

  function renderFilterBar(bookings){
    const filters = [
      {id:'all', label:'Alle', count: bookings.filter(booking=>booking.status !== 'cancelled').length},
      {id:'hotels', label:'Nur Hotels', count: bookings.filter(booking=>matchesFilter(booking, 'hotels')).length},
      {id:'requests', label:'Nur Anfragen', count: bookings.filter(booking=>matchesFilter(booking, 'requests')).length},
      {id:'confirmed', label:'Hotel bestaetigt', count: bookings.filter(booking=>matchesFilter(booking, 'confirmed')).length},
      {id:'archived', label:'Archiv', count: bookings.filter(booking=>matchesFilter(booking, 'archived')).length},
      {id:'open', label:'Nur offen', count: bookings.filter(booking=>matchesFilter(booking, 'open')).length}
    ];
    return `
      <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin:1rem 0 .8rem">
        ${filters.map(filter=>`
          <button class="btn btn-sm ${activeFilter === filter.id ? 'btn-primary' : 'btn-outline'}" onclick="setBookingsFilter('${filter.id}')">
            ${filter.label} · ${filter.count}
          </button>
        `).join('')}
      </div>`;
  }

  function renderHotelOpsFields(booking){
    if(!isHotelBooking(booking)) return '';
    const reservation = booking.hotelReservation || {};
    return `
      <div style="margin-top:.55rem;padding:.65rem;background:var(--bg);border:1px solid var(--border);border-radius:10px">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:.55rem">
          <label style="font-size:.74rem;color:var(--text-light)">
            Anbieter
            <input id="ops-provider-${booking.id}" type="text" value="${escapeHtml(booking.handoffProvider || reservation.provider || booking.providerName || '')}" placeholder="z. B. Booking.com" style="width:100%;margin-top:.2rem;padding:.45rem .55rem;border:1px solid var(--border);border-radius:8px;background:#fff">
          </label>
          <label style="font-size:.74rem;color:var(--text-light)">
            Externe URL
            <input id="ops-url-${booking.id}" type="text" value="${escapeHtml(booking.handoffUrl || reservation.externalUrl || booking.offerUrl || '')}" placeholder="https://..." style="width:100%;margin-top:.2rem;padding:.45rem .55rem;border:1px solid var(--border);border-radius:8px;background:#fff">
          </label>
          <label style="font-size:.74rem;color:var(--text-light)">
            Externe Referenz
            <input id="ops-reference-${booking.id}" type="text" value="${escapeHtml(reservation.externalReservationReference || '')}" placeholder="optional" style="width:100%;margin-top:.2rem;padding:.45rem .55rem;border:1px solid var(--border);border-radius:8px;background:#fff">
          </label>
          <label style="font-size:.74rem;color:var(--text-light)">
            Finaler Preis
            <input id="ops-final-price-${booking.id}" type="number" min="0" step="0.01" value="${escapeHtml(String(booking.finalPrice || reservation.finalPrice || ''))}" placeholder="optional" style="width:100%;margin-top:.2rem;padding:.45rem .55rem;border:1px solid var(--border);border-radius:8px;background:#fff">
          </label>
          <label style="font-size:.74rem;color:var(--text-light)">
            Quelle
            <input id="ops-source-${booking.id}" type="text" value="${escapeHtml(booking.handoffSource || '')}" placeholder="z. B. Booking-Mail, Kunde" style="width:100%;margin-top:.2rem;padding:.45rem .55rem;border:1px solid var(--border);border-radius:8px;background:#fff">
          </label>
          <label style="font-size:.74rem;color:var(--text-light)">
            Bestaetigt von
            <input id="ops-confirmed-by-${booking.id}" type="text" value="${escapeHtml(booking.confirmedBy || '')}" placeholder="z. B. Ugo / Kunde" style="width:100%;margin-top:.2rem;padding:.45rem .55rem;border:1px solid var(--border);border-radius:8px;background:#fff">
          </label>
        </div>
        <label style="display:block;font-size:.74rem;color:var(--text-light);margin-top:.55rem">
          Notiz
          <textarea id="ops-note-${booking.id}" rows="2" placeholder="Kurze Ops-Notiz zum Handoff oder Abschluss" style="width:100%;margin-top:.2rem;padding:.5rem .55rem;border:1px solid var(--border);border-radius:8px;background:#fff;resize:vertical">${escapeHtml(booking.opsNote || '')}</textarea>
        </label>
        <div style="display:flex;justify-content:space-between;gap:.6rem;align-items:center;flex-wrap:wrap;margin-top:.45rem">
          <span style="font-size:.72rem;color:var(--text-light)">Lokal und ehrlich gespeichert: Anbieter, externe URL, optionale Referenz, Preise und Status fuer Reise- und Kosten-Tracking.</span>
          <button class="btn btn-outline btn-sm" onclick="saveBookingOpsFields('${booking.id}')">Ops-Felder speichern</button>
        </div>
      </div>`;
  }

  function buildOpsLead(copy, pilotConfig, bookings, stats){
    if(!pilotConfig.contactEmail){
      return 'Pilot-Inbox konfigurieren, bevor externe Tests fuer Anfragepfade live gehen.';
    }
    if(stats.reviewing > 0) return 'Aktive Anfragen befinden sich bereits in Pruefung. Naechster Schritt: manuelle Rueckmeldung vorbereiten.';
    if(stats.waiting > 0) return 'Offene Rueckmeldungen sichtbar halten und erst nach manuellem Follow-up abschliessen.';
    if(stats.hotelBooked > 0) return 'Mindestens ein Hotel ist bereits extern gebucht. Jetzt nur noch externe Bestaetigungen und Endpreise sauber nachziehen.';
    if(stats.hotelOpened > 0) return 'Externe Hotelseiten wurden bereits geoeffnet. Wenn der Abschluss erfolgt ist, den Tracking-Status aktualisieren.';
    if(stats.hotelProposed > 0) return 'Es gibt vorgeschlagene Hotelfaelle. Naechster Schritt: extern beim Anbieter oeffnen oder bewusst verwerfen.';
    if(stats.hotelConfirmed > 0) return 'Externe Hotelbestaetigungen sind sichtbar im Tracking. Reiseverlauf und Kosten bleiben damit sauber nachvollziehbar.';
    if(stats.hotelTotal > 0 && stats.received === 0) return 'Hotels werden jetzt als externe Buchungsfaelle lokal messbar. Die Buchung selbst bleibt bewusst ausserhalb von TravelLogik.';
    if(stats.received > 0){
      const oldestOpen = bookings
        .filter(booking=>['received','reviewing','waiting'].includes(normalizeStatus(booking.status)))
        .sort((a, b)=>new Date(a.createdAt || 0) - new Date(b.createdAt || 0))[0];
      return oldestOpen
        ? `Naechster echter Ops-Schritt: Anfrage ${oldestOpen.id} pruefen und innerhalb von ${copy.responseWindow} rueckmelden.`
        : `Naechster echter Ops-Schritt: erste Anfrage innerhalb von ${copy.responseWindow} beantworten.`;
    }
    return 'Pilotstrecke ist vorbereitet. Jetzt lohnt sich ein externer Test mit echter Pilot-Inbox und manuellem Rueckmeldeversprechen.';
  }

  function renderHotelBookingCard(booking){
    const status = normalizeStatus(booking.status);
    const hotelReservation = booking.hotelReservation || {};
    const nextActions = [];
    if(booking.handoffUrl || hotelReservation.externalUrl || booking.offerUrl){
      nextActions.push(`<button class="btn btn-outline btn-sm" onclick="openExternalHotelHandoff('${booking.id}')">Extern erneut oeffnen</button>`);
    }
    if(status === 'proposed') nextActions.push(`<button class="btn btn-outline btn-sm" onclick="updateHotelBookingStatus('${booking.id}','external-opened')">Als extern geoeffnet markieren</button>`);
    if(status === 'proposed' || status === 'external-opened') nextActions.push(`<button class="btn btn-outline btn-sm" onclick="updateHotelBookingStatus('${booking.id}','external-booked')">Als extern gebucht markieren</button>`);
    if(status !== 'external-confirmed') nextActions.push(`<button class="btn btn-outline btn-sm" onclick="updateHotelBookingStatus('${booking.id}','external-confirmed')">Als extern bestaetigt markieren</button>`);
    if(status !== 'cancelled') nextActions.push(`<button class="btn btn-outline btn-sm" onclick="updateHotelBookingStatus('${booking.id}','cancelled')">Als storniert markieren</button>`);
    if(status !== 'archived') nextActions.push(`<button class="btn btn-outline btn-sm" onclick="updateHotelBookingStatus('${booking.id}','archived')">Archivieren</button>`);
    const statusHistory = Array.isArray(booking.statusHistory) ? booking.statusHistory : [];
    const timeline = statusHistory.length
      ? statusHistory.map(entry=>`
          <div class="booking-timeline-item">
            <div class="booking-timeline-dot"></div>
            <div>
              <div class="booking-timeline-title">${escapeHtml(getStatusLabel(entry.to))}</div>
              <div class="booking-timeline-meta">${escapeHtml(formatDateTime(entry.at))}</div>
            </div>
          </div>
        `).join('')
      : `<div class="booking-timeline-item">
          <div class="booking-timeline-dot"></div>
          <div>
            <div class="booking-timeline-title">Lokal angelegt</div>
            <div class="booking-timeline-meta">${escapeHtml(formatDateTime(booking.createdAt))}</div>
          </div>
        </div>`;
    return `
      <div class="booking-entry booking-entry-hotel">
        <div class="booking-entry-head">
          <div>
            <div class="booking-entry-kicker">${getBookingKindLabel(booking)}</div>
            <div class="booking-entry-title">${escapeHtml(booking.name)}</div>
            <div class="booking-entry-subtitle">${escapeHtml(booking.detail)}</div>
          </div>
          <div style="display:flex;gap:.45rem;flex-wrap:wrap;align-items:flex-start;justify-content:flex-end">
            <span class="status-pill status-${getStatusClass(booking.status)}">${getStatusLabel(booking.status)}</span>
            <span class="booking-code">${escapeHtml(hotelReservation.externalReservationReference || booking.id)}</span>
          </div>
        </div>
        <div class="booking-entry-grid">
          <div class="booking-mini-card">
            <div class="booking-mini-label">Check-in</div>
            <div class="booking-mini-value">${escapeHtml(formatDate(booking.checkIn))}</div>
          </div>
          <div class="booking-mini-card">
            <div class="booking-mini-label">Check-out</div>
            <div class="booking-mini-value">${escapeHtml(formatDate(booking.checkOut))}</div>
          </div>
          <div class="booking-mini-card">
            <div class="booking-mini-label">Gaeste</div>
            <div class="booking-mini-value">${escapeHtml(String(booking.guests || 1))}</div>
          </div>
          <div class="booking-mini-card">
            <div class="booking-mini-label">Zimmer</div>
            <div class="booking-mini-value">${escapeHtml(String(booking.rooms || 1))}</div>
          </div>
          <div class="booking-mini-card">
            <div class="booking-mini-label">Gesamt</div>
            <div class="booking-mini-value">€${escapeHtml(String(booking.total || 0))}</div>
          </div>
          <div class="booking-mini-card">
            <div class="booking-mini-label">Verpflegung</div>
            <div class="booking-mini-value">${escapeHtml(booking.boardType || 'Nicht hinterlegt')}</div>
          </div>
          <div class="booking-mini-card booking-mini-card-wide">
            <div class="booking-mini-label">Zimmer / Tarif</div>
            <div class="booking-mini-value">${escapeHtml(booking.roomRateHint || 'Noch kein Tarifhinweis')}</div>
          </div>
          <div class="booking-mini-card booking-mini-card-wide">
            <div class="booking-mini-label">Zimmerdetails</div>
            <div class="booking-mini-value">${escapeHtml(booking.roomFacts || 'Keine weiteren Zimmerdetails hinterlegt')}</div>
          </div>
          <div class="booking-mini-card booking-mini-card-wide">
            <div class="booking-mini-label">Stornohinweis</div>
            <div class="booking-mini-value">${escapeHtml(booking.cancellationLabel || 'Keine lokale Stornoinfo hinterlegt')}</div>
          </div>
          <div class="booking-mini-card booking-mini-card-wide">
            <div class="booking-mini-label">Kontakt / Buchungsdetails</div>
            <div class="booking-mini-value">${escapeHtml(booking.contactName || 'Nicht hinterlegt')} · ${escapeHtml(booking.contactEmail || 'Keine E-Mail')} ${booking.contactPhone ? `· ${escapeHtml(booking.contactPhone)}` : ''}</div>
          </div>
          <div class="booking-mini-card booking-mini-card-wide">
            <div class="booking-mini-label">Anreise & Zimmerwunsch</div>
            <div class="booking-mini-value">${escapeHtml(booking.arrivalWindow || 'Keine Ankunftszeit')} · ${escapeHtml(booking.roomPreference || 'Keine Zimmerlage')} · ${escapeHtml(booking.bedPreference || 'Kein Bettwunsch')}</div>
          </div>
          <div class="booking-mini-card booking-mini-card-wide">
            <div class="booking-mini-label">Tracking angelegt</div>
            <div class="booking-mini-value">${escapeHtml(formatDateTime(booking.createdAt))}</div>
          </div>
          <div class="booking-mini-card booking-mini-card-wide">
            <div class="booking-mini-label">Anbieter / externe Route</div>
            <div class="booking-mini-value">${escapeHtml(booking.handoffProvider || hotelReservation.provider || booking.providerName || 'Nicht hinterlegt')} · ${escapeHtml(booking.handoffUrl || hotelReservation.externalUrl || booking.offerUrl || 'Keine URL gespeichert')}</div>
          </div>
          ${isPreparedHotelBooking(booking) ? `
          <div class="booking-mini-card booking-mini-card-wide">
            <div class="booking-mini-label">Naechster Tracking-Schritt</div>
            <div class="booking-mini-value">${escapeHtml(status === 'proposed' ? 'Extern beim Anbieter oeffnen' : status === 'external-opened' ? 'Externen Abschluss markieren' : 'Finale externe Bestaetigung nachziehen')}</div>
          </div>
          <div class="booking-mini-card booking-mini-card-wide">
            <div class="booking-mini-label">Kostenstatus</div>
            <div class="booking-mini-value">${escapeHtml(booking.finalPrice || hotelReservation.finalPrice ? `Finalpreis €${booking.finalPrice || hotelReservation.finalPrice}` : `Schaetzung €${booking.total || 0}`)}</div>
          </div>` : ''}
          ${hotelReservation.externalReservationReference ? `
          <div class="booking-mini-card booking-mini-card-wide">
            <div class="booking-mini-label">Externe Referenz</div>
            <div class="booking-mini-value">${escapeHtml(hotelReservation.externalReservationReference)}</div>
          </div>` : ''}
        </div>
        <details class="booking-detail-panel">
          <summary>Mehr Buchungsdetails</summary>
          <div class="booking-detail-sections">
            <div class="booking-detail-block">
              <div class="booking-detail-block-title">Aufenthalt & Rate</div>
              <div class="booking-detail-grid">
                <div class="booking-mini-card">
                  <div class="booking-mini-label">Tarifdetail</div>
                  <div class="booking-mini-value">${escapeHtml(booking.rateNote || 'Keine weitere Tariferklaerung hinterlegt')}</div>
                </div>
                <div class="booking-mini-card">
                  <div class="booking-mini-label">Aufenthalt</div>
                  <div class="booking-mini-value">${escapeHtml(booking.detail || '')}</div>
                </div>
                <div class="booking-mini-card booking-mini-card-wide">
                  <div class="booking-mini-label">Lokale Storno- und Aufenthaltsnotiz</div>
                  <div class="booking-mini-value">${escapeHtml(booking.cancellationLabel || 'Keine lokale Stornoinfo hinterlegt')}</div>
                </div>
                <div class="booking-mini-card booking-mini-card-wide">
                  <div class="booking-mini-label">Externe Buchung</div>
                  <div class="booking-mini-value">TravelLogik bucht dieses Hotel nicht selbst. Der Anbieter-Link und der externe Status werden nur fuer Tracking gespeichert.</div>
                </div>
              </div>
            </div>
            <div class="booking-detail-block">
              <div class="booking-detail-block-title">Kontakt & Reiseakte</div>
              <div class="booking-detail-grid">
                <div class="booking-mini-card">
                  <div class="booking-mini-label">Ansprechperson</div>
                  <div class="booking-mini-value">${escapeHtml(booking.contactName || 'Nicht hinterlegt')}</div>
                </div>
                <div class="booking-mini-card">
                  <div class="booking-mini-label">Kontaktweg</div>
                  <div class="booking-mini-value">${escapeHtml(booking.preferredChannel || 'E-Mail')}</div>
                </div>
                <div class="booking-mini-card booking-mini-card-wide">
                  <div class="booking-mini-label">Zeitstempel</div>
                  <div class="booking-mini-value">Angelegt: ${escapeHtml(formatDateTime(booking.createdAt))}${booking.lastUpdatedAt ? `<br>Zuletzt aktualisiert: ${escapeHtml(formatDateTime(booking.lastUpdatedAt))}` : ''}</div>
                </div>
              </div>
            </div>
            <div class="booking-detail-block">
              <div class="booking-detail-block-title">Lokaler Statusverlauf</div>
              <div class="booking-timeline">
                ${timeline}
              </div>
            </div>
            <div class="booking-detail-block">
              <div class="booking-detail-block-title">Naechste lokale Aktion</div>
              <div class="booking-detail-callout">
                ${status === 'external-confirmed'
                  ? 'Die externe Hotelbuchung ist bestaetigt und dient jetzt nur noch dem Reise- und Kosten-Tracking.'
                  : isPreparedHotelBooking(booking)
                  ? status === 'proposed'
                    ? 'Hotel extern beim Anbieter oeffnen und danach den Tracking-Status aktualisieren.'
                    : status === 'external-opened'
                      ? 'Sobald die Buchung ausserhalb von TravelLogik erfolgt, lokal auf "Extern gebucht" setzen.'
                      : 'Falls die Buchung final bestaetigt ist, lokal auf "Extern bestaetigt" wechseln.'
                  : status === 'cancelled'
                  ? 'Aufenthalt ist lokal als storniert markiert und bleibt nur noch dokumentiert sichtbar.'
                  : status === 'archived'
                  ? 'Eintrag ist archiviert. Nur bei Bedarf wieder als aktive Referenz nutzen.'
                  : 'Status lokal sauber nachziehen, damit Hotels in TravelLogik ehrlich als externe Buchungsfaelle sichtbar bleiben.'}
              </div>
            </div>
          </div>
        </details>
        ${booking.requestNotes ? `<div class="booking-entry-note"><strong>Hinweise:</strong> ${escapeHtml(booking.requestNotes)}</div>` : ''}
        <div class="booking-entry-actions">
          <button class="btn btn-primary btn-sm" onclick="downloadBookingCalendar('${booking.id}')">In Kalender notieren</button>
          <button class="btn btn-outline btn-sm" onclick="copyPilotRequest('${booking.id}')">Tracking-Details kopieren</button>
          ${nextActions.join('')}
        </div>
      </div>`;
  }

  function renderRequestRow(booking){
    return `<tr class="${isExternalHotelHandoff(booking) ? 'booking-row-legacy-hotel' : 'booking-row-request'}">
      <td style="font-family:monospace;color:var(--accent)">${booking.id}</td>
      <td>
        <div>${getBookingTypeLabel(booking.type)}</div>
        <div style="font-size:.74rem;color:var(--text-light)">${getBookingKindLabel(booking)}</div>
      </td>
      <td>${escapeHtml(booking.name)}</td>
      <td style="color:var(--text-light);font-size:.82rem">${escapeHtml(booking.detail)}<br><span style="font-size:.74rem">${isExternalHotelHandoff(booking) ? `Weitergeleitet: ${formatDateTime(booking.lastRedirectedAt || booking.lastUpdatedAt || booking.createdAt)} · ${booking.handoffCount || 1}x ausgelost` : `Eingang: ${formatDateTime(booking.createdAt)} · Letzte Aktivitaet: ${formatDateTime(booking.lastUpdatedAt || booking.createdAt)}`}</span>${renderHotelOpsFields(booking)}</td>
      <td style="font-weight:600">€${booking.total}</td>
      <td><span class="status-pill status-${getStatusClass(booking.status)}">${getStatusLabel(booking.status)}</span></td>
      <td style="display:flex;gap:.4rem;flex-wrap:wrap">
        ${getPrimaryAction(booking) ? `<button class="btn btn-primary btn-sm" onclick="updatePilotRequestStatus('${booking.id}','${getPrimaryAction(booking).nextStatus}')">${getPrimaryAction(booking).label}</button>` : ''}
        ${isExternalHotelHandoff(booking)
          ? `<button class="btn btn-primary btn-sm" onclick="openExternalHotelHandoff('${booking.id}')">Erneut extern oeffnen</button>
        <button class="btn btn-outline btn-sm" onclick="startHotelRequestFromHandoff('${booking.id}')">Rueckfrage daraus starten</button>`
          : `<button class="btn btn-outline btn-sm" onclick="copyPilotRequest('${booking.id}')">Text kopieren</button>
        <button class="btn btn-outline btn-sm" onclick="openPilotRequest('${booking.id}')">An Pilot-Inbox senden</button>`}
        <button class="btn btn-outline btn-sm" onclick="cancelBooking('${booking.id}')">Verwerfen</button>
      </td>
    </tr>`;
  }

  function renderBookings(){
    const container = document.getElementById('bookings-container');
    if(!container) return;

    const bookings = runtime.getBookings();
    const visibleBookings = getVisibleBookings(bookings);
    const pilotConfig = runtime.getPilotConfig?.() || {};
    const stats = summarizeOps(bookings);
    const responseWindow = `${pilotConfig.responseTimeHours || 24}h`;
    const contactChannel = pilotConfig.contactChannel || 'E-Mail';
    const opsLead = buildOpsLead({responseWindow, contactChannel}, pilotConfig, bookings, stats);

    const opsSummaryHtml = `
      <div class="price-summary" style="margin-top:0">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:.8rem">
          <div>
            <div class="insight-label">Externe Hotelfaelle</div>
            <div style="font-weight:700">${stats.hotelProposed + stats.hotelOpened + stats.hotelBooked + stats.hotelConfirmed}</div>
            <div style="font-size:.78rem;color:var(--text-light)">${stats.hotelProposed} vorgeschlagen · ${stats.hotelOpened} extern geoeffnet · ${stats.hotelBooked} extern gebucht · ${stats.hotelConfirmed} extern bestaetigt</div>
          </div>
          <div>
            <div class="insight-label">Anfragepfade</div>
            <div style="font-weight:700">${stats.requests}</div>
            <div style="font-size:.78rem;color:var(--text-light)">${stats.received + stats.reviewing + stats.waiting} offen · ${stats.completed} abgeschlossen</div>
          </div>
          <div>
            <div class="insight-label">Pilot-Inbox</div>
            <div style="font-weight:700">${pilotConfig.contactEmail || 'Noch nicht konfiguriert'}</div>
            <div style="font-size:.78rem;color:var(--text-light)">${pilotConfig.contactLabel || 'TravelLogik Pilotdesk'}</div>
          </div>
          <div>
            <div class="insight-label">Standard-Rueckmeldung</div>
            <div style="font-weight:700">innerhalb von ${responseWindow}</div>
            <div style="font-size:.78rem;color:var(--text-light)">Kontaktweg: ${contactChannel}</div>
          </div>
        </div>
        <div class="beta-inline-note" style="margin-top:.85rem">${opsLead}</div>
      </div>`;

    if(bookings.length === 0){
      container.innerHTML = `${opsSummaryHtml}${renderFilterBar(bookings)}<div class="empty-state"><div class="icon">📭</div><div>Noch keine Buchungen oder Anfragen vorhanden</div><small>Hotels erscheinen hier als externe Buchungsfaelle fuer Reise- und Kosten-Tracking. Fluege, Mietwagen und Transfers bleiben unveraendert.</small></div>`;
      return;
    }

    const total = visibleBookings.reduce((sum, booking)=>sum + booking.total, 0);
    const visibleCount = visibleBookings.length;
    const hotelBookings = visibleBookings.filter(isTrackedHotelBooking);
    const requestBookings = visibleBookings.filter(booking=>!isTrackedHotelBooking(booking));
    container.innerHTML = `${opsSummaryHtml}${renderFilterBar(bookings)}${visibleCount ? `
      ${hotelBookings.length ? `
        <div class="booking-section-head">
          <div>
            <div class="card-title" style="margin-bottom:.35rem">🏨 Externe Hotelbuchungen & Tracking</div>
            <div class="inline-note">Hotels werden hier nur als externe Buchungsfaelle gefuehrt. TravelLogik speichert Reise- und Kostendaten, nicht die eigentliche Reservierung.</div>
          </div>
        </div>
        <div class="booking-entry-list">
          ${hotelBookings.map(renderHotelBookingCard).join('')}
        </div>` : ''}
      ${requestBookings.length ? `
        <div class="booking-section-head" style="margin-top:${hotelBookings.length ? '1.2rem' : '0'}">
          <div>
            <div class="card-title" style="margin-bottom:.35rem">🧭 Anfragepfade</div>
            <div class="inline-note">Nur diese Eintraege brauchen manuellen Follow-up, Pilot-Inbox oder eine externe Weiterleitung.</div>
          </div>
        </div>
        <table class="bookings-table">
          <thead><tr><th>Nr.</th><th>Typ</th><th>Anfrage</th><th>Details</th><th>Betrag</th><th>Status</th><th></th></tr></thead>
          <tbody>${requestBookings.map(renderRequestRow).join('')}</tbody>
        </table>` : ''}
    ` : `<div class="empty-state"><div class="icon">🔎</div><div>Keine Eintraege fuer diesen Filter</div><small>Wechseln Sie den Filter oder erfassen Sie einen neuen externen Hotelfall beziehungsweise eine Anfrage.</small></div>`}
    <div style="margin-top:1rem;padding-top:1rem;border-top:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
      <div style="font-size:.9rem;color:var(--text-light)">${visibleCount} von ${bookings.length} sichtbaren Eintrag(en) · Gesamt: <strong>€${total}</strong><br><span style="font-size:.76rem">Hotels erscheinen hier nur als externe Tracking-Faelle. "Extern gebucht" und "Extern bestaetigt" dienen ausschliesslich Reiseverlauf und Kosten-Tracking.</span></div>
      <button class="btn btn-outline btn-sm" onclick="clearBookings()">Alle löschen</button>
    </div>`;
  }

  function updateHotelBookingStatus(id, nextStatus){
    const bookings = runtime.getBookings().slice();
    const booking = bookings.find(item=>item.id === id && isTrackedHotelBooking(item));
    if(!booking) return;
    const previousStatus = normalizeStatus(booking.status);
    if(previousStatus === nextStatus) return;
    booking.status = nextStatus;
    booking.hotelBookingStatus = nextStatus;
    booking.hotelReservation = {
      ...(booking.hotelReservation || {}),
      status: nextStatus,
      externalUrl: booking.hotelReservation?.externalUrl || booking.handoffUrl || booking.offerUrl || ''
    };
    booking.statusLabel = getStatusLabel(nextStatus);
    booking.lastUpdatedAt = new Date().toISOString();
    if(nextStatus === 'external-opened'){
      booking.lastRedirectedAt = booking.lastUpdatedAt;
      booking.handoffCount = (booking.handoffCount || 0) + 1;
    }
    if(nextStatus === 'external-booked'){
      booking.lastExternalCompletionAt = booking.lastUpdatedAt;
    }
    if(nextStatus === 'external-confirmed'){
      booking.confirmedAt = booking.lastUpdatedAt;
    }
    booking.statusHistory = Array.isArray(booking.statusHistory) ? booking.statusHistory : [];
    booking.statusHistory.push({
      from: previousStatus,
      to: nextStatus,
      at: booking.lastUpdatedAt
    });
    booking.requestSummary = buildRequestSummary(booking);
    runtime.setBookings(bookings);
    runtime.syncTripCoreFromBookings();
    runtime.persistBookings(bookings);
    runtime.refreshRelatedViews();
    renderBookings();
  }

  function saveBookingOpsFields(id){
    const bookings = runtime.getBookings().slice();
    const booking = bookings.find(item=>item.id === id);
    if(!booking) return;
    const provider = document.getElementById(`ops-provider-${id}`)?.value.trim() || '';
    const externalUrl = document.getElementById(`ops-url-${id}`)?.value.trim() || '';
    const externalReservationReference = document.getElementById(`ops-reference-${id}`)?.value.trim() || '';
    const finalPriceRaw = document.getElementById(`ops-final-price-${id}`)?.value.trim() || '';
    booking.handoffSource = document.getElementById(`ops-source-${id}`)?.value.trim() || '';
    booking.confirmedBy = document.getElementById(`ops-confirmed-by-${id}`)?.value.trim() || '';
    booking.opsNote = document.getElementById(`ops-note-${id}`)?.value.trim() || '';
    booking.handoffProvider = provider || booking.handoffProvider || '';
    booking.handoffUrl = externalUrl || booking.handoffUrl || '';
    booking.finalPrice = finalPriceRaw ? Number(finalPriceRaw) : '';
    booking.hotelReservation = {
      ...(booking.hotelReservation || {}),
      provider: provider || booking.hotelReservation?.provider || '',
      externalUrl: externalUrl || booking.hotelReservation?.externalUrl || booking.offerUrl || '',
      externalReservationReference,
      finalPrice: finalPriceRaw ? Number(finalPriceRaw) : ''
    };
    booking.lastUpdatedAt = new Date().toISOString();
    booking.requestSummary = buildRequestSummary(booking);
    runtime.setBookings(bookings);
    runtime.syncTripCoreFromBookings();
    runtime.persistBookings(bookings);
    runtime.refreshRelatedViews();
    renderBookings();
  }

  function setBookingsFilter(nextFilter){
    activeFilter = nextFilter || 'all';
    renderBookings();
  }

  function updatePilotRequestStatus(id, nextStatus){
    const bookings = runtime.getBookings().slice();
    const booking = bookings.find(item=>item.id === id);
    if(!booking) return;
    const previousStatus = normalizeStatus(booking.status);
    booking.status = nextStatus;
    booking.lastUpdatedAt = new Date().toISOString();
    if(isExternalHotelHandoff(booking) && nextStatus === 'external-booked'){
      booking.lastExternalCompletionAt = booking.lastUpdatedAt;
    }
    if(isExternalHotelHandoff(booking) && nextStatus === 'external-confirmed'){
      booking.confirmedAt = booking.lastUpdatedAt;
    }
    booking.statusHistory = Array.isArray(booking.statusHistory) ? booking.statusHistory : [];
    booking.statusHistory.push({
      from: previousStatus,
      to: nextStatus,
      at: booking.lastUpdatedAt
    });
    booking.requestSummary = buildRequestSummary(booking);
    runtime.setBookings(bookings);
    runtime.syncTripCoreFromBookings();
    runtime.persistBookings(bookings);
    runtime.refreshRelatedViews();
    renderBookings();
  }

  function cancelBooking(id){
    if(!confirm('Anfrage oder Vormerkung verwerfen?')) return;
    const bookings = runtime.getBookings().slice();
    const booking = bookings.find(item=>item.id === id);
    if(booking){
      const previousStatus = normalizeStatus(booking.status);
      booking.status = 'cancelled';
      booking.lastUpdatedAt = new Date().toISOString();
      booking.statusHistory = Array.isArray(booking.statusHistory) ? booking.statusHistory : [];
      booking.statusHistory.push({
        from: previousStatus,
        to: 'cancelled',
        at: booking.lastUpdatedAt
      });
      booking.requestSummary = buildRequestSummary(booking);
    }
    runtime.setBookings(bookings);
    runtime.syncTripCoreFromBookings();
    runtime.persistBookings(bookings);
    runtime.refreshRelatedViews();
    renderBookings();
  }

  function clearBookings(){
    if(!confirm('Alle Anfragen und Vormerkungen loeschen?')) return;
    const bookings = [];
    runtime.setBookings(bookings);
    runtime.syncTripCoreFromBookings();
    runtime.persistBookings(bookings);
    runtime.refreshRelatedViews();
    renderBookings();
  }

  global.TravelLogikBookings = {
    configureTravelBookings,
    renderBookings,
    updatePilotRequestStatus,
    saveBookingOpsFields,
    setBookingsFilter,
    updateHotelBookingStatus,
    cancelBooking,
    clearBookings
  };

  global.renderBookings = renderBookings;
  global.updatePilotRequestStatus = updatePilotRequestStatus;
  global.saveBookingOpsFields = saveBookingOpsFields;
  global.setBookingsFilter = setBookingsFilter;
  global.updateHotelBookingStatus = updateHotelBookingStatus;
  global.cancelBooking = cancelBooking;
  global.clearBookings = clearBookings;
})(window);
