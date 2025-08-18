const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
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

  // FICA Compliance
  ficaStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  ficaDocuments: [{
    documentType: {
      type: String,
      enum: ['id_document', 'proof_of_address', 'selfie']
    },
    documentUrl: String,
    uploadedAt: Date,
    verified: {
      type: Boolean,
      default: false
    }
  }],

  // Address Information
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

  // Wallet & Payments
  wallet: {
    balance: {
      type: Number,
      default: 0
    },
    transactions: [{
      type: {
        type: String,
        enum: ['deposit', 'withdrawal', 'payment', 'refund']
      },
      amount: Number,
      description: String,
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

  // Preferences
  preferences: {
    fuelType: {
      type: String,
      enum: ['petrol', 'diesel'],
      default: 'petrol'
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      sms: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      }
    },
    language: {
      type: String,
      enum: ['en', 'af', 'zu'],
      default: 'en'
    }
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
userSchema.index({ email: 1 });
userSchema.index({ phoneNumber: 1 });
userSchema.index({ 'address.coordinates': '2dsphere' });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
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
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to get public profile (without sensitive data)
userSchema.methods.getPublicProfile = function() {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.verificationCode;
  delete userObject.verificationExpires;
  return userObject;
};

// Virtual for full address
userSchema.virtual('fullAddress').get(function() {
  if (!this.address) return '';
  return `${this.address.street}, ${this.address.suburb}, ${this.address.city}, ${this.address.province} ${this.address.postalCode}`;
});

module.exports = mongoose.model('User', userSchema);
