const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const driverSchema = new mongoose.Schema({
  // Basic Information
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  fullName: {
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

  // Driver-Specific Information
  driverLicense: {
    number: {
      type: String,
      required: true,
      unique: true
    },
    expiryDate: {
      type: Date,
      required: true
    },
    verified: {
      type: Boolean,
      default: false
    }
  },
  vehicle: {
    make: String,
    model: String,
    year: Number,
    licensePlate: String,
    color: String,
    fuelCapacity: Number,
    verified: {
      type: Boolean,
      default: false
    }
  },

  // FICA Compliance
  ficaStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  ficaDocuments: [{
    documentType: {
      type: String,
      enum: ['id_document', 'proof_of_address', 'selfie', 'driver_license']
    },
    documentUrl: String,
    uploadedAt: Date,
    verified: {
      type: Boolean,
      default: false
    }
  }],

  // Training & Compliance
  training: {
    completed: {
      type: Boolean,
      default: false
    },
    quizScore: {
      type: Number,
      min: 0,
      max: 100
    },
    quizPassed: {
      type: Boolean,
      default: false
    },
    completedAt: Date,
    modules: [{
      name: String,
      completed: {
        type: Boolean,
        default: false
      },
      score: Number,
      completedAt: Date
    }]
  },

  // Referral System
  referralCode: {
    type: String,
    unique: true
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver'
  },
  referrals: [{
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver'
    },
    joinedAt: Date,
    bonusPaid: {
      type: Boolean,
      default: false
    }
  }],
  signOnFee: {
    amount: {
      type: Number,
      default: 500
    },
    refunded: {
      type: Boolean,
      default: false
    },
    refundedAt: Date,
    tripsRequired: {
      type: Number,
      default: 100
    },
    tripsCompleted: {
      type: Number,
      default: 0
    }
  },

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
        enum: ['delivery_fee', 'tip', 'bonus', 'withdrawal', 'refund']
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
    enum: ['inactive', 'active', 'busy', 'offline'],
    default: 'inactive'
  },
  isAvailable: {
    type: Boolean,
    default: false
  },
  currentLocation: {
    coordinates: {
      latitude: Number,
      longitude: Number
    },
    updatedAt: Date
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
  lastActive: Date,
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
driverSchema.index({ email: 1 });
driverSchema.index({ phoneNumber: 1 });
driverSchema.index({ 'driverLicense.number': 1 });
driverSchema.index({ referralCode: 1 });
driverSchema.index({ 'currentLocation.coordinates': '2dsphere' });
driverSchema.index({ status: 1, isAvailable: 1 });

// Pre-save middleware to hash password and generate referral code
driverSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    try {
      const salt = await bcrypt.genSalt(12);
      this.password = await bcrypt.hash(this.password, salt);
    } catch (error) {
      return next(error);
    }
  }

  // Generate referral code if not exists
  if (!this.referralCode) {
    this.referralCode = this.generateReferralCode();
  }

  next();
});

// Method to compare password
driverSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to generate referral code
driverSchema.methods.generateReferralCode = function() {
  return 'DRIVER' + Math.random().toString(36).substr(2, 8).toUpperCase();
};

// Method to get public profile
driverSchema.methods.getPublicProfile = function() {
  const driverObject = this.toObject();
  delete driverObject.password;
  delete driverObject.verificationCode;
  delete driverObject.verificationExpires;
  delete driverObject.wallet;
  return driverObject;
};

// Method to update rating
driverSchema.methods.updateRating = function() {
  if (this.rating.reviews.length === 0) {
    this.rating.average = 0;
    this.rating.totalReviews = 0;
    return;
  }

  const totalRating = this.rating.reviews.reduce((sum, review) => sum + review.rating, 0);
  this.rating.average = totalRating / this.rating.reviews.length;
  this.rating.totalReviews = this.rating.reviews.length;
};

// Method to check if driver is flagged (10+ negative reviews)
driverSchema.methods.isFlagged = function() {
  const negativeReviews = this.rating.reviews.filter(review => review.rating <= 2);
  return negativeReviews.length >= 10;
};

module.exports = mongoose.model('Driver', driverSchema);
