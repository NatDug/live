const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Order = require('../models/Order');
const logger = require('../utils/logger');

const router = express.Router();

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'No token provided'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.userType !== 'user') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. User token required.'
      });
    }
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

// Get user profile
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: user.getPublicProfile()
    });

  } catch (error) {
    logger.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update user profile
router.put('/profile', verifyToken, [
  body('firstName').optional().trim().notEmpty(),
  body('lastName').optional().trim().notEmpty(),
  body('phone').optional().trim().notEmpty(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { firstName, lastName, phone, preferences } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phone) user.phone = phone;
    if (preferences) user.preferences = { ...user.preferences, ...preferences };

    await user.save();

    logger.info(`User profile updated: ${user.email}`);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: user.getPublicProfile()
    });

  } catch (error) {
    logger.error('Update user profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get user addresses
router.get('/addresses', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      addresses: user.addresses
    });

  } catch (error) {
    logger.error('Get user addresses error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Add new address
router.post('/addresses', verifyToken, [
  body('street').trim().notEmpty(),
  body('city').trim().notEmpty(),
  body('province').trim().notEmpty(),
  body('postalCode').trim().notEmpty(),
  body('isDefault').optional().isBoolean(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { street, city, province, postalCode, isDefault } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const newAddress = {
      street,
      city,
      province,
      postalCode,
      isDefault: isDefault || false
    };

    // If this is the first address or marked as default, update other addresses
    if (isDefault || user.addresses.length === 0) {
      user.addresses.forEach(addr => addr.isDefault = false);
      newAddress.isDefault = true;
    }

    user.addresses.push(newAddress);
    await user.save();

    logger.info(`New address added for user: ${user.email}`);

    res.status(201).json({
      success: true,
      message: 'Address added successfully',
      addresses: user.addresses
    });

  } catch (error) {
    logger.error('Add user address error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update address
router.put('/addresses/:addressId', verifyToken, [
  body('street').optional().trim().notEmpty(),
  body('city').optional().trim().notEmpty(),
  body('province').optional().trim().notEmpty(),
  body('postalCode').optional().trim().notEmpty(),
  body('isDefault').optional().isBoolean(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { addressId } = req.params;
    const { street, city, province, postalCode, isDefault } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const addressIndex = user.addresses.findIndex(addr => addr._id.toString() === addressId);
    if (addressIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    // Update address fields
    if (street) user.addresses[addressIndex].street = street;
    if (city) user.addresses[addressIndex].city = city;
    if (province) user.addresses[addressIndex].province = province;
    if (postalCode) user.addresses[addressIndex].postalCode = postalCode;

    // Handle default address
    if (isDefault !== undefined) {
      if (isDefault) {
        user.addresses.forEach(addr => addr.isDefault = false);
        user.addresses[addressIndex].isDefault = true;
      } else {
        user.addresses[addressIndex].isDefault = false;
      }
    }

    await user.save();

    logger.info(`Address updated for user: ${user.email}`);

    res.json({
      success: true,
      message: 'Address updated successfully',
      addresses: user.addresses
    });

  } catch (error) {
    logger.error('Update user address error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Delete address
router.delete('/addresses/:addressId', verifyToken, async (req, res) => {
  try {
    const { addressId } = req.params;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const addressIndex = user.addresses.findIndex(addr => addr._id.toString() === addressId);
    if (addressIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    // Remove address
    user.addresses.splice(addressIndex, 1);

    // If we deleted the default address and there are other addresses, make the first one default
    if (user.addresses.length > 0 && !user.addresses.some(addr => addr.isDefault)) {
      user.addresses[0].isDefault = true;
    }

    await user.save();

    logger.info(`Address deleted for user: ${user.email}`);

    res.json({
      success: true,
      message: 'Address deleted successfully',
      addresses: user.addresses
    });

  } catch (error) {
    logger.error('Delete user address error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get wallet information
router.get('/wallet', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      wallet: user.wallet
    });

  } catch (error) {
    logger.error('Get user wallet error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Add funds to wallet
router.post('/wallet/add-funds', verifyToken, [
  body('amount').isFloat({ min: 10 }).withMessage('Minimum amount is R10'),
  body('paymentMethod').isIn(['card', 'eft', 'cash']).withMessage('Invalid payment method'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { amount, paymentMethod } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // TODO: Process payment with Yoco/Ozow
    // For now, just add to wallet
    user.wallet.balance += amount;
    user.wallet.transactions.push({
      type: 'credit',
      amount,
      paymentMethod,
      description: 'Wallet top-up',
      timestamp: new Date()
    });

    await user.save();

    logger.info(`Funds added to wallet for user: ${user.email}, amount: R${amount}`);

    res.json({
      success: true,
      message: 'Funds added successfully',
      wallet: user.wallet
    });

  } catch (error) {
    logger.error('Add funds to wallet error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get user orders
router.get('/orders', verifyToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const query = { customer: req.user.userId };
    if (status) {
      query.status = status;
    }

    const orders = await Order.find(query)
      .populate('station', 'stationName address')
      .populate('driver', 'firstName lastName phone')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      orders,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });

  } catch (error) {
    logger.error('Get user orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get specific order
router.get('/orders/:orderId', verifyToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const order = await Order.findOne({
      _id: orderId,
      customer: req.user.userId
    })
    .populate('station', 'stationName address phone')
    .populate('driver', 'firstName lastName phone vehicleDetails')
    .populate('customer', 'firstName lastName phone');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      order
    });

  } catch (error) {
    logger.error('Get user order error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Cancel order
router.post('/orders/:orderId/cancel', verifyToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const order = await Order.findOne({
      _id: orderId,
      customer: req.user.userId
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if order can be cancelled
    if (!['pending', 'confirmed'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: 'Order cannot be cancelled at this stage'
      });
    }

    // Update order status
    order.status = 'cancelled';
    order.statusHistory.push({
      status: 'cancelled',
      timestamp: new Date(),
      note: reason || 'Cancelled by customer'
    });

    // Refund to wallet if payment was made
    if (order.payment.status === 'paid') {
      user.wallet.balance += order.total;
      user.wallet.transactions.push({
        type: 'credit',
        amount: order.total,
        paymentMethod: 'refund',
        description: `Refund for cancelled order ${order.orderNumber}`,
        timestamp: new Date()
      });
    }

    await Promise.all([order.save(), user.save()]);

    logger.info(`Order cancelled by user: ${user.email}, order: ${order.orderNumber}`);

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      order
    });

  } catch (error) {
    logger.error('Cancel user order error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Rate order
router.post('/orders/:orderId/rate', verifyToken, [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').optional().trim().isLength({ max: 500 }).withMessage('Comment too long'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { orderId } = req.params;
    const { rating, comment } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const order = await Order.findOne({
      _id: orderId,
      customer: req.user.userId
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.status !== 'delivered') {
      return res.status(400).json({
        success: false,
        message: 'Order must be delivered before rating'
      });
    }

    if (order.rating) {
      return res.status(400).json({
        success: false,
        message: 'Order already rated'
      });
    }

    // Add rating
    order.rating = {
      rating,
      comment,
      timestamp: new Date()
    };

    await order.save();

    logger.info(`Order rated by user: ${user.email}, order: ${order.orderNumber}, rating: ${rating}`);

    res.json({
      success: true,
      message: 'Order rated successfully',
      order
    });

  } catch (error) {
    logger.error('Rate user order error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
