const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('../models/User');
const Driver = require('../models/Driver');
const Station = require('../models/Station');
const Order = require('../models/Order');

// Sample data
const sampleUsers = [
  {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '+27821234567',
    password: 'password123',
    addresses: [
      {
        street: '123 Main Street',
        city: 'Johannesburg',
        province: 'Gauteng',
        postalCode: '2000',
        isDefault: true
      }
    ],
    wallet: {
      balance: 500.00,
      transactions: []
    }
  },
  {
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane@example.com',
    phone: '+27829876543',
    password: 'password123',
    addresses: [
      {
        street: '456 Oak Avenue',
        city: 'Sandton',
        province: 'Gauteng',
        postalCode: '2196',
        isDefault: true
      }
    ],
    wallet: {
      balance: 250.00,
      transactions: []
    }
  }
];

const sampleDrivers = [
  {
    firstName: 'Mike',
    lastName: 'Johnson',
    email: 'mike@wefuel.com',
    phone: '+27821111111',
    password: 'password123',
    licenseNumber: 'DL123456789',
    vehicleDetails: {
      make: 'Toyota',
      model: 'Hilux',
      year: '2020',
      color: 'White',
      licensePlate: 'ABC123GP'
    },
    status: 'online',
    serviceAreas: ['Johannesburg', 'Sandton', 'Rosebank'],
    ficaStatus: 'approved',
    totalEarnings: 0,
    completedOrders: 0
  },
  {
    firstName: 'Sarah',
    lastName: 'Wilson',
    email: 'sarah@wefuel.com',
    phone: '+27822222222',
    password: 'password123',
    licenseNumber: 'DL987654321',
    vehicleDetails: {
      make: 'Ford',
      model: 'Ranger',
      year: '2019',
      color: 'Blue',
      licensePlate: 'XYZ789GP'
    },
    status: 'offline',
    serviceAreas: ['Pretoria', 'Centurion'],
    ficaStatus: 'pending',
    totalEarnings: 0,
    completedOrders: 0
  }
];

const sampleStations = [
  {
    stationName: 'Shell Sandton',
    email: 'sandton@shell.com',
    phone: '+27112345678',
    password: 'password123',
    address: {
      street: '1 Sandton Drive',
      city: 'Sandton',
      province: 'Gauteng',
      postalCode: '2196'
    },
    businessDetails: {
      registrationNumber: '2020/123456/07',
      vatNumber: '123456789',
      businessType: 'Corporation'
    },
    fuelPrices: {
      petrol95: 25.50,
      petrol93: 25.00,
      diesel: 24.50
    },
    operatingHours: {
      monday: { open: '06:00', close: '22:00' },
      tuesday: { open: '06:00', close: '22:00' },
      wednesday: { open: '06:00', close: '22:00' },
      thursday: { open: '06:00', close: '22:00' },
      friday: { open: '06:00', close: '22:00' },
      saturday: { open: '07:00', close: '21:00' },
      sunday: { open: '08:00', close: '20:00' }
    },
    isOpen: true,
    isVerified: true,
    ficaStatus: 'approved',
    rating: 4.5,
    totalOrders: 0,
    totalRevenue: 0
  },
  {
    stationName: 'Caltex Rosebank',
    email: 'rosebank@caltex.com',
    phone: '+27119876543',
    password: 'password123',
    address: {
      street: '15 Oxford Road',
      city: 'Rosebank',
      province: 'Gauteng',
      postalCode: '2196'
    },
    businessDetails: {
      registrationNumber: '2020/654321/07',
      vatNumber: '987654321',
      businessType: 'Corporation'
    },
    fuelPrices: {
      petrol95: 25.75,
      petrol93: 25.25,
      diesel: 24.75
    },
    operatingHours: {
      monday: { open: '06:00', close: '23:00' },
      tuesday: { open: '06:00', close: '23:00' },
      wednesday: { open: '06:00', close: '23:00' },
      thursday: { open: '06:00', close: '23:00' },
      friday: { open: '06:00', close: '23:00' },
      saturday: { open: '07:00', close: '22:00' },
      sunday: { open: '08:00', close: '21:00' }
    },
    isOpen: true,
    isVerified: true,
    ficaStatus: 'approved',
    rating: 4.2,
    totalOrders: 0,
    totalRevenue: 0
  }
];

