const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Driver = require('../models/Driver');
const Station = require('../models/Station');
const Order = require('../models/Order');
const logger = require('../utils/logger');

// Store connected users
const connectedUsers = new Map();
const connectedDrivers = new Map();
const connectedStations = new Map();

// Verify socket authentication
const verifySocketAuth = (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    socket.userType = decoded.userType;
    next();
  } catch (error) {
    logger.error('Socket authentication error:', error);
    next(new Error('Authentication error: Invalid token'));
  }
};

// Setup socket handlers
const setupSocketHandlers = (io) => {
  // Apply authentication middleware
  io.use(verifySocketAuth);

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.userType} - ${socket.userId}`);

    // Store connected user
    const userData = {
      socketId: socket.id,
      userId: socket.userId,
      userType: socket.userType,
      connectedAt: new Date()
    };

    switch (socket.userType) {
      case 'user':
        connectedUsers.set(socket.userId, userData);
        break;
      case 'driver':
        connectedDrivers.set(socket.userId, userData);
        // Join driver room
        socket.join('drivers');
        break;
      case 'station':
        connectedStations.set(socket.userId, userData);
        // Join station room
        socket.join('stations');
        break;
    }

    // Handle user-specific events
    if (socket.userType === 'user') {
      setupUserHandlers(socket, io);
    } else if (socket.userType === 'driver') {
      setupDriverHandlers(socket, io);
    } else if (socket.userType === 'station') {
      setupStationHandlers(socket, io);
    }

    // Handle disconnection
    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.userType} - ${socket.userId}`);
      
      // Remove from connected users
      switch (socket.userType) {
        case 'user':
          connectedUsers.delete(socket.userId);
          break;
        case 'driver':
          connectedDrivers.delete(socket.userId);
          break;
        case 'station':
          connectedStations.delete(socket.userId);
          break;
      }
    });

    // Handle errors
    socket.on('error', (error) => {
      logger.error('Socket error:', error);
    });
  });
};

// User-specific handlers
const setupUserHandlers = (socket, io) => {
  // Join user's personal room
  socket.join(`user_${socket.userId}`);

  // Handle order tracking request
  socket.on('track_order', async (data) => {
    try {
      const { orderId } = data;
      
      const order = await Order.findOne({
        _id: orderId,
        customer: socket.userId
      }).populate('driver', 'firstName lastName phone vehicleDetails');

      if (!order) {
        socket.emit('track_order_error', { message: 'Order not found' });
        return;
      }

      // Join order tracking room
      socket.join(`order_${orderId}`);
      
      // Send current order status
      socket.emit('order_status', {
        orderId,
        status: order.status,
        driver: order.driver,
        estimatedDelivery: order.estimatedDelivery,
        driverLocation: order.driverLocation
      });

    } catch (error) {
      logger.error('Track order error:', error);
      socket.emit('track_order_error', { message: 'Failed to track order' });
    }
  });

  // Handle stop tracking
  socket.on('stop_tracking', (data) => {
    const { orderId } = data;
    socket.leave(`order_${orderId}`);
  });

  // Handle payment confirmation
  socket.on('payment_confirmed', async (data) => {
    try {
      const { orderId, paymentDetails } = data;
      
      const order = await Order.findOne({
        _id: orderId,
        customer: socket.userId
      });

      if (!order) {
        socket.emit('payment_error', { message: 'Order not found' });
        return;
      }

      // Update order payment status
      order.payment.status = 'paid';
      order.payment.details = paymentDetails;
      order.payment.paidAt = new Date();
      await order.save();

      // Notify station about payment
      const stationSocket = connectedStations.get(order.station.toString());
      if (stationSocket) {
        io.to(stationSocket.socketId).emit('payment_received', {
          orderId,
          amount: order.total,
          customer: socket.userId
        });
      }

      socket.emit('payment_success', { orderId });

    } catch (error) {
      logger.error('Payment confirmation error:', error);
      socket.emit('payment_error', { message: 'Payment confirmation failed' });
    }
  });
};

