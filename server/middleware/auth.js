const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Driver = require('../models/Driver');
const Station = require('../models/Station');
const logger = require('../utils/logger');

// Verify JWT token middleware
const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access token required' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user based on user type
    let user;
    switch (decoded.userType) {
      case 'user':
        user = await User.findById(decoded.id).select('-password');
        break;
      case 'driver':
        user = await Driver.findById(decoded.id).select('-password');
        break;
      case 'station':
        user = await Station.findById(decoded.id).select('-password');
        break;
      default:
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid user type' 
        });
    }

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Check if user is active
    if (user.status && user.status !== 'active') {
      return res.status(401).json({ 
        success: false, 
        message: 'Account is not active' 
      });
    }

    req.user = user;
    req.userType = decoded.userType;
    next();

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token' 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expired' 
      });
    }

    logger.error('Error verifying token:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Token verification failed' 
    });
  }
};

// Verify admin role middleware
const verifyAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    // Check if user has admin role
    if (!req.user.role || req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Admin access required' 
      });
    }

    next();

  } catch (error) {
    logger.error('Error verifying admin role:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Admin verification failed' 
    });
  }
};

// Verify specific user type middleware
const verifyUserType = (allowedTypes) => {
  return (req, res, next) => {
    try {
      if (!req.userType) {
        return res.status(401).json({ 
          success: false, 
          message: 'Authentication required' 
        });
      }

      if (!allowedTypes.includes(req.userType)) {
        return res.status(403).json({ 
          success: false, 
          message: `Access restricted to: ${allowedTypes.join(', ')}` 
        });
      }

      next();

    } catch (error) {
      logger.error('Error verifying user type:', error);
      res.status(500).json({ 
        success: false, 
        message: 'User type verification failed' 
      });
    }
  };
};

// Verify user middleware (only for regular users)
const verifyUser = verifyUserType(['user']);

// Verify driver middleware (only for drivers)
const verifyDriver = verifyUserType(['driver']);

// Verify station middleware (only for stations)
const verifyStation = verifyUserType(['station']);

// Optional token verification (doesn't fail if no token provided)
const optionalToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return next(); // Continue without user info
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user based on user type
    let user;
    switch (decoded.userType) {
      case 'user':
        user = await User.findById(decoded.id).select('-password');
        break;
      case 'driver':
        user = await Driver.findById(decoded.id).select('-password');
        break;
      case 'station':
        user = await Station.findById(decoded.id).select('-password');
        break;
      default:
        return next(); // Continue without user info
    }

    if (user && (!user.status || user.status === 'active')) {
      req.user = user;
      req.userType = decoded.userType;
    }

    next();

  } catch (error) {
    // Log error but don't fail the request
    logger.warn('Optional token verification failed:', error.message);
    next();
  }
};

// Rate limiting middleware (basic implementation)
const rateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const requests = new Map();

  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old entries
    if (requests.has(key)) {
      const userRequests = requests.get(key).filter(time => time > windowStart);
      requests.set(key, userRequests);
    } else {
      requests.set(key, []);
    }

    const userRequests = requests.get(key);

    if (userRequests.length >= maxRequests) {
      return res.status(429).json({ 
        success: false, 
        message: 'Too many requests, please try again later' 
      });
    }

    userRequests.push(now);
    next();
  };
};

// CORS middleware
const cors = (req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', true);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  next();
};

// Request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });

  next();
};

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  logger.error('Unhandled error:', err);

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: Object.values(err.errors).map(e => e.message)
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format'
    });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`
    });
  }

  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message
  });
};

module.exports = {
  verifyToken,
  verifyAdmin,
  verifyUserType,
  verifyUser,
  verifyDriver,
  verifyStation,
  optionalToken,
  rateLimit,
  cors,
  requestLogger,
  errorHandler
};