const sampleOrders = [
  {
    userId: null, // Will be set after user creation
    stationId: null, // Will be set after station creation
    fuelType: 'petrol95',
    quantity: 50,
    deliveryAddress: {
      street: '123 Main Street',
      city: 'Johannesburg',
      province: 'Gauteng',
      postalCode: '2000'
    },
    status: 'pending',
    paymentStatus: 'pending',
    fuelTotal: 1275.00,
    deliveryFee: 25.00,
    vat: 195.00,
    platformCommission: 127.50,
    total: 1622.50,
    estimatedDeliveryTime: 45
  },
  {
    userId: null, // Will be set after user creation
    stationId: null, // Will be set after station creation
    fuelType: 'diesel',
    quantity: 75,
    deliveryAddress: {
      street: '456 Oak Avenue',
      city: 'Sandton',
      province: 'Gauteng',
      postalCode: '2196'
    },
    status: 'confirmed',
    paymentStatus: 'paid',
    fuelTotal: 1837.50,
    deliveryFee: 30.00,
    vat: 280.13,
    platformCommission: 183.75,
    total: 2331.38,
    estimatedDeliveryTime: 60,
    paidAt: new Date()
  }
];

async function setupDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/wefuel', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Driver.deleteMany({});
    await Station.deleteMany({});
    await Order.deleteMany({});
    console.log('Cleared existing data');

    // Create indexes
    await User.collection.createIndex({ email: 1 }, { unique: true });
    await User.collection.createIndex({ phone: 1 });
    await Driver.collection.createIndex({ email: 1 }, { unique: true });
    await Driver.collection.createIndex({ licenseNumber: 1 }, { unique: true });
    await Station.collection.createIndex({ email: 1 }, { unique: true });
    await Order.collection.createIndex({ userId: 1 });
    await Order.collection.createIndex({ stationId: 1 });
    await Order.collection.createIndex({ driverId: 1 });
    await Order.collection.createIndex({ status: 1 });
    await Order.collection.createIndex({ createdAt: -1 });
    console.log('Created indexes');

    // Hash passwords and create users
    const createdUsers = [];
    for (const userData of sampleUsers) {
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      const user = new User({
        ...userData,
        password: hashedPassword
      });
      await user.save();
      createdUsers.push(user);
      console.log(`Created user: ${user.email}`);
    }

    // Hash passwords and create drivers
    const createdDrivers = [];
    for (const driverData of sampleDrivers) {
      const hashedPassword = await bcrypt.hash(driverData.password, 12);
      const driver = new Driver({
        ...driverData,
        password: hashedPassword
      });
      await driver.save();
      createdDrivers.push(driver);
      console.log(`Created driver: ${driver.email}`);
    }

    // Hash passwords and create stations
    const createdStations = [];
    for (const stationData of sampleStations) {
      const hashedPassword = await bcrypt.hash(stationData.password, 12);
      const station = new Station({
        ...stationData,
        password: hashedPassword
      });
      await station.save();
      createdStations.push(station);
      console.log(`Created station: ${station.stationName}`);
    }

    // Create sample orders
    if (createdUsers.length > 0 && createdStations.length > 0) {
      const order1 = new Order({
        ...sampleOrders[0],
        userId: createdUsers[0]._id,
        stationId: createdStations[0]._id
      });
      await order1.save();
      console.log(`Created order: ${order1._id}`);

      const order2 = new Order({
        ...sampleOrders[1],
        userId: createdUsers[1]._id,
        stationId: createdStations[1]._id
      });
      await order2.save();
      console.log(`Created order: ${order2._id}`);
    }

    console.log('\nDatabase setup completed successfully!');
    console.log('\nSample data created:');
    console.log(`- ${createdUsers.length} users`);
    console.log(`- ${createdDrivers.length} drivers`);
    console.log(`- ${createdStations.length} stations`);
    console.log('- 2 sample orders');
    console.log('\nYou can now start the application and test with these accounts.');

  } catch (error) {
    console.error('Error setting up database:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the setup if this file is executed directly
if (require.main === module) {
  setupDatabase();
}

module.exports = { setupDatabase };
