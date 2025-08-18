const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Driver = require('../models/Driver');
const Station = require('../models/Station');
const { logger } = require('../utils/logger');

const router = express.Router();

// Generate JWT token
const generateToken = (userId, userType) => {
  return jwt.sign(
    { userId, userType },
    process.env.JWT_SECRET || 'wefuel-secret-key',
    { expiresIn: '7d' }
  );
};

// Validation middleware
const validateSignup = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('fullName').trim().isLength({ min: 2 }),
  body('phoneNumber').matches(/^(\+27|0)[6-8][0-9]{8}$/).withMessage('Invalid South African phone number')
];

const validateLogin = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
];

// User Signup
router.post('/user/signup', validateSignup, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, fullName, phoneNumber } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { phoneNumber }]
    });

    if (existingUser) {
      return res.status(400).json({
        error: 'User with this email or phone number already exists'
      });
    }

    // Create new user
    const user = new User({
      email,
      password,
      fullName,
      phoneNumber
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id, 'user');

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: user.getPublicProfile()
    });

  } catch (error) {
    logger.error('User signup error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// User Login
router.post('/user/login', validateLogin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id, 'user');

    res.json({
      message: 'Login successful',
      token,
      user: user.getPublicProfile()
    });

  } catch (error) {
    logger.error('User login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Driver Signup
router.post('/driver/signup', [
  ...validateSignup,
  body('driverLicense.number').notEmpty(),
  body('driverLicense.expiryDate').isISO8601(),
  body('vehicle.make').notEmpty(),
  body('vehicle.model').notEmpty(),
  body('vehicle.licensePlate').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      email,
      password,
      fullName,
      phoneNumber,
      driverLicense,
      vehicle
    } = req.body;

    // Check if driver already exists
    const existingDriver = await Driver.findOne({
      $or: [{ email }, { phoneNumber }, { 'driverLicense.number': driverLicense.number }]
    });

    if (existingDriver) {
      return res.status(400).json({
        error: 'Driver with this email, phone number, or license already exists'
      });
    }

    // Create new driver
    const driver = new Driver({
      email,
      password,
      fullName,
      phoneNumber,
      driverLicense,
      vehicle
    });

    await driver.save();

    // Generate token
    const token = generateToken(driver._id, 'driver');

    res.status(201).json({
      message: 'Driver registered successfully',
      token,
      driver: driver.getPublicProfile()
    });

  } catch (error) {
    logger.error('Driver signup error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Driver Login
router.post('/driver/login', validateLogin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find driver
    const driver = await Driver.findOne({ email });
    if (!driver) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isPasswordValid = await driver.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if driver is active
    if (!driver.isActive) {
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    // Check if training is completed
    if (!driver.training.completed) {
      return res.status(401).json({ 
        error: 'Training not completed',
        requiresTraining: true
      });
    }

    // Update last login
    driver.lastLogin = new Date();
    await driver.save();

    // Generate token
    const token = generateToken(driver._id, 'driver');

    res.json({
      message: 'Login successful',
      token,
      driver: driver.getPublicProfile()
    });

  } catch (error) {
    logger.error('Driver login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Station Signup
router.post('/station/signup', [
  ...validateSignup,
  body('stationName').notEmpty(),
  body('businessRegistration.number').notEmpty(),
  body('vatNumber').notEmpty(),
  body('address.street').notEmpty(),
  body('address.city').notEmpty(),
  body('fuelInventory.petrol.price').isNumeric(),
  body('fuelInventory.diesel.price').isNumeric()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      email,
      password,
      fullName,
      phoneNumber,
      stationName,
      businessRegistration,
      vatNumber,
      address,
      fuelInventory
    } = req.body;

    // Check if station already exists
    const existingStation = await Station.findOne({
      $or: [
        { email },
        { phoneNumber },
        { 'businessRegistration.number': businessRegistration.number },
        { vatNumber }
      ]
    });

    if (existingStation) {
      return res.status(400).json({
        error: 'Station with this email, phone number, business registration, or VAT number already exists'
      });
    }

    // Create new station
    const station = new Station({
      email,
      password,
      fullName,
      phoneNumber,
      stationName,
      businessRegistration,
      vatNumber,
      address,
      fuelInventory
    });

    await station.save();

    // Generate token
    const token = generateToken(station._id, 'station');

    res.status(201).json({
      message: 'Station registered successfully',
      token,
      station: station.getPublicProfile()
    });

  } catch (error) {
    logger.error('Station signup error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Station Login
router.post('/station/login', validateLogin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find station
    const station = await Station.findOne({ email });
    if (!station) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isPasswordValid = await station.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if station is active
    if (!station.isActive) {
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    // Update last login
    station.lastLogin = new Date();
    await station.save();

    // Generate token
    const token = generateToken(station._id, 'station');

    res.json({
      message: 'Login successful',
      token,
      station: station.getPublicProfile()
    });

  } catch (error) {
    logger.error('Station login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Verify token middleware
const verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'wefuel-secret-key');
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token.' });
  }
};

// Get current user
router.get('/me', verifyToken, async (req, res) => {
  try {
    const { userId, userType } = req.user;
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
        return res.status(400).json({ error: 'Invalid user type' });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: user.getPublicProfile(),
      userType
    });

  } catch (error) {
    logger.error('Get current user error:', error);
    res.status(500).json({ error: 'Failed to get user information' });
  }
});

// Logout (client-side token removal)
router.post('/logout', verifyToken, (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
