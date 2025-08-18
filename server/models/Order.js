const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  // Order Information
  orderNumber: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled', 'failed'],
    default: 'pending'
  },

  // Customer Information
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  deliveryAddress: {
    street: String,
    suburb: String,
    city: String,
    province: String,
    postalCode: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    },
    instructions: String
  },

  // Station Information
  station: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Station',
    required: true
  },

  // Driver Information
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver'
  },

  // Fuel Order Details
  fuelOrder: {
    fuelType: {
      type: String,
      enum: ['petrol', 'diesel'],
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 5,
      max: 25
    },
    unitPrice: {
      type: Number,
      required: true
    },
    subtotal: {
      type: Number,
      required: true
    }
  },

  // Store Items
  storeItems: [{
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StoreItem'
    },
    name: String,
    price: Number,
    quantity: {
      type: Number,
      default: 1
    },
    subtotal: Number
  }],

  // Pricing Breakdown
  pricing: {
    fuelSubtotal: {
      type: Number,
      required: true
    },
    storeItemsSubtotal: {
      type: Number,
      default: 0
    },
    subtotal: {
      type: Number,
      required: true
    },
    vatRate: {
      type: Number,
      default: 0.15 // 15% VAT, will change to 16% on 1 May 2025
    },
    vatAmount: {
      type: Number,
      required: true
    },
    loadSheddingSurcharge: {
      type: Number,
      default: 0
    },
    areaSurcharge: {
      type: Number,
      default: 0
    },
    deliveryFee: {
      type: Number,
      default: 0
    },
    total: {
      type: Number,
      required: true
    }
  },

  // Payment Information
  payment: {
    method: {
      type: String,
      enum: ['card', 'cash', 'wallet', 'instant_eft'],
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
      default: 'pending'
    },
    transactionId: String,
    paymentProvider: {
      type: String,
      enum: ['yoco', 'ozow', 'cash', 'wallet']
    },
    paidAt: Date
  },

  // Delivery Information
  delivery: {
    estimatedTime: Date,
    actualDeliveryTime: Date,
    driverNotes: String,
    customerNotes: String,
    deliveryInstructions: String
  },

  // Tracking & Status Updates
  statusHistory: [{
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled', 'failed']
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    updatedBy: {
      type: String,
      enum: ['system', 'customer', 'station', 'driver', 'admin']
    },
    notes: String
  }],

  // Driver Location Tracking
  driverLocation: [{
    coordinates: {
      latitude: Number,
      longitude: Number
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],

  // Ratings & Reviews
  rating: {
    customerRating: {
      rating: {
        type: Number,
        min: 1,
        max: 5
      },
      comment: String,
      createdAt: Date
    },
    driverRating: {
      rating: {
        type: Number,
        min: 1,
        max: 5
      },
      comment: String,
      createdAt: Date
    }
  },

  // Cancellation Information
  cancellation: {
    reason: String,
    cancelledBy: {
      type: String,
      enum: ['customer', 'station', 'driver', 'system']
    },
    cancelledAt: Date,
    refundAmount: Number,
    refundStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending'
    }
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ customer: 1 });
orderSchema.index({ station: 1 });
orderSchema.index({ driver: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ 'deliveryAddress.coordinates': '2dsphere' });

// Pre-save middleware to generate order number
orderSchema.pre('save', function(next) {
  if (this.isNew && !this.orderNumber) {
    this.orderNumber = this.generateOrderNumber();
  }
  next();
});

// Method to generate order number
orderSchema.methods.generateOrderNumber = function() {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `WF${timestamp}${random}`;
};

// Method to calculate total
orderSchema.methods.calculateTotal = function() {
  const fuelSubtotal = this.fuelOrder.subtotal;
  const storeItemsSubtotal = this.storeItems.reduce((sum, item) => sum + item.subtotal, 0);
  const subtotal = fuelSubtotal + storeItemsSubtotal;
  
  // Apply VAT
  const vatAmount = subtotal * this.pricing.vatRate;
  
  // Apply surcharges
  const total = subtotal + vatAmount + this.pricing.loadSheddingSurcharge + 
                this.pricing.areaSurcharge + this.pricing.deliveryFee;
  
  return {
    fuelSubtotal,
    storeItemsSubtotal,
    subtotal,
    vatAmount,
    total
  };
};

// Method to add status update
orderSchema.methods.addStatusUpdate = function(status, updatedBy, notes = '') {
  this.statusHistory.push({
    status,
    updatedBy,
    notes,
    timestamp: new Date()
  });
  this.status = status;
  this.updatedAt = new Date();
};

// Method to update driver location
orderSchema.methods.updateDriverLocation = function(latitude, longitude) {
  this.driverLocation.push({
    coordinates: { latitude, longitude },
    timestamp: new Date()
  });
};

// Virtual for order summary
orderSchema.virtual('orderSummary').get(function() {
  return {
    orderNumber: this.orderNumber,
    status: this.status,
    total: this.pricing.total,
    fuelType: this.fuelOrder.fuelType,
    quantity: this.fuelOrder.quantity,
    storeItemsCount: this.storeItems.length
  };
});

// Virtual for delivery address
orderSchema.virtual('fullDeliveryAddress').get(function() {
  if (!this.deliveryAddress) return '';
  return `${this.deliveryAddress.street}, ${this.deliveryAddress.suburb}, ${this.deliveryAddress.city}, ${this.deliveryAddress.province} ${this.deliveryAddress.postalCode}`;
});

module.exports = mongoose.model('Order', orderSchema);
