const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Driver = require('../models/Driver');
const Station = require('../models/Station');
const Order = require('../models/Order');
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const logger = require('../utils/logger');

// Apply admin middleware to all routes
router.use(verifyToken, verifyAdmin);

// Get dashboard statistics
router.get('/dashboard', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // User statistics
    const totalUsers = await User.countDocuments();
    const newUsersToday = await User.countDocuments({ createdAt: { $gte: today } });
    const activeUsers = await User.countDocuments({ lastLoginAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } });

    // Driver statistics
    const totalDrivers = await Driver.countDocuments();
    const activeDrivers = await Driver.countDocuments({ status: 'online' });
    const pendingDrivers = await Driver.countDocuments({ ficaStatus: 'pending' });

    // Station statistics
    const totalStations = await Station.countDocuments();
    const activeStations = await Station.countDocuments({ isOpen: true });
    const pendingStations = await Station.countDocuments({ ficaStatus: 'pending' });

    // Order statistics
    const totalOrders = await Order.countDocuments();
    const ordersToday = await Order.countDocuments({ createdAt: { $gte: today } });
    const pendingOrders = await Order.countDocuments({ status: 'pending' });
    const completedOrders = await Order.countDocuments({ status: 'delivered' });

    // Revenue statistics
    const totalRevenue = await Order.aggregate([
      { $match: { status: 'delivered' } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);

    const revenueToday = await Order.aggregate([
      { $match: { status: 'delivered', deliveredAt: { $gte: today } } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);

    const platformCommission = await Order.aggregate([
      { $match: { status: 'delivered' } },
      { $group: { _id: null, total: { $sum: '$platformCommission' } } }
    ]);

    const stats = {
      users: {
        total: totalUsers,
        newToday: newUsersToday,
        active: activeUsers
      },
      drivers: {
        total: totalDrivers,
        active: activeDrivers,
        pending: pendingDrivers
      },
      stations: {
        total: totalStations,
        active: activeStations,
        pending: pendingStations
      },
      orders: {
        total: totalOrders,
        today: ordersToday,
        pending: pendingOrders,
        completed: completedOrders
      },
      revenue: {
        total: totalRevenue[0]?.total || 0,
        today: revenueToday[0]?.total || 0,
        platformCommission: platformCommission[0]?.total || 0
      }
    };

    res.json({ success: true, stats });
  } catch (error) {
    logger.error('Error fetching admin dashboard stats:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get all users
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;

    const query = {};
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    if (status) {
      query.status = status;
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    logger.error('Error fetching users:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get user details
router.get('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Get user's orders
    const orders = await Order.find({ userId: user._id })
      .populate('stationId', 'stationName')
      .populate('driverId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({ success: true, user, orders });
  } catch (error) {
    logger.error('Error fetching user details:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update user status
router.patch('/users/:userId/status', async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;

    if (!['active', 'suspended', 'banned'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.status = status;
    await user.save();

    res.json({ success: true, user });
  } catch (error) {
    logger.error('Error updating user status:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get all drivers
router.get('/drivers', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status, ficaStatus } = req.query;

    const query = {};
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { licenseNumber: { $regex: search, $options: 'i' } }
      ];
    }
    if (status) {
      query.status = status;
    }
    if (ficaStatus) {
      query.ficaStatus = ficaStatus;
    }

    const drivers = await Driver.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Driver.countDocuments(query);

    res.json({
      success: true,
      drivers,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    logger.error('Error fetching drivers:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get driver details
router.get('/drivers/:driverId', async (req, res) => {
  try {
    const { driverId } = req.params;

    const driver = await Driver.findById(driverId).select('-password');
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    // Get driver's orders
    const orders = await Order.find({ driverId: driver._id })
      .populate('userId', 'firstName lastName')
      .populate('stationId', 'stationName')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({ success: true, driver, orders });
  } catch (error) {
    logger.error('Error fetching driver details:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update driver FICA status
router.patch('/drivers/:driverId/fica', async (req, res) => {
  try {
    const { driverId } = req.params;
    const { ficaStatus, notes } = req.body;

    if (!['pending', 'approved', 'rejected'].includes(ficaStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid FICA status' });
    }

    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    driver.ficaStatus = ficaStatus;
    if (notes) {
      driver.ficaNotes = notes;
    }
    await driver.save();

    res.json({ success: true, driver });
  } catch (error) {
    logger.error('Error updating driver FICA status:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get all stations
router.get('/stations', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status, ficaStatus } = req.query;

    const query = {};
    if (search) {
      query.$or = [
        { stationName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    if (status !== undefined) {
      query.isOpen = status === 'open';
    }
    if (ficaStatus) {
      query.ficaStatus = ficaStatus;
    }

    const stations = await Station.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Station.countDocuments(query);

    res.json({
      success: true,
      stations,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    logger.error('Error fetching stations:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get station details
router.get('/stations/:stationId', async (req, res) => {
  try {
    const { stationId } = req.params;

    const station = await Station.findById(stationId).select('-password');
    if (!station) {
      return res.status(404).json({ success: false, message: 'Station not found' });
    }

    // Get station's orders
    const orders = await Order.find({ stationId: station._id })
      .populate('userId', 'firstName lastName')
      .populate('driverId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({ success: true, station, orders });
  } catch (error) {
    logger.error('Error fetching station details:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update station FICA status
router.patch('/stations/:stationId/fica', async (req, res) => {
  try {
    const { stationId } = req.params;
    const { ficaStatus, notes } = req.body;

    if (!['pending', 'approved', 'rejected'].includes(ficaStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid FICA status' });
    }

    const station = await Station.findById(stationId);
    if (!station) {
      return res.status(404).json({ success: false, message: 'Station not found' });
    }

    station.ficaStatus = ficaStatus;
    if (notes) {
      station.ficaNotes = notes;
    }
    await station.save();

    res.json({ success: true, station });
  } catch (error) {
    logger.error('Error updating station FICA status:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get all orders
router.get('/orders', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, dateFrom, dateTo } = req.query;

    const query = {};
    if (status) {
      query.status = status;
    }
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    const orders = await Order.find(query)
      .populate('userId', 'firstName lastName email')
      .populate('driverId', 'firstName lastName phone')
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
    logger.error('Error fetching orders:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get order details
router.get('/orders/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId)
      .populate('userId', 'firstName lastName email phone')
      .populate('driverId', 'firstName lastName phone vehicleDetails')
      .populate('stationId', 'stationName address phone');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.json({ success: true, order });
  } catch (error) {
    logger.error('Error fetching order details:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update order status (admin override)
router.patch('/orders/:orderId/status', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, reason } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    order.status = status;
    if (reason) {
      order.adminNotes = reason;
    }
    await order.save();

    res.json({ success: true, order });
  } catch (error) {
    logger.error('Error updating order status:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get system statistics
router.get('/stats', async (req, res) => {
  try {
    const { period = 'month' } = req.query;

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

    // Revenue statistics
    const revenueStats = await Order.aggregate([
      {
        $match: {
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
          platformCommission: { $sum: '$platformCommission' },
          deliveryFees: { $sum: '$deliveryFee' }
        }
      }
    ]);

    // User growth
    const newUsers = await User.countDocuments({ createdAt: { $gte: startDate } });
    const newDrivers = await Driver.countDocuments({ createdAt: { $gte: startDate } });
    const newStations = await Station.countDocuments({ createdAt: { $gte: startDate } });

    // Order statistics
    const orderStats = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const stats = {
      period,
      startDate,
      endDate: now,
      revenue: revenueStats[0] || {
        totalRevenue: 0,
        totalOrders: 0,
        averageOrderValue: 0,
        platformCommission: 0,
        deliveryFees: 0
      },
      growth: {
        newUsers,
        newDrivers,
        newStations
      },
      orders: orderStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {})
    };

    res.json({ success: true, stats });
  } catch (error) {
    logger.error('Error fetching system statistics:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get platform settings
router.get('/settings', async (req, res) => {
  try {
    // In a real implementation, you would fetch these from a settings collection
    const settings = {
      platformCommission: 0.10, // 10%
      minimumOrderValue: 50,
      deliveryFeeBase: 25,
      vatRate: 0.15, // 15%
      loadSheddingSurcharge: 10,
      areaSurcharges: {
        'Sandton': 15,
        'Rosebank': 10,
        'Pretoria': 5
      },
      driverSignOnFee: 500,
      driverReferralBonus: 100,
      maxDeliveryDistance: 50 // km
    };

    res.json({ success: true, settings });
  } catch (error) {
    logger.error('Error fetching platform settings:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update platform settings
router.put('/settings', async (req, res) => {
  try {
    const settings = req.body;

    // In a real implementation, you would save these to a settings collection
    logger.info('Updating platform settings:', settings);

    res.json({ success: true, message: 'Settings updated successfully' });
  } catch (error) {
    logger.error('Error updating platform settings:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
