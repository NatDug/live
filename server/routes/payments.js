const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');
const logger = require('../utils/logger');

// Process payment
router.post('/process', verifyToken, async (req, res) => {
  try {
    const { 
      orderId, 
      amount, 
      paymentMethod, 
      paymentProvider, 
      transactionId,
      cardDetails 
    } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.userId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Order cannot be paid' });
    }

    if (Math.abs(order.total - amount) > 0.01) {
      return res.status(400).json({ success: false, message: 'Amount mismatch' });
    }

    let paymentResult;

    switch (paymentMethod) {
      case 'wallet':
        paymentResult = await processWalletPayment(order, req.user.id);
        break;
      case 'card':
        paymentResult = await processCardPayment(order, paymentProvider, transactionId, cardDetails);
        break;
      case 'eft':
        paymentResult = await processEFTPayment(order, paymentProvider, transactionId);
        break;
      default:
        return res.status(400).json({ success: false, message: 'Invalid payment method' });
    }

    if (!paymentResult.success) {
      return res.status(400).json(paymentResult);
    }

    // Update order status
    order.status = 'confirmed';
    order.paymentStatus = 'paid';
    order.paymentMethod = paymentMethod;
    order.paymentProvider = paymentProvider;
    order.transactionId = transactionId;
    order.paidAt = new Date();
    await order.save();

    res.json({ 
      success: true, 
      message: 'Payment processed successfully',
      order: order
    });

  } catch (error) {
    logger.error('Error processing payment:', error);
    res.status(500).json({ success: false, message: 'Payment processing failed' });
  }
});

// Process wallet payment
async function processWalletPayment(order, userId) {
  try {
    const user = await User.findById(userId);
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    if (!user.wallet || user.wallet.balance < order.total) {
      return { success: false, message: 'Insufficient wallet balance' };
    }

    // Deduct from wallet
    user.wallet.balance -= order.total;
    user.wallet.transactions.push({
      type: 'debit',
      amount: order.total,
      description: `Payment for order #${order._id}`,
      orderId: order._id,
      timestamp: new Date()
    });

    await user.save();

    return { success: true };
  } catch (error) {
    logger.error('Error processing wallet payment:', error);
    return { success: false, message: 'Wallet payment failed' };
  }
}

// Process card payment
async function processCardPayment(order, provider, transactionId, cardDetails) {
  try {
    // In a real implementation, you would verify the payment with the provider
    // For now, we'll simulate a successful payment
    
    if (!transactionId) {
      return { success: false, message: 'Transaction ID required' };
    }

    // Verify payment with provider (Yoco, etc.)
    const paymentVerification = await verifyPaymentWithProvider(provider, transactionId, order.total);
    
    if (!paymentVerification.success) {
      return { success: false, message: 'Payment verification failed' };
    }

    return { success: true };
  } catch (error) {
    logger.error('Error processing card payment:', error);
    return { success: false, message: 'Card payment failed' };
  }
}

// Process EFT payment
async function processEFTPayment(order, provider, transactionId) {
  try {
    // In a real implementation, you would verify the EFT payment with the provider
    // For now, we'll simulate a successful payment
    
    if (!transactionId) {
      return { success: false, message: 'Transaction ID required' };
    }

    // Verify EFT payment with provider (Ozow, etc.)
    const paymentVerification = await verifyEFTPaymentWithProvider(provider, transactionId, order.total);
    
    if (!paymentVerification.success) {
      return { success: false, message: 'EFT payment verification failed' };
    }

    return { success: true };
  } catch (error) {
    logger.error('Error processing EFT payment:', error);
    return { success: false, message: 'EFT payment failed' };
  }
}

// Verify payment with provider (placeholder)
async function verifyPaymentWithProvider(provider, transactionId, amount) {
  // In a real implementation, you would make an API call to verify the payment
  // For now, we'll return a successful verification
  
  logger.info(`Verifying payment with ${provider} for transaction ${transactionId}`);
  
  return { success: true };
}

// Verify EFT payment with provider (placeholder)
async function verifyEFTPaymentWithProvider(provider, transactionId, amount) {
  // In a real implementation, you would make an API call to verify the EFT payment
  // For now, we'll return a successful verification
  
  logger.info(`Verifying EFT payment with ${provider} for transaction ${transactionId}`);
  
  return { success: true };
}

// Initialize Ozow payment
router.post('/ozow/initiate', verifyToken, async (req, res) => {
  try {
    const { 
      orderId, 
      amount, 
      returnUrl, 
      cancelUrl 
    } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.userId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // In a real implementation, you would make an API call to Ozow to initiate payment
    // For now, we'll simulate the payment initiation
    
    const paymentUrl = await initiateOzowPayment({
      amount: Math.round(amount * 100), // Convert to cents
      reference: order._id.toString(),
      returnUrl,
      cancelUrl,
      customer: {
        name: `${order.userId.firstName} ${order.userId.lastName}`,
        email: order.userId.email
      }
    });

    res.json({ 
      success: true, 
      paymentUrl,
      reference: order._id.toString()
    });

  } catch (error) {
    logger.error('Error initiating Ozow payment:', error);
    res.status(500).json({ success: false, message: 'Failed to initiate payment' });
  }
});

