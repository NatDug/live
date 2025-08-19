const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const Order = require('../models/Order');
const User = require('../models/User');
const Station = require('../models/Station');
const Driver = require('../models/Driver');
const PricingService = require('../services/pricingService');
const logger = require('../utils/logger');

const router = express.Router();

// Initialize pricing service
const pricingService = new PricingService();

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
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

// Create new order
router.post('/', verifyToken, [
  body('stationId').isMongoId().withMessage('Valid station ID required'),
  body('fuelType').isIn(['petrol95', 'petrol93', 'diesel']).withMessage('Valid fuel type required'),
  body('quantity').isFloat({ min: 5, max: 500 }).withMessage('Quantity must be between 5L and 500L'),
  body('deliveryAddress').isObject().withMessage('Delivery address required'),
  body('paymentMethod').isIn(['wallet', 'card', 'eft']).withMessage('Valid payment method required'),
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

    const { stationId, fuelType, quantity, deliveryAddress, paymentMethod, storeItems } = req.body;

    // Verify user exists and has sufficient wallet balance
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify station exists and is active
    const station = await Station.findById(stationId);
    if (!station || !station.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Station not found or inactive'
      });
    }

    // Check fuel availability
    const fuelKey = fuelType === 'petrol95' ? 'petrol95' : fuelType === 'petrol93' ? 'petrol93' : 'diesel';
    if (station.fuelInventory[fuelKey] < quantity) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient fuel stock at station'
      });
    }

    // Calculate pricing
    const pricing = await pricingService.calculateOrderPricing({
      fuelType,
      quantity,
      deliveryAddress,
      stationAddress: station.address,
      basePrice: station.fuelPrices[fuelKey] || 25.00 // Default price
    });

    // Calculate total including store items
    let storeItemsTotal = 0;
    const orderStoreItems = [];
    
    if (storeItems && storeItems.length > 0) {
      for (const item of storeItems) {
        const storeItem = station.convenienceStore.find(storeItem => 
          storeItem._id.toString() === item.itemId
        );
        
        if (storeItem && storeItem.stock >= item.quantity) {
          const itemTotal = storeItem.price * item.quantity;
          storeItemsTotal += itemTotal;
          orderStoreItems.push({
            itemId: storeItem._id,
            name: storeItem.name,
            price: storeItem.price,
            quantity: item.quantity,
            total: itemTotal
          });
        }
      }
    }

    const subtotal = pricing.fuelTotal + storeItemsTotal;
    const total = pricing.total + storeItemsTotal;

    // Check wallet balance if using wallet payment
    if (paymentMethod === 'wallet' && user.wallet.balance < total) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient wallet balance'
      });
    }

    // Create order
    const order = new Order({
      customer: req.user.userId,
      station: stationId,
      fuelType,
      quantity,
      fuelPrice: pricing.fuelPrice,
      fuelTotal: pricing.fuelTotal,
      deliveryAddress,
      deliveryFee: pricing.deliveryFee,
      vat: pricing.vat,
      loadSheddingSurcharge: pricing.loadSheddingSurcharge,
      areaSurcharge: pricing.areaSurcharge,
      platformCommission: pricing.platformCommission,
      storeItems: orderStoreItems,
      subtotal,
      total,
      payment: {
        method: paymentMethod,
        status: paymentMethod === 'wallet' ? 'paid' : 'pending',
        amount: total
      },
      status: 'pending'
    });

    await order.save();

    // Deduct from wallet if using wallet payment
    if (paymentMethod === 'wallet') {
      user.wallet.balance -= total;
      user.wallet.transactions.push({
        type: 'debit',
        amount: total,
        paymentMethod: 'wallet',
        description: `Order ${order.orderNumber}`,
        timestamp: new Date()
      });
      await user.save();
    }

    // Deduct fuel from station inventory
    station.fuelInventory[fuelKey] -= quantity;
    await station.save();

    logger.info(`New order created: ${order.orderNumber} by user ${user.email}`);

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order: {
        ...order.toObject(),
        pricing
      }
    });

  } catch (error) {
    logger.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get order by ID
router.get('/:orderId', verifyToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    let query = { _id: orderId };

    // Filter based on user type
    switch (req.user.userType) {
      case 'user':
        query.customer = req.user.userId;
        break;
      case 'driver':
        query.driver = req.user.userId;
        break;
      case 'station':
        query.station = req.user.userId;
        break;
      default:
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
    }

    const order = await Order.findOne(query)
      .populate('customer', 'firstName lastName phone email')
      .populate('station', 'stationName address phone')
      .populate('driver', 'firstName lastName phone vehicleDetails');

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
    logger.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update order status
router.patch('/:orderId/status', verifyToken, [
  body('status').isIn(['pending', 'confirmed', 'preparing', 'ready', 'assigned', 'in_transit', 'delivered', 'cancelled']).withMessage('Valid status required'),
  body('note').optional().trim().isLength({ max: 500 }).withMessage('Note too long'),
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
    const { status, note } = req.body;

    let query = { _id: orderId };
    
    // Filter based on user type
    switch (req.user.userType) {
      case 'user':
        query.customer = req.user.userId;
        break;
      case 'driver':
        query.driver = req.user.userId;
        break;
      case 'station':
        query.station = req.user.userId;
        break;
      default:
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
    }

    const order = await Order.findOne(query);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Validate status transition
    const validTransitions = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['preparing', 'cancelled'],
      preparing: ['ready'],
      ready: ['assigned'],
      assigned: ['in_transit'],
      in_transit: ['delivered'],
      delivered: [],
      cancelled: []
    };

    if (!validTransitions[order.status].includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status transition from ${order.status} to ${status}`
      });
    }

    // Update order status
    order.status = status;
    order.statusHistory.push({
      status,
      timestamp: new Date(),
      note: note || `Status updated to ${status}`,
      updatedBy: req.user.userType
    });

    // Handle specific status changes
    if (status === 'assigned' && req.user.userType === 'station') {
      // Assign driver (this would typically be done by the system)
      // For now, we'll just update the status
    }

    if (status === 'delivered') {
      order.deliveredAt = new Date();
      
      // Process earnings for driver and station
      if (order.driver) {
        const driver = await Driver.findById(order.driver);
        if (driver) {
          const driverEarnings = order.deliveryFee * 0.8; // 80% of delivery fee
          driver.earnings.total += driverEarnings;
          driver.earnings.today += driverEarnings;
          driver.earnings.history.push({
            orderId: order._id,
            amount: driverEarnings,
            timestamp: new Date()
          });
          await driver.save();
        }
      }

      // Station earnings
      const station = await Station.findById(order.station);
      if (station) {
        const stationEarnings = order.fuelTotal + order.storeItems.reduce((sum, item) => sum + item.total, 0);
        station.earnings.total += stationEarnings;
        station.earnings.today += stationEarnings;
        station.earnings.history.push({
          orderId: order._id,
          amount: stationEarnings,
          timestamp: new Date()
        });
        await station.save();
      }
    }

    await order.save();

    logger.info(`Order status updated: ${order.orderNumber} to ${status} by ${req.user.userType}`);

    res.json({
      success: true,
      message: 'Order status updated successfully',
      order
    });

  } catch (error) {
    logger.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Assign driver to order
router.post('/:orderId/assign-driver', verifyToken, [
  body('driverId').isMongoId().withMessage('Valid driver ID required'),
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
    const { driverId } = req.body;

    // Only stations can assign drivers
    if (req.user.userType !== 'station') {
      return res.status(403).json({
        success: false,
        message: 'Only stations can assign drivers'
      });
    }

    const order = await Order.findOne({
      _id: orderId,
      station: req.user.userId,
      status: 'ready'
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or not ready for assignment'
      });
    }

    // Verify driver exists and is available
    const driver = await Driver.findById(driverId);
    if (!driver || !driver.isActive || driver.ficaStatus !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Driver not available'
      });
    }

    // Assign driver
    order.driver = driverId;
    order.status = 'assigned';
    order.statusHistory.push({
      status: 'assigned',
      timestamp: new Date(),
      note: `Assigned to driver ${driver.firstName} ${driver.lastName}`,
      updatedBy: 'station'
    });

    await order.save();

    logger.info(`Driver assigned to order: ${order.orderNumber}, driver: ${driver.email}`);

    res.json({
      success: true,
      message: 'Driver assigned successfully',
      order
    });

  } catch (error) {
    logger.error('Assign driver error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update driver location
router.post('/:orderId/driver-location', verifyToken, [
  body('latitude').isFloat().withMessage('Valid latitude required'),
  body('longitude').isFloat().withMessage('Valid longitude required'),
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
    const { latitude, longitude } = req.body;

    // Only drivers can update their location
    if (req.user.userType !== 'driver') {
      return res.status(403).json({
        success: false,
        message: 'Only drivers can update location'
      });
    }

    const order = await Order.findOne({
      _id: orderId,
      driver: req.user.userId
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Update driver location
    order.driverLocation = {
      latitude,
      longitude,
      timestamp: new Date()
    };

    await order.save();

    res.json({
      success: true,
      message: 'Location updated successfully'
    });

  } catch (error) {
    logger.error('Update driver location error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get orders list (filtered by user type)
router.get('/', verifyToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    let query = {};
    
    // Filter based on user type
    switch (req.user.userType) {
      case 'user':
        query.customer = req.user.userId;
        break;
      case 'driver':
        query.driver = req.user.userId;
        break;
      case 'station':
        query.station = req.user.userId;
        break;
      default:
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
    }

    if (status) {
      query.status = status;
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const orders = await Order.find(query)
      .populate('customer', 'firstName lastName phone')
      .populate('station', 'stationName address')
      .populate('driver', 'firstName lastName phone')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      orders,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });

  } catch (error) {
    logger.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get available orders for drivers
router.get('/available/driver', verifyToken, async (req, res) => {
  try {
    // Only drivers can see available orders
    if (req.user.userType !== 'driver') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const { latitude, longitude, radius = 10 } = req.query; // radius in km

    const query = {
      status: 'ready',
      driver: { $exists: false }
    };

    const orders = await Order.find(query)
      .populate('station', 'stationName address')
      .populate('customer', 'firstName lastName phone')
      .sort({ createdAt: -1 })
      .limit(20);

    // Filter by distance if coordinates provided
    let filteredOrders = orders;
    if (latitude && longitude) {
      filteredOrders = orders.filter(order => {
        const distance = calculateDistance(
          parseFloat(latitude),
          parseFloat(longitude),
          order.station.address.coordinates[1],
          order.station.address.coordinates[0]
        );
        return distance <= radius;
      });
    }

    res.json({
      success: true,
      orders: filteredOrders
    });

  } catch (error) {
    logger.error('Get available orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Accept order (for drivers)
router.post('/:orderId/accept', verifyToken, async (req, res) => {
  try {
    const { orderId } = req.params;

    // Only drivers can accept orders
    if (req.user.userType !== 'driver') {
      return res.status(403).json({
        success: false,
        message: 'Only drivers can accept orders'
      });
    }

    const order = await Order.findOne({
      _id: orderId,
      status: 'ready',
      driver: { $exists: false }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not available'
      });
    }

    // Check if driver is available
    const driver = await Driver.findById(req.user.userId);
    if (!driver || !driver.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Driver not available'
      });
    }

    // Assign driver to order
    order.driver = req.user.userId;
    order.status = 'assigned';
    order.statusHistory.push({
      status: 'assigned',
      timestamp: new Date(),
      note: `Accepted by driver ${driver.firstName} ${driver.lastName}`,
      updatedBy: 'driver'
    });

    await order.save();

    logger.info(`Order accepted by driver: ${order.orderNumber}, driver: ${driver.email}`);

    res.json({
      success: true,
      message: 'Order accepted successfully',
      order
    });

  } catch (error) {
    logger.error('Accept order error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Helper function to calculate distance between two points
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in km
  return distance;
}

module.exports = router;
