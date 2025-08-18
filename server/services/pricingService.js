const axios = require('axios');
const moment = require('moment');

class PricingService {
  constructor() {
    this.vatRate = this.getCurrentVATRate();
    this.affluentAreas = [
      'Sandhurst', 'Hyde Park', 'Bryanston', 'Morningside', 'Illovo',
      'Melrose', 'Melrose North', 'Atholl', 'Houghton', 'Westcliff',
      'Parktown', 'Parkview', 'Greenside', 'Emmarentia', 'Linden'
    ];
    this.stressedAreas = [
      'Alexandra', 'Diepsloot', 'Midrand', 'Randburg', 'Fourways',
      'Northcliff', 'Northgate', 'Cosmo City', 'Lanseria', 'Honeydew'
    ];
  }

  // Get current VAT rate based on date
  getCurrentVATRate() {
    const now = moment();
    const vatChangeDate = moment('2025-05-01');
    
    return now.isBefore(vatChangeDate) ? 0.15 : 0.16;
  }

  // Get load-shedding stage from EskomSePush API
  async getLoadSheddingStage(area = 'Johannesburg') {
    try {
      const response = await axios.get(`https://developer.sepush.co.za/business/2.0/area`, {
        params: {
          id: area,
          test: process.env.NODE_ENV === 'development' ? 'current' : undefined
        },
        headers: {
          'Token': process.env.ESKOM_API_KEY
        }
      });

      const events = response.data.events;
      if (events && events.length > 0) {
        const currentEvent = events.find(event => {
          const start = moment(event.start);
          const end = moment(event.end);
          const now = moment();
          return now.isBetween(start, end);
        });

        return currentEvent ? currentEvent.note.match(/Stage (\d+)/)?.[1] || 0 : 0;
      }

      return 0;
    } catch (error) {
      console.error('Error fetching load-shedding data:', error.message);
      return 0; // Default to no load-shedding
    }
  }

  // Calculate load-shedding surcharge
  calculateLoadSheddingSurcharge(stage) {
    const surchargeRates = {
      1: 0.05, // 5%
      2: 0.10, // 10%
      3: 0.15, // 15%
      4: 0.20, // 20%
      5: 0.25  // 25%
    };

    return surchargeRates[stage] || 0;
  }

  // Check if area is affluent
  isAffluentArea(suburb) {
    return this.affluentAreas.some(area => 
      suburb.toLowerCase().includes(area.toLowerCase())
    );
  }

  // Check if area is stressed
  isStressedArea(suburb) {
    return this.stressedAreas.some(area => 
      suburb.toLowerCase().includes(area.toLowerCase())
    );
  }

  // Calculate area surcharge
  calculateAreaSurcharge(suburb) {
    if (this.isAffluentArea(suburb)) {
      return 0.05; // 5% surcharge for affluent areas
    } else if (this.isStressedArea(suburb)) {
      return 0.02; // 2% surcharge for stressed areas
    }
    return 0;
  }

  // Calculate delivery fee based on distance
  calculateDeliveryFee(distance, baseFee = 25) {
    if (distance <= 5) {
      return baseFee;
    } else if (distance <= 10) {
      return baseFee + 10;
    } else if (distance <= 15) {
      return baseFee + 20;
    } else {
      return baseFee + 30;
    }
  }

  // Calculate distance between two coordinates (Haversine formula)
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  // Main pricing calculation method
  async calculateOrderPricing(orderData) {
    const {
      fuelQuantity,
      fuelUnitPrice,
      storeItems = [],
      deliveryAddress,
      stationLocation
    } = orderData;

    // Calculate fuel subtotal
    const fuelSubtotal = fuelQuantity * fuelUnitPrice;

    // Calculate store items subtotal
    const storeItemsSubtotal = storeItems.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);

    // Calculate base subtotal
    const subtotal = fuelSubtotal + storeItemsSubtotal;

    // Get current VAT rate
    const vatRate = this.getCurrentVATRate();
    const vatAmount = subtotal * vatRate;

    // Get load-shedding surcharge
    const loadSheddingStage = await this.getLoadSheddingStage();
    const loadSheddingSurcharge = subtotal * this.calculateLoadSheddingSurcharge(loadSheddingStage);

    // Calculate area surcharge
    const areaSurcharge = subtotal * this.calculateAreaSurcharge(deliveryAddress.suburb);

    // Calculate delivery fee
    const distance = this.calculateDistance(
      stationLocation.latitude,
      stationLocation.longitude,
      deliveryAddress.coordinates.latitude,
      deliveryAddress.coordinates.longitude
    );
    const deliveryFee = this.calculateDeliveryFee(distance);

    // Calculate total
    const total = subtotal + vatAmount + loadSheddingSurcharge + areaSurcharge + deliveryFee;

    // Ensure minimum order value of R100
    const minimumOrder = 100;
    const adjustedTotal = Math.max(total, minimumOrder);

    return {
      fuelSubtotal,
      storeItemsSubtotal,
      subtotal,
      vatRate,
      vatAmount,
      loadSheddingStage,
      loadSheddingSurcharge,
      areaSurcharge,
      deliveryFee,
      distance,
      total: adjustedTotal,
      minimumOrderApplied: adjustedTotal > total
    };
  }

  // Get pricing breakdown for display
  getPricingBreakdown(pricing) {
    return {
      fuel: {
        quantity: pricing.fuelQuantity,
        unitPrice: pricing.fuelUnitPrice,
        subtotal: pricing.fuelSubtotal
      },
      storeItems: pricing.storeItems,
      surcharges: {
        vat: {
          rate: pricing.vatRate * 100,
          amount: pricing.vatAmount
        },
        loadShedding: {
          stage: pricing.loadSheddingStage,
          amount: pricing.loadSheddingSurcharge
        },
        area: {
          amount: pricing.areaSurcharge
        }
      },
      delivery: {
        distance: pricing.distance,
        fee: pricing.deliveryFee
      },
      totals: {
        subtotal: pricing.subtotal,
        total: pricing.total
      }
    };
  }
}

module.exports = new PricingService();
