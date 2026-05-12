(function(global){
  'use strict';

  const hotelMvp = global.TravelLogikHotelMvp || {};
  const HOTEL_BOOKING_STATUS = hotelMvp.HOTEL_BOOKING_STATUS || {
    PRECHECK_REQUIRED: 'precheck-required',
    READY_TO_BOOK: 'ready-to-book',
    BOOKED: 'booked',
    FAILED: 'failed'
  };

  /**
   * Mock Hotel Service implementing the Backend Contract
   */
  const MockHotelService = {
    /**
     * POST /api/hotels/search
     */
    async search(params) {
      console.log('[MockHotelService] search', params);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const hotels = [
        {
          hotelId: 'htl_mock_1',
          name: 'Mock Grand Plaza',
          stars: 5,
          address: params.dest + ' Central Park 1',
          pricePerNight: 185,
          total: 185 * (params.nights || 1),
          currency: 'EUR',
          provider: 'MockProvider',
          sourceMode: 'live-search'
        },
        {
          hotelId: 'htl_mock_2',
          name: 'Mock City Express',
          stars: 3,
          address: params.dest + ' Main St 55',
          pricePerNight: 95,
          total: 95 * (params.nights || 1),
          currency: 'EUR',
          provider: 'MockProvider',
          sourceMode: 'live-search'
        }
      ];

      return {
        searchId: 'hs_' + Math.random().toString(36).slice(2, 10),
        status: HOTEL_BOOKING_STATUS.LIVE_SEARCH,
        hotels: hotels,
        warnings: []
      };
    },

    /**
     * POST /api/hotels/rate-check
     */
    async rateCheck(params) {
      console.log('[MockHotelService] rateCheck', params);
      await new Promise(resolve => setTimeout(resolve, 1200));

      // Simulate success 90% of the time
      if (Math.random() > 0.9) {
        return {
          status: HOTEL_BOOKING_STATUS.FAILED,
          errors: [{ code: 'SOLD_OUT', message: 'Selected rate is no longer available' }]
        };
      }

      return {
        status: HOTEL_BOOKING_STATUS.PRECHECK_REQUIRED,
        availabilityToken: 'av_' + Math.random().toString(36).slice(2, 10),
        priceChanged: false,
        soldOut: false,
        checkedRate: {
          nightlyAmount: params.nightlyAmount || 179.0,
          totalAmount: params.totalAmount || 537.0,
          taxesAndFees: (params.totalAmount || 537.0) * 0.07,
          currency: 'EUR',
          cancellationPolicy: {
            summary: 'Free cancellation until 48h before arrival'
          }
        },
        errors: []
      };
    },

    /**
     * POST /api/hotels/prebook
     */
    async prebook(params) {
      console.log('[MockHotelService] prebook', params);
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Simulate price change 10% of the time
      if (Math.random() > 0.9) {
        return {
          status: HOTEL_BOOKING_STATUS.FAILED,
          errors: [{ code: 'PRICE_CHANGED', message: 'The price has changed slightly. Please review.' }]
        };
      }

      return {
        status: HOTEL_BOOKING_STATUS.READY_TO_BOOK,
        prebookToken: 'pb_' + Math.random().toString(36).slice(2, 10),
        expiresAt: new Date(Date.now() + 15 * 60000).toISOString(),
        price: {
          totalAmount: params.totalAmount || 537.0,
          currency: 'EUR'
        },
        errors: []
      };
    },

    /**
     * POST /api/hotels/reservations
     */
    async reservationCreate(params) {
      console.log('[MockHotelService] reservationCreate', params);
      await new Promise(resolve => setTimeout(resolve, 2000));

      return {
        status: HOTEL_BOOKING_STATUS.BOOKED,
        reservationId: 'res_' + Math.random().toString(36).slice(2, 10),
        externalReservationReference: 'EXT-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
        supplierConfirmationNumber: 'SUP-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
        bookedAt: new Date().toISOString(),
        hotelVoucherUrl: 'https://example.com/voucher/' + Math.random().toString(36).slice(2, 10),
        errors: []
      };
    }
  };

  global.TravelLogikHotelService = MockHotelService;
})(window);
