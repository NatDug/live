const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Driver = require('../models/Driver');
const Order = require('../models/Order');
const { verifyToken } = require('../middleware/auth');
const { notifyUser, notifyStation } = require('../socketHandlers');
const logger = require('../utils/logger');

// Get driver profile
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const driver = await Driver.findById(req.user.id).select('-password');
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }
    res.json({ success: true, driver });
  } catch (error) {
    logger.error('Error fetching driver profile:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update driver profile
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const { firstName, lastName, phone, licenseNumber, vehicleDetails } = req.body;
    
    const driver = await Driver.findById(req.user.id);
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    // Update fields
    if (firstName) driver.firstName = firstName;
    if (lastName) driver.lastName = lastName;
    if (phone) driver.phone = phone;
    if (licenseNumber) driver.licenseNumber = licenseNumber;
    if (vehicleDetails) driver.vehicleDetails = vehicleDetails;

    await driver.save();
    
    const driverResponse = driver.toObject();
    delete driverResponse.password;
    
    res.json({ success: true, driver: driverResponse });
  } catch (error) {
    logger.error('Error updating driver profile:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update driver status (online/offline)
router.patch('/status', verifyToken, async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['online', 'offline', 'busy'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const driver = await Driver.findById(req.user.id);
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    driver.status = status;
    await driver.save();

    res.json({ success: true, status: driver.status });
  } catch (error) {
    logger.error('Error updating driver status:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update driver location
router.patch('/location', verifyToken, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, message: 'Latitude and longitude are required' });
    }

    const driver = await Driver.findById(req.user.id);
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    driver.location = { latitude, longitude };
    await driver.save();

    res.json({ success: true, location: driver.location });
  } catch (error) {
    logger.error('Error updating driver location:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get available orders for driver
router.get('/orders/available', verifyToken, async (req, res) => {
  try {
    const driver = await Driver.findById(req.user.id);
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    if (driver.status !== 'online') {
      return res.status(400).json({ success: false, message: 'Driver must be online to view available orders' });
    }

    const availableOrders = await Order.find({
      status: 'pending',
      driverId: null,
      'deliveryAddress.city': { $in: driver.serviceAreas || [] }
    })
    .populate('userId', 'firstName lastName phone')
    .populate('stationId', 'stationName address')
    .sort({ createdAt: -1 })
    .limit(20);

    res.json({ success: true, orders: availableOrders });
  } catch (error) {
    logger.error('Error fetching available orders:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Accept an order
router.post('/orders/:orderId/accept', verifyToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const driver = await Driver.findById(req.user.id);
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    if (driver.status !== 'online') {
      return res.status(400).json({ success: false, message: 'Driver must be online to accept orders' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.status !== 'pending' || order.driverId) {
      return res.status(400).json({ success: false, message: 'Order is not available' });
    }

    // Check if driver is in service area
    if (driver.serviceAreas && driver.serviceAreas.length > 0) {
      const orderCity = order.deliveryAddress.city;
      if (!driver.serviceAreas.includes(orderCity)) {
        return res.status(400).json({ success: false, message: 'Order is outside your service area' });
      }
    }

    // Assign driver to order
    order.driverId = driver._id;
    order.status = 'assigned';
    order.assignedAt = new Date();
    await order.save();

    // Update driver status
    driver.status = 'busy';
    await driver.save();

    // Notify user and station
    notifyUser(order.userId, 'order_assigned', {
      orderId: order._id,
      driver: {
        id: driver._id,
        name: `${driver.firstName} ${driver.lastName}`,
        phone: driver.phone,
        vehicle: driver.vehicleDetails
      }
    });

    notifyStation(order.stationId, 'order_assigned', {
      orderId: order._id,
      driver: {
        id: driver._id,
        name: `${driver.firstName} ${driver.lastName}`,
        phone: driver.phone
      }
    });

    res.json({ success: true, order });
  } catch (error) {
    logger.error('Error accepting order:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get driver's current order
router.get('/orders/current', verifyToken, async (req, res) => {
  try {
    const driver = await Driver.findById(req.user.id);
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    const currentOrder = await Order.findOne({
      driverId: driver._id,
      status: { $in: ['assigned', 'picked_up', 'in_transit'] }
    })
    .populate('userId', 'firstName lastName phone')
    .populate('stationId', 'stationName address');

    res.json({ success: true, order: currentOrder });
  } catch (error) {
    logger.error('Error fetching current order:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update order status
router.patch('/orders/:orderId/status', verifyToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    
    const validStatuses = ['picked_up', 'in_transit', 'delivered'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const driver = await Driver.findById(req.user.id);
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    const order = await Order.findOne({ _id: orderId, driverId: driver._id });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Validate status transition
    const validTransitions = {
      'assigned': ['picked_up'],
      'picked_up': ['in_transit'],
      'in_transit': ['delivered']
    };

    if (!validTransitions[order.status] || !validTransitions[order.status].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status transition' });
    }

    order.status = status;
    
    if (status === 'picked_up') {
      order.pickedUpAt = new Date();
    } else if (status === 'delivered') {
      order.deliveredAt = new Date();
      order.driverEarnings = order.deliveryFee * 0.8; // 80% of delivery fee
      
      // Update driver earnings
      driver.totalEarnings += order.driverEarnings;
      driver.completedOrders += 1;
      
      // Set driver back to online
      driver.status = 'online';
      await driver.save();
    }

    await order.save();

    // Notify user and station
    notifyUser(order.userId, 'order_status_updated', {
      orderId: order._id,
      status: order.status,
      driver: {
        id: driver._id,
        name: `${driver.firstName} ${driver.lastName}`,
        phone: driver.phone
      }
    });

    notifyStation(order.stationId, 'order_status_updated', {
      orderId: order._id,
      status: order.status
    });

    res.json({ success: true, order });
  } catch (error) {
    logger.error('Error updating order status:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get driver's order history
router.get('/orders', verifyToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    
    const driver = await Driver.findById(req.user.id);
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    const query = { driverId: driver._id };
    if (status) {
      query.status = status;
    }

    const orders = await Order.find(query)
      .populate('userId', 'firstName lastName phone')
      .populate('stationId', 'stationName address')
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
    logger.error('Error fetching driver orders:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get driver earnings
router.get('/earnings', verifyToken, async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    const driver = await Driver.findById(req.user.id);
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    let startDate;
    const now = new Date();
    
    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const earnings = await Order.aggregate([
      {
        $match: {
          driverId: driver._id,
          status: 'delivered',
          deliveredAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalEarnings: { $sum: '$driverEarnings' },
          totalOrders: { $sum: 1 },
          averageEarnings: { $avg: '$driverEarnings' }
        }
      }
    ]);

    const result = earnings[0] || {
      totalEarnings: 0,
      totalOrders: 0,
      averageEarnings: 0
    };

    res.json({
      success: true,
      earnings: {
        ...result,
        period,
        startDate,
        endDate: now
      }
    });
  } catch (error) {
    logger.error('Error fetching driver earnings:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update FICA documents
router.put('/fica-documents', verifyToken, async (req, res) => {
  try {
    const { idDocument, proofOfAddress, licenseDocument } = req.body;
    
    const driver = await Driver.findById(req.user.id);
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    if (idDocument) driver.ficaDocuments.idDocument = idDocument;
    if (proofOfAddress) driver.ficaDocuments.proofOfAddress = proofOfAddress;
    if (licenseDocument) driver.ficaDocuments.licenseDocument = licenseDocument;

    driver.ficaStatus = 'pending';
    await driver.save();

    res.json({ success: true, ficaStatus: driver.ficaStatus });
  } catch (error) {
    logger.error('Error updating FICA documents:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get driver statistics
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const driver = await Driver.findById(req.user.id);
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayOrders = await Order.countDocuments({
      driverId: driver._id,
      status: 'delivered',
      deliveredAt: { $gte: today }
    });

    const todayEarnings = await Order.aggregate([
      {
        $match: {
          driverId: driver._id,
          status: 'delivered',
          deliveredAt: { $gte: today }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$driverEarnings' }
        }
      }
    ]);

    const stats = {
      totalOrders: driver.completedOrders,
      totalEarnings: driver.totalEarnings,
      todayOrders,
      todayEarnings: todayEarnings[0]?.total || 0,
      rating: driver.rating || 0,
      status: driver.status,
      ficaStatus: driver.ficaStatus
    };

    res.json({ success: true, stats });
  } catch (error) {
    logger.error('Error fetching driver stats:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
