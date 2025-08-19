const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Driver = require('../models/Driver');
const Station = require('../models/Station');
const logger = require('../utils/logger');

const router = express.Router();

// Validation middleware
const validateRegistration = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('firstName').trim().notEmpty(),
  body('lastName').trim().notEmpty(),
  body('phone').trim().notEmpty(),
];

const validateLogin = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
];

// Generate JWT token
const generateToken = (userId, userType) => {
  return jwt.sign(
    { userId, userType },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// User Registration
router.post('/user/register', validateRegistration, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { email, password, firstName, lastName, phone, address } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Create new user
    const user = new User({
      email,
      password,
      firstName,
      lastName,
      phone,
      addresses: address ? [address] : [],
      ficaStatus: 'pending',
      wallet: { balance: 0, transactions: [] }
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id, 'user');

    logger.info(`New user registered: ${email}`);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: user.getPublicProfile(),
      token
    });

  } catch (error) {
    logger.error('User registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Driver Registration
router.post('/driver/register', validateRegistration, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { 
      email, 
      password, 
      firstName, 
      lastName, 
      phone, 
      licenseNumber,
      vehicleDetails,
      ficaDocuments 
    } = req.body;

    // Check if driver already exists
    const existingDriver = await Driver.findOne({ email });
    if (existingDriver) {
      return res.status(400).json({
        success: false,
        message: 'Driver already exists with this email'
      });
    }

    // Create new driver
    const driver = new Driver({
      email,
      password,
      firstName,
      lastName,
      phone,
      licenseNumber,
      vehicleDetails,
      ficaDocuments,
      ficaStatus: 'pending',
      trainingStatus: 'pending',
      earnings: { total: 0, today: 0, history: [] }
    });

    await driver.save();

    // Generate token
    const token = generateToken(driver._id, 'driver');

    logger.info(`New driver registered: ${email}`);

    res.status(201).json({
      success: true,
      message: 'Driver registered successfully',
      user: driver.getPublicProfile(),
      token
    });

  } catch (error) {
    logger.error('Driver registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Station Registration
router.post('/station/register', validateRegistration, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { 
      email, 
      password, 
      stationName, 
      phone, 
      address,
      businessDetails,
      ficaDocuments 
    } = req.body;

    // Check if station already exists
    const existingStation = await Station.findOne({ email });
    if (existingStation) {
      return res.status(400).json({
        success: false,
        message: 'Station already exists with this email'
      });
    }

    // Create new station
    const station = new Station({
      email,
      password,
      stationName,
      phone,
      address,
      businessDetails,
      ficaDocuments,
      ficaStatus: 'pending',
      earnings: { total: 0, today: 0, history: [] },
      fuelInventory: {
        petrol95: 0,
        petrol93: 0,
        diesel: 0
      }
    });

    await station.save();

    // Generate token
    const token = generateToken(station._id, 'station');

    logger.info(`New station registered: ${email}`);

    res.status(201).json({
      success: true,
      message: 'Station registered successfully',
      user: station.getPublicProfile(),
      token
    });

  } catch (error) {
    logger.error('Station registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// User Login
router.post('/user/login', validateLogin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Generate token
    const token = generateToken(user._id, 'user');

    logger.info(`User logged in: ${email}`);

    res.json({
      success: true,
      message: 'Login successful',
      user: user.getPublicProfile(),
      token
    });

  } catch (error) {
    logger.error('User login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Driver Login
router.post('/driver/login', validateLogin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { email, password } = req.body;

    // Find driver
    const driver = await Driver.findOne({ email });
    if (!driver) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isPasswordValid = await driver.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if account is active
    if (!driver.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Check FICA status
    if (driver.ficaStatus !== 'approved') {
      return res.status(401).json({
        success: false,
        message: 'FICA verification pending'
      });
    }

    // Generate token
    const token = generateToken(driver._id, 'driver');

    logger.info(`Driver logged in: ${email}`);

    res.json({
      success: true,
      message: 'Login successful',
      user: driver.getPublicProfile(),
      token
    });

  } catch (error) {
    logger.error('Driver login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Station Login
router.post('/station/login', validateLogin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { email, password } = req.body;

    // Find station
    const station = await Station.findOne({ email });
    if (!station) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isPasswordValid = await station.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if account is active
    if (!station.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Check FICA status
    if (station.ficaStatus !== 'approved') {
      return res.status(401).json({
        success: false,
        message: 'FICA verification pending'
      });
    }

    // Generate token
    const token = generateToken(station._id, 'station');

    logger.info(`Station logged in: ${email}`);

    res.json({
      success: true,
      message: 'Login successful',
      user: station.getPublicProfile(),
      token
    });

  } catch (error) {
    logger.error('Station login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { userId, userType } = decoded;

    let user;
    switch (userType) {
      case 'user':
        user = await User.findById(userId);
        break;
      case 'driver':
        user = await Driver.findById(userId);
        break;
      case 'station':
        user = await Station.findById(userId);
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

    res.json({
      success: true,
      user: user.getPublicProfile(),
      userType
    });

  } catch (error) {
    logger.error('Get current user error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
});

// Forgot Password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email, userType } = req.body;

    let user;
    switch (userType) {
      case 'user':
        user = await User.findOne({ email });
        break;
      case 'driver':
        user = await Driver.findOne({ email });
        break;
      case 'station':
        user = await Station.findOne({ email });
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid user type'
        });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { userId: user._id, userType },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // TODO: Send email with reset link
    // For now, just return the token
    res.json({
      success: true,
      message: 'Password reset link sent to email',
      resetToken
    });

  } catch (error) {
    logger.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Reset Password
router.post('/reset-password', async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;

    const decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    const { userId, userType } = decoded;

    let user;
    switch (userType) {
      case 'user':
        user = await User.findById(userId);
        break;
      case 'driver':
        user = await Driver.findById(userId);
        break;
      case 'station':
        user = await Station.findById(userId);
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid user type'
        });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successfully'
    });

  } catch (error) {
    logger.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
