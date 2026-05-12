(function(global){
  'use strict';

  const CAR_BOOKING_STATUS = {
    PRECHECK_REQUIRED: 'precheck-required',
    READY_TO_BOOK: 'ready-to-book',
    BOOKED: 'booked',
    FAILED: 'failed'
  };

  /**
   * Mock Car Rental Service
   */
  const MockCarService = {
    /**
     * POST /api/cars/availability-check
     */
    async availabilityCheck(params) {
      console.log('[MockCarService] availabilityCheck', params);
      await new Promise(resolve => setTimeout(resolve, 1000));

      return {
        status: CAR_BOOKING_STATUS.PRECHECK_REQUIRED,
        availabilityToken: 'cav_' + Math.random().toString(36).slice(2, 10),
        priceChanged: false,
        checkedRate: {
          totalAmount: params.totalAmount,
          currency: 'EUR'
        },
        errors: []
      };
    },

    /**
     * POST /api/cars/prebook
     */
    async prebook(params) {
      console.log('[MockCarService] prebook', params);
      await new Promise(resolve => setTimeout(resolve, 1200));

      return {
        status: CAR_BOOKING_STATUS.READY_TO_BOOK,
        prebookToken: 'cpb_' + Math.random().toString(36).slice(2, 10),
        expiresAt: new Date(Date.now() + 30 * 60000).toISOString(),
        errors: []
      };
    },

    /**
     * POST /api/cars/reservations
     */
    async reservationCreate(params) {
      console.log('[MockCarService] reservationCreate', params);
      await new Promise(resolve => setTimeout(resolve, 1800));

      return {
        status: CAR_BOOKING_STATUS.BOOKED,
        reservationId: 'cres_' + Math.random().toString(36).slice(2, 10),
        externalReservationReference: 'CAR-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
        bookedAt: new Date().toISOString(),
        errors: []
      };
    }
  };

  global.TravelLogikCarService = MockCarService;
})(window);
