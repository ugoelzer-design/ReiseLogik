(function(global){
  'use strict';

  const flightMvp = global.TravelLogikFlightMvp || {};
  const FLIGHT_BOOKING_STATUS = {
    LIVE_SEARCH: 'live-search',
    PRECHECK_REQUIRED: 'precheck-required',
    READY_TO_BOOK: 'ready-to-book',
    BOOKED: 'booked',
    FAILED: 'failed'
  };

  /**
   * Mock Flight Service implementing a typical Flight Booking Contract
   */
  const MockFlightService = {
    /**
     * POST /api/flights/fare-check
     */
    async fareCheck(params) {
      console.log('[MockFlightService] fareCheck', params);
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Simulate success 92% of the time
      if (Math.random() > 0.92) {
        return {
          status: FLIGHT_BOOKING_STATUS.FAILED,
          errors: [{ code: 'FARE_EXPIRED', message: 'The selected fare is no longer available.' }]
        };
      }

      return {
        status: FLIGHT_BOOKING_STATUS.PRECHECK_REQUIRED,
        fareToken: 'ft_' + Math.random().toString(36).slice(2, 10),
        priceChanged: Math.random() > 0.8,
        newPrice: params.price + (Math.random() > 0.5 ? 15 : -10),
        availableSeats: 4,
        baggageOptions: [
          { id: 'bag_0', label: 'Hand baggage only', price: 0 },
          { id: 'bag_1', label: '23kg Checked Bag', price: 35 },
          { id: 'bag_2', label: '2x 23kg Checked Bag', price: 60 }
        ],
        errors: []
      };
    },

    /**
     * POST /api/flights/prebook
     */
    async prebook(params) {
      console.log('[MockFlightService] prebook', params);
      await new Promise(resolve => setTimeout(resolve, 1800));

      return {
        status: FLIGHT_BOOKING_STATUS.READY_TO_BOOK,
        prebookToken: 'fpt_' + Math.random().toString(36).slice(2, 10),
        expiresAt: new Date(Date.now() + 20 * 60000).toISOString(),
        finalPrice: params.totalAmount || 250.0,
        errors: []
      };
    },

    /**
     * POST /api/flights/reservations
     */
    async reservationCreate(params) {
      console.log('[MockFlightService] reservationCreate', params);
      await new Promise(resolve => setTimeout(resolve, 2500));

      return {
        status: FLIGHT_BOOKING_STATUS.BOOKED,
        reservationId: 'fres_' + Math.random().toString(36).slice(2, 10),
        pnr: Math.random().toString(36).slice(2, 8).toUpperCase(),
        ticketNumbers: params.guests.map(() => '220-' + Math.floor(1000000000 + Math.random() * 9000000000)),
        bookedAt: new Date().toISOString(),
        airlineConfirmation: 'LH' + Math.random().toString(36).slice(2, 6).toUpperCase(),
        errors: []
      };
    }
  };

  global.TravelLogikFlightService = MockFlightService;
})(window);