// Driver-specific handlers
const setupDriverHandlers = (socket, io) => {
  // Join driver's personal room
  socket.join(`driver_${socket.userId}`);

  // Handle driver going online/offline
  socket.on('driver_status', async (data) => {
    try {
      const { status, location } = data;
      
      const driver = await Driver.findById(socket.userId);
      if (!driver) {
        socket.emit('status_error', { message: 'Driver not found' });
        return;
      }

      driver.isOnline = status === 'online';
      if (location) {
        driver.currentLocation = {
          latitude: location.latitude,
          longitude: location.longitude,
          timestamp: new Date()
        };
      }
      await driver.save();

      // Notify stations about driver availability
      if (status === 'online') {
        io.to('stations').emit('driver_available', {
          driverId: socket.userId,
          location: driver.currentLocation,
          rating: driver.rating,
          vehicleDetails: driver.vehicleDetails
        });
      } else {
        io.to('stations').emit('driver_unavailable', {
          driverId: socket.userId
        });
      }

      socket.emit('status_updated', { status });

    } catch (error) {
      logger.error('Driver status update error:', error);
      socket.emit('status_error', { message: 'Failed to update status' });
    }
  });

  // Handle location updates
  socket.on('location_update', async (data) => {
    try {
      const { latitude, longitude, orderId } = data;
      
      const driver = await Driver.findById(socket.userId);
      if (!driver) {
        return;
      }

      // Update driver location
      driver.currentLocation = {
        latitude,
        longitude,
        timestamp: new Date()
      };
      await driver.save();

      // If updating location for a specific order, update order and notify customer
      if (orderId) {
        const order = await Order.findOne({
          _id: orderId,
          driver: socket.userId
        });

        if (order) {
          order.driverLocation = {
            latitude,
            longitude,
            timestamp: new Date()
          };
          await order.save();

          // Notify customer about driver location
          const customerSocket = connectedUsers.get(order.customer.toString());
          if (customerSocket) {
            io.to(customerSocket.socketId).emit('driver_location_update', {
              orderId,
              location: { latitude, longitude },
              driver: {
                firstName: driver.firstName,
                lastName: driver.lastName,
                phone: driver.phone
              }
            });
          }
        }
      }

    } catch (error) {
      logger.error('Location update error:', error);
    }
  });

  // Handle order acceptance
  socket.on('accept_order', async (data) => {
    try {
      const { orderId } = data;
      
      const order = await Order.findOne({
        _id: orderId,
        status: 'ready',
        driver: { $exists: false }
      });

      if (!order) {
        socket.emit('accept_order_error', { message: 'Order not available' });
        return;
      }

      const driver = await Driver.findById(socket.userId);
      if (!driver || !driver.isOnline) {
        socket.emit('accept_order_error', { message: 'Driver not available' });
        return;
      }

      // Assign driver to order
      order.driver = socket.userId;
      order.status = 'assigned';
      order.statusHistory.push({
        status: 'assigned',
        timestamp: new Date(),
        note: `Accepted by driver ${driver.firstName} ${driver.lastName}`,
        updatedBy: 'driver'
      });
      await order.save();

      // Join order room
      socket.join(`order_${orderId}`);

      // Notify customer
      const customerSocket = connectedUsers.get(order.customer.toString());
      if (customerSocket) {
        io.to(customerSocket.socketId).emit('order_assigned', {
          orderId,
          driver: {
            firstName: driver.firstName,
            lastName: driver.lastName,
            phone: driver.phone,
            vehicleDetails: driver.vehicleDetails
          }
        });
      }

      // Notify station
      const stationSocket = connectedStations.get(order.station.toString());
      if (stationSocket) {
        io.to(stationSocket.socketId).emit('order_assigned', {
          orderId,
          driver: {
            firstName: driver.firstName,
            lastName: driver.lastName,
            phone: driver.phone
          }
        });
      }

      socket.emit('order_accepted', { orderId });

    } catch (error) {
      logger.error('Accept order error:', error);
      socket.emit('accept_order_error', { message: 'Failed to accept order' });
    }
  });

  // Handle order status updates
  socket.on('update_order_status', async (data) => {
    try {
      const { orderId, status, note } = data;
      
      const order = await Order.findOne({
        _id: orderId,
        driver: socket.userId
      });

      if (!order) {
        socket.emit('status_update_error', { message: 'Order not found' });
        return;
      }

      // Update order status
      order.status = status;
      order.statusHistory.push({
        status,
        timestamp: new Date(),
        note: note || `Status updated to ${status}`,
        updatedBy: 'driver'
      });

      if (status === 'delivered') {
        order.deliveredAt = new Date();
      }

      await order.save();

      // Notify customer
      const customerSocket = connectedUsers.get(order.customer.toString());
      if (customerSocket) {
        io.to(customerSocket.socketId).emit('order_status_update', {
          orderId,
          status,
          note,
          timestamp: new Date()
        });
      }

      // Notify station
      const stationSocket = connectedStations.get(order.station.toString());
      if (stationSocket) {
        io.to(stationSocket.socketId).emit('order_status_update', {
          orderId,
          status,
          note,
          timestamp: new Date()
        });
      }

      socket.emit('status_updated', { orderId, status });

    } catch (error) {
      logger.error('Update order status error:', error);
      socket.emit('status_update_error', { message: 'Failed to update status' });
    }
  });
};

