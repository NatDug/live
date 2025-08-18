const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const stationSchema = new mongoose.Schema({
  // Basic Information
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  stationName: {
    type: String,
    required: true,
    trim: true
  },
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },

  // Station Details
  businessRegistration: {
    number: {
      type: String,
      required: true,
      unique: true
    },
    verified: {
      type: Boolean,
      default: false
    }
  },
  vatNumber: {
    type: String,
    required: true,
    unique: true
  },

  // Location & Address
  address: {
    street: String,
    suburb: String,
    city: String,
    province: String,
    postalCode: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },

  // Operating Hours
  operatingHours: {
    monday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
    tuesday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
    wednesday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
    thursday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
    friday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
    saturday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
    sunday: { open: String, close: String, isOpen: { type: Boolean, default: true } }
  },

  // Fuel Inventory & Pricing
  fuelInventory: {
    petrol: {
      available: {
        type: Boolean,
        default: true
      },
      price: {
        type: Number,
        required: true
      },
      stock: {
        type: Number,
        default: 0
      },
      unit: {
        type: String,
        default: 'liters'
      }
    },
    diesel: {
      available: {
        type: Boolean,
        default: true
      },
      price: {
        type: Number,
        required: true
      },
      stock: {
        type: Number,
        default: 0
      },
      unit: {
        type: String,
        default: 'liters'
      }
    }
  },

  // Convenience Store Items
  storeItems: [{
    name: {
      type: String,
      required: true
    },
    description: String,
    price: {
      type: Number,
      required: true
    },
    category: {
      type: String,
      enum: ['food', 'beverages', 'snacks', 'essentials', 'automotive'],
      default: 'essentials'
    },
    image: String,
    available: {
      type: Boolean,
      default: true
    },
    stock: {
      type: Number,
      default: 0
    },
    featured: {
      type: Boolean,
      default: false
    }
  }],

  // Promotions
  promotions: [{
    title: {
      type: String,
      required: true
    },
    description: String,
    type: {
      type: String,
      enum: ['discount', 'free_delivery', 'bonus_item'],
      default: 'discount'
    },
    discountPercentage: Number,
    discountAmount: Number,
    minimumOrder: Number,
    validFrom: Date,
    validTo: Date,
    active: {
      type: Boolean,
      default: true
    },
    applicableItems: [{
      type: String,
      enum: ['fuel', 'store_items', 'all']
    }]
  }],

  // FICA Compliance
  ficaStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  ficaDocuments: [{
    documentType: {
      type: String,
      enum: ['business_registration', 'vat_certificate', 'proof_of_address', 'director_id']
    },
    documentUrl: String,
    uploadedAt: Date,
    verified: {
      type: Boolean,
      default: false
    }
  }],

  // Earnings & Wallet
  wallet: {
    balance: {
      type: Number,
      default: 0
    },
    totalEarnings: {
      type: Number,
      default: 0
    },
    transactions: [{
      type: {
        type: String,
        enum: ['order_payment', 'withdrawal', 'refund', 'commission']
      },
      amount: Number,
      description: String,
      orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order'
      },
      timestamp: {
        type: Date,
        default: Date.now
      },
      status: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'pending'
      }
    }]
  },

  // Performance & Ratings
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    totalReviews: {
      type: Number,
      default: 0
    },
    reviews: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order'
      },
      rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
      },
      comment: String,
      createdAt: {
        type: Date,
        default: Date.now
      }
    }]
  },

  // Status & Availability
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance', 'closed'],
    default: 'active'
  },
  isOpen: {
    type: Boolean,
    default: true
  },

  // Account Status
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationCode: String,
  verificationExpires: Date,

  // Timestamps
  lastLogin: Date,
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
stationSchema.index({ email: 1 });
stationSchema.index({ phoneNumber: 1 });
stationSchema.index({ 'businessRegistration.number': 1 });
stationSchema.index({ vatNumber: 1 });
stationSchema.index({ 'address.coordinates': '2dsphere' });
stationSchema.index({ status: 1, isOpen: 1 });

// Pre-save middleware to hash password
stationSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
stationSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to get public profile
stationSchema.methods.getPublicProfile = function() {
  const stationObject = this.toObject();
  delete stationObject.password;
  delete stationObject.verificationCode;
  delete stationObject.verificationExpires;
  delete stationObject.wallet;
  return stationObject;
};

// Method to update rating
stationSchema.methods.updateRating = function() {
  if (this.rating.reviews.length === 0) {
    this.rating.average = 0;
    this.rating.totalReviews = 0;
    return;
  }

  const totalRating = this.rating.reviews.reduce((sum, review) => sum + review.rating, 0);
  this.rating.average = totalRating / this.rating.reviews.length;
  this.rating.totalReviews = this.rating.reviews.length;
};

// Method to check if station is currently open
stationSchema.methods.isCurrentlyOpen = function() {
  if (!this.isOpen || this.status !== 'active') return false;
  
  const now = new Date();
  const dayOfWeek = now.toLocaleLowerCase().slice(0, 3);
  const currentTime = now.toTimeString().slice(0, 5);
  
  const todayHours = this.operatingHours[dayOfWeek];
  if (!todayHours || !todayHours.isOpen) return false;
  
  return currentTime >= todayHours.open && currentTime <= todayHours.close;
};

// Virtual for full address
stationSchema.virtual('fullAddress').get(function() {
  if (!this.address) return '';
  return `${this.address.street}, ${this.address.suburb}, ${this.address.city}, ${this.address.province} ${this.address.postalCode}`;
});

module.exports = mongoose.model('Station', stationSchema);
