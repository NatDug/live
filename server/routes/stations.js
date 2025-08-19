const express = require('express');
const router = express.Router();
const Station = require('../models/Station');
const Order = require('../models/Order');
const { verifyToken } = require('../middleware/auth');
const { notifyUser, notifyDriver } = require('../socketHandlers');
const logger = require('../utils/logger');

// Get station profile
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const station = await Station.findById(req.user.id).select('-password');
    if (!station) {
      return res.status(404).json({ success: false, message: 'Station not found' });
    }
    res.json({ success: true, station });
  } catch (error) {
    logger.error('Error fetching station profile:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update station profile
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const { 
      stationName, 
      phone, 
      businessDetails, 
      address, 
      operatingHours,
      fuelPrices 
    } = req.body;
    
    const station = await Station.findById(req.user.id);
    if (!station) {
      return res.status(404).json({ success: false, message: 'Station not found' });
    }

    // Update fields
    if (stationName) station.stationName = stationName;
    if (phone) station.phone = phone;
    if (businessDetails) station.businessDetails = businessDetails;
    if (address) station.address = address;
    if (operatingHours) station.operatingHours = operatingHours;
    if (fuelPrices) station.fuelPrices = fuelPrices;

    await station.save();
    
    const stationResponse = station.toObject();
    delete stationResponse.password;
    
    res.json({ success: true, station: stationResponse });
  } catch (error) {
    logger.error('Error updating station profile:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update station status (open/closed)
router.patch('/status', verifyToken, async (req, res) => {
  try {
    const { isOpen } = req.body;
    
    if (typeof isOpen !== 'boolean') {
      return res.status(400).json({ success: false, message: 'isOpen must be a boolean' });
    }

    const station = await Station.findById(req.user.id);
    if (!station) {
      return res.status(404).json({ success: false, message: 'Station not found' });
    }

    station.isOpen = isOpen;
    await station.save();

    res.json({ success: true, isOpen: station.isOpen });
  } catch (error) {
    logger.error('Error updating station status:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update fuel prices
router.patch('/fuel-prices', verifyToken, async (req, res) => {
  try {
    const { fuelPrices } = req.body;
    
    if (!fuelPrices || typeof fuelPrices !== 'object') {
      return res.status(400).json({ success: false, message: 'Fuel prices are required' });
    }

    const station = await Station.findById(req.user.id);
    if (!station) {
      return res.status(404).json({ success: false, message: 'Station not found' });
    }

    station.fuelPrices = fuelPrices;
    await station.save();

    res.json({ success: true, fuelPrices: station.fuelPrices });
  } catch (error) {
    logger.error('Error updating fuel prices:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get station orders
router.get('/orders', verifyToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    
    const station = await Station.findById(req.user.id);
    if (!station) {
      return res.status(404).json({ success: false, message: 'Station not found' });
    }

    const query = { stationId: station._id };
    if (status) {
      query.status = status;
    }

    const orders = await Order.find(query)
      .populate('userId', 'firstName lastName phone')
      .populate('driverId', 'firstName lastName phone vehicleDetails')
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
    logger.error('Error fetching station orders:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get specific order
router.get('/orders/:orderId', verifyToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const station = await Station.findById(req.user.id);
    if (!station) {
      return res.status(404).json({ success: false, message: 'Station not found' });
    }

    const order = await Order.findOne({ _id: orderId, stationId: station._id })
      .populate('userId', 'firstName lastName phone')
      .populate('driverId', 'firstName lastName phone vehicleDetails location');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.json({ success: true, order });
  } catch (error) {
    logger.error('Error fetching order:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update order status (station side)
router.patch('/orders/:orderId/status', verifyToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    
    const validStatuses = ['confirmed', 'ready_for_pickup', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const station = await Station.findById(req.user.id);
    if (!station) {
      return res.status(404).json({ success: false, message: 'Station not found' });
    }

    const order = await Order.findOne({ _id: orderId, stationId: station._id });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Validate status transition
    const validTransitions = {
      'pending': ['confirmed', 'cancelled'],
      'confirmed': ['ready_for_pickup', 'cancelled'],
      'ready_for_pickup': ['cancelled']
    };

    if (!validTransitions[order.status] || !validTransitions[order.status].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status transition' });
    }

    order.status = status;
    
    if (status === 'confirmed') {
      order.confirmedAt = new Date();
    } else if (status === 'ready_for_pickup') {
      order.readyAt = new Date();
    } else if (status === 'cancelled') {
      order.cancelledAt = new Date();
      order.cancellationReason = req.body.reason || 'Cancelled by station';
    }

    await order.save();

    // Notify user and driver
    notifyUser(order.userId, 'order_status_updated', {
      orderId: order._id,
      status: order.status,
      station: {
        id: station._id,
        name: station.stationName,
        phone: station.phone
      }
    });

    if (order.driverId) {
      notifyDriver(order.driverId, 'order_status_updated', {
        orderId: order._id,
        status: order.status,
        station: {
          id: station._id,
          name: station.stationName,
          phone: station.phone
        }
      });
    }

    res.json({ success: true, order });
  } catch (error) {
    logger.error('Error updating order status:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get station earnings
router.get('/earnings', verifyToken, async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    const station = await Station.findById(req.user.id);
    if (!station) {
      return res.status(404).json({ success: false, message: 'Station not found' });
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
          stationId: station._id,
          status: 'delivered',
          deliveredAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$total' },
          totalOrders: { $sum: 1 },
          averageOrderValue: { $avg: '$total' },
          fuelRevenue: { $sum: '$fuelTotal' },
          deliveryRevenue: { $sum: '$deliveryFee' }
        }
      }
    ]);

    const result = earnings[0] || {
      totalRevenue: 0,
      totalOrders: 0,
      averageOrderValue: 0,
      fuelRevenue: 0,
      deliveryRevenue: 0
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
    logger.error('Error fetching station earnings:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get station statistics
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const station = await Station.findById(req.user.id);
    if (!station) {
      return res.status(404).json({ success: false, message: 'Station not found' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayOrders = await Order.countDocuments({
      stationId: station._id,
      status: 'delivered',
      deliveredAt: { $gte: today }
    });

    const todayRevenue = await Order.aggregate([
      {
        $match: {
          stationId: station._id,
          status: 'delivered',
          deliveredAt: { $gte: today }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$total' }
        }
      }
    ]);

    const pendingOrders = await Order.countDocuments({
      stationId: station._id,
      status: { $in: ['pending', 'confirmed', 'ready_for_pickup'] }
    });

    const stats = {
      totalOrders: station.totalOrders || 0,
      totalRevenue: station.totalRevenue || 0,
      todayOrders,
      todayRevenue: todayRevenue[0]?.total || 0,
      pendingOrders,
      rating: station.rating || 0,
      isOpen: station.isOpen
    };

    res.json({ success: true, stats });
  } catch (error) {
    logger.error('Error fetching station stats:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update FICA documents
router.put('/fica-documents', verifyToken, async (req, res) => {
  try {
    const { businessRegistration, taxClearance, bankStatement } = req.body;
    
    const station = await Station.findById(req.user.id);
    if (!station) {
      return res.status(404).json({ success: false, message: 'Station not found' });
    }

    if (businessRegistration) station.ficaDocuments.businessRegistration = businessRegistration;
    if (taxClearance) station.ficaDocuments.taxClearance = taxClearance;
    if (bankStatement) station.ficaDocuments.bankStatement = bankStatement;

    station.ficaStatus = 'pending';
    await station.save();

    res.json({ success: true, ficaStatus: station.ficaStatus });
  } catch (error) {
    logger.error('Error updating FICA documents:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get available stations (public endpoint)
router.get('/available', async (req, res) => {
  try {
    const { city, fuelType } = req.query;
    
    const query = { isOpen: true, isVerified: true };
    if (city) {
      query['address.city'] = new RegExp(city, 'i');
    }

    const stations = await Station.find(query)
      .select('stationName address phone rating fuelPrices operatingHours')
      .sort({ rating: -1 });

    res.json({ success: true, stations });
  } catch (error) {
    logger.error('Error fetching available stations:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get station details (public endpoint)
router.get('/:stationId', async (req, res) => {
  try {
    const { stationId } = req.params;
    
    const station = await Station.findById(stationId)
      .select('stationName address phone rating fuelPrices operatingHours businessDetails')
      .populate('reviews.userId', 'firstName lastName');

    if (!station) {
      return res.status(404).json({ success: false, message: 'Station not found' });
    }

    res.json({ success: true, station });
  } catch (error) {
    logger.error('Error fetching station details:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Add station review
router.post('/:stationId/reviews', verifyToken, async (req, res) => {
  try {
    const { stationId } = req.params;
    const { rating, comment } = req.body;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
    }

    const station = await Station.findById(stationId);
    if (!station) {
      return res.status(404).json({ success: false, message: 'Station not found' });
    }

    // Check if user has already reviewed this station
    const existingReview = station.reviews.find(
      review => review.userId.toString() === req.user.id
    );

    if (existingReview) {
      return res.status(400).json({ success: false, message: 'You have already reviewed this station' });
    }

    // Add review
    station.reviews.push({
      userId: req.user.id,
      rating,
      comment,
      createdAt: new Date()
    });

    // Update average rating
    const totalRating = station.reviews.reduce((sum, review) => sum + review.rating, 0);
    station.rating = totalRating / station.reviews.length;

    await station.save();

    res.json({ success: true, rating: station.rating });
  } catch (error) {
    logger.error('Error adding station review:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
