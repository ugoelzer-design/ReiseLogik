(function(global){
  'use strict';

  /**
   * Mock Transfer Service
   */
  const MockTransferService = {
    /**
     * POST /api/transfers/price-check
     */
    async priceCheck(params) {
      console.log('[MockTransferService] priceCheck', params);
      await new Promise(resolve => setTimeout(resolve, 800));

      return {
        status: 'ready-to-book',
        price: params.totalAmount,
        currency: 'EUR',
        transferToken: 'trv_' + Math.random().toString(36).slice(2, 10),
        errors: []
      };
    },

    /**
     * POST /api/transfers/reservations
     */
    async reservationCreate(params) {
      console.log('[MockTransferService] reservationCreate', params);
      await new Promise(resolve => setTimeout(resolve, 1500));

      return {
        status: 'booked',
        reservationId: 'tres_' + Math.random().toString(36).slice(2, 10),
        externalReservationReference: 'TRF-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
        bookedAt: new Date().toISOString(),
        errors: []
      };
    }
  };

  global.TravelLogikTransferService = MockTransferService;
})(window);