// Station-specific handlers
const setupStationHandlers = (socket, io) => {
  // Join station's personal room
  socket.join(`station_${socket.userId}`);

  // Handle station status updates
  socket.on('station_status', async (data) => {
    try {
      const { status } = data;
      
      const station = await Station.findById(socket.userId);
      if (!station) {
        socket.emit('status_error', { message: 'Station not found' });
        return;
      }

      station.isOpen = status === 'open';
      await station.save();

      // Notify drivers about station status
      io.to('drivers').emit('station_status_update', {
        stationId: socket.userId,
        status,
        stationName: station.stationName
      });

      socket.emit('status_updated', { status });

    } catch (error) {
      logger.error('Station status update error:', error);
      socket.emit('status_error', { message: 'Failed to update status' });
    }
  });

  // Handle order status updates
  socket.on('update_order_status', async (data) => {
    try {
      const { orderId, status, note } = data;
      
      const order = await Order.findOne({
        _id: orderId,
        station: socket.userId
      });

      if (!order) {
        socket.emit('status_update_error', { message: 'Order not found' });
        return;
      }

      // Update order status
      order.status = status;
      order.statusHistory.push({
        status,
        timestamp: new Date(),
        note: note || `Status updated to ${status}`,
        updatedBy: 'station'
      });

      await order.save();

      // Notify customer
      const customerSocket = connectedUsers.get(order.customer.toString());
      if (customerSocket) {
        io.to(customerSocket.socketId).emit('order_status_update', {
          orderId,
          status,
          note,
          timestamp: new Date()
        });
      }

      // Notify driver if assigned
      if (order.driver) {
        const driverSocket = connectedDrivers.get(order.driver.toString());
        if (driverSocket) {
          io.to(driverSocket.socketId).emit('order_status_update', {
            orderId,
            status,
            note,
            timestamp: new Date()
          });
        }
      }

      socket.emit('status_updated', { orderId, status });

    } catch (error) {
      logger.error('Update order status error:', error);
      socket.emit('status_update_error', { message: 'Failed to update status' });
    }
  });

  // Handle new order notification
  socket.on('new_order', async (data) => {
    try {
      const { orderId } = data;
      
      const order = await Order.findOne({
        _id: orderId,
        station: socket.userId
      }).populate('customer', 'firstName lastName phone');

      if (!order) {
        return;
      }

      // Notify available drivers
      io.to('drivers').emit('new_order_available', {
        orderId,
        fuelType: order.fuelType,
        quantity: order.quantity,
        deliveryAddress: order.deliveryAddress,
        total: order.total,
        station: {
          id: socket.userId,
          name: order.station.stationName,
          address: order.station.address
        }
      });

    } catch (error) {
      logger.error('New order notification error:', error);
    }
  });
};

// Utility functions for external use
const notifyUser = (userId, event, data) => {
  const userSocket = connectedUsers.get(userId.toString());
  if (userSocket) {
    global.io.to(userSocket.socketId).emit(event, data);
  }
};

const notifyDriver = (driverId, event, data) => {
  const driverSocket = connectedDrivers.get(driverId.toString());
  if (driverSocket) {
    global.io.to(driverSocket.socketId).emit(event, data);
  }
};

const notifyStation = (stationId, event, data) => {
  const stationSocket = connectedStations.get(stationId.toString());
  if (stationSocket) {
    global.io.to(stationSocket.socketId).emit(event, data);
  }
};

const broadcastToDrivers = (event, data) => {
  global.io.to('drivers').emit(event, data);
};

const broadcastToStations = (event, data) => {
  global.io.to('stations').emit(event, data);
};

module.exports = {
  setupSocketHandlers,
  notifyUser,
  notifyDriver,
  notifyStation,
  broadcastToDrivers,
  broadcastToStations,
  connectedUsers,
  connectedDrivers,
  connectedStations
};