// Initiate Ozow payment (placeholder)
async function initiateOzowPayment(paymentData) {
  // In a real implementation, you would make an API call to Ozow
  // For now, we'll return a mock payment URL
  
  logger.info('Initiating Ozow payment:', paymentData);
  
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return `https://pay.ozow.com/payment?reference=${paymentData.reference}&amount=${paymentData.amount}`;
}

// Ozow payment callback
router.post('/ozow/callback', async (req, res) => {
  try {
    const { 
      TransactionId, 
      Reference, 
      Amount, 
      Status, 
      Hash 
    } = req.body;

    // Verify the callback hash
    const isValidHash = verifyOzowCallbackHash(req.body);
    if (!isValidHash) {
      logger.error('Invalid Ozow callback hash');
      return res.status(400).json({ success: false, message: 'Invalid hash' });
    }

    const order = await Order.findById(Reference);
    if (!order) {
      logger.error('Order not found for Ozow callback:', Reference);
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (Status === 'Complete') {
      // Update order status
      order.status = 'confirmed';
      order.paymentStatus = 'paid';
      order.paymentMethod = 'eft';
      order.paymentProvider = 'ozow';
      order.transactionId = TransactionId;
      order.paidAt = new Date();
      await order.save();

      logger.info('Ozow payment completed for order:', Reference);
    } else {
      logger.warn('Ozow payment failed for order:', Reference, Status);
    }

    res.json({ success: true });

  } catch (error) {
    logger.error('Error processing Ozow callback:', error);
    res.status(500).json({ success: false, message: 'Callback processing failed' });
  }
});

// Verify Ozow callback hash (placeholder)
function verifyOzowCallbackHash(callbackData) {
  // In a real implementation, you would verify the hash using Ozow's algorithm
  // For now, we'll return true
  
  logger.info('Verifying Ozow callback hash:', callbackData);
  
  return true;
}

// Get payment history
router.get('/history', verifyToken, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const orders = await Order.find({ 
      userId: req.user.id,
      paymentStatus: 'paid'
    })
    .select('_id total paymentMethod paymentProvider paidAt status')
    .sort({ paidAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .exec();

    const total = await Order.countDocuments({ 
      userId: req.user.id,
      paymentStatus: 'paid'
    });

    res.json({
      success: true,
      payments: orders,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });

  } catch (error) {
    logger.error('Error fetching payment history:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get payment details
router.get('/:paymentId', verifyToken, async (req, res) => {
  try {
    const { paymentId } = req.params;

    const order = await Order.findOne({ 
      _id: paymentId,
      userId: req.user.id,
      paymentStatus: 'paid'
    })
    .populate('stationId', 'stationName address')
    .populate('driverId', 'firstName lastName phone');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    res.json({ success: true, payment: order });

  } catch (error) {
    logger.error('Error fetching payment details:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Refund payment
router.post('/:paymentId/refund', verifyToken, async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { reason } = req.body;

    const order = await Order.findOne({ 
      _id: paymentId,
      userId: req.user.id,
      paymentStatus: 'paid'
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    if (order.status === 'delivered') {
      return res.status(400).json({ success: false, message: 'Cannot refund delivered order' });
    }

    // Process refund based on payment method
    let refundResult;

    switch (order.paymentMethod) {
      case 'wallet':
        refundResult = await processWalletRefund(order, req.user.id);
        break;
      case 'card':
        refundResult = await processCardRefund(order);
        break;
      case 'eft':
        refundResult = await processEFTRefund(order);
        break;
      default:
        return res.status(400).json({ success: false, message: 'Invalid payment method' });
    }

    if (!refundResult.success) {
      return res.status(400).json(refundResult);
    }

    // Update order status
    order.status = 'cancelled';
    order.paymentStatus = 'refunded';
    order.refundedAt = new Date();
    order.refundReason = reason;
    await order.save();

    res.json({ 
      success: true, 
      message: 'Refund processed successfully',
      order: order
    });

  } catch (error) {
    logger.error('Error processing refund:', error);
    res.status(500).json({ success: false, message: 'Refund processing failed' });
  }
});

// Process wallet refund
async function processWalletRefund(order, userId) {
  try {
    const user = await User.findById(userId);
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    // Add back to wallet
    user.wallet.balance += order.total;
    user.wallet.transactions.push({
      type: 'credit',
      amount: order.total,
      description: `Refund for order #${order._id}`,
      orderId: order._id,
      timestamp: new Date()
    });

    await user.save();

    return { success: true };
  } catch (error) {
    logger.error('Error processing wallet refund:', error);
    return { success: false, message: 'Wallet refund failed' };
  }
}

// Process card refund
async function processCardRefund(order) {
  try {
    // In a real implementation, you would make an API call to process the refund
    // For now, we'll simulate a successful refund
    
    logger.info(`Processing card refund for order ${order._id}`);
    
    return { success: true };
  } catch (error) {
    logger.error('Error processing card refund:', error);
    return { success: false, message: 'Card refund failed' };
  }
}

// Process EFT refund
async function processEFTRefund(order) {
  try {
    // In a real implementation, you would make an API call to process the EFT refund
    // For now, we'll simulate a successful refund
    
    logger.info(`Processing EFT refund for order ${order._id}`);
    
    return { success: true };
  } catch (error) {
    logger.error('Error processing EFT refund:', error);
    return { success: false, message: 'EFT refund failed' };
  }
}

module.exports = router;
