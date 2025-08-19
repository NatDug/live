const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const User = require('../models/User');
const PaymentService = require('../services/PaymentService');
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
      cardDetails,
      paymentData 
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
        paymentResult = await processCardPayment(order, paymentData);
        break;
      case 'eft':
        paymentResult = await processEFTPayment(order, paymentData);
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
    order.transactionId = paymentResult.transactionId;
    order.paidAt = new Date();
    await order.save();

    res.json({ 
      success: true, 
      message: 'Payment processed successfully',
      order: order,
      payment: paymentResult
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

    return { 
      success: true,
      transactionId: `WALLET_${Date.now()}`,
      provider: 'wallet'
    };
  } catch (error) {
    logger.error('Error processing wallet payment:', error);
    return { success: false, message: 'Wallet payment failed' };
  }
}

// Process card payment
async function processCardPayment(order, paymentData) {
  try {
    const paymentResult = await PaymentService.processYocoPayment({
      amount: order.total,
      currency: 'ZAR',
      source: paymentData.token,
      metadata: {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        userId: order.userId.toString(),
        fuelType: order.fuelType,
        quantity: order.quantity
      },
      description: `WeFuel Order #${order.orderNumber}`
    });

    return {
      success: true,
      transactionId: paymentResult.transactionId,
      provider: 'yoco',
      amount: paymentResult.amount,
      status: paymentResult.status
    };
  } catch (error) {
    logger.error('Error processing card payment:', error);
    return { success: false, message: error.message };
  }
}

// Process EFT payment
async function processEFTPayment(order, paymentData) {
  try {
    const baseUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    
    const paymentResult = await PaymentService.processOzowPayment({
      amount: order.total,
      reference: `WF_${order.orderNumber}`,
      customerEmail: paymentData.customerEmail,
      customerName: paymentData.customerName,
      successUrl: `${baseUrl}/user/payment/success?orderId=${order._id}`,
      cancelUrl: `${baseUrl}/user/payment/cancel?orderId=${order._id}`,
      errorUrl: `${baseUrl}/user/payment/error?orderId=${order._id}`,
      notifyUrl: `${process.env.API_URL || 'http://localhost:5000'}/api/payments/ozow/callback`,
      metadata: {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        userId: order.userId.toString(),
        fuelType: order.fuelType,
        quantity: order.quantity
      }
    });

    return {
      success: true,
      transactionId: paymentResult.transactionId,
      paymentUrl: paymentResult.paymentUrl,
      provider: 'ozow',
      amount: paymentResult.amount,
      status: paymentResult.status
    };
  } catch (error) {
    logger.error('Error processing EFT payment:', error);
    return { success: false, message: error.message };
  }
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

    const baseUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    
    const paymentResult = await PaymentService.processOzowPayment({
      amount: order.total,
      reference: `WF_${order.orderNumber}`,
      customerEmail: order.userId.email,
      customerName: `${order.userId.firstName} ${order.userId.lastName}`,
      successUrl: returnUrl || `${baseUrl}/user/payment/success?orderId=${order._id}`,
      cancelUrl: cancelUrl || `${baseUrl}/user/payment/cancel?orderId=${order._id}`,
      errorUrl: `${baseUrl}/user/payment/error?orderId=${order._id}`,
      notifyUrl: `${process.env.API_URL || 'http://localhost:5000'}/api/payments/ozow/callback`,
      metadata: {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        userId: order.userId.toString(),
        fuelType: order.fuelType,
        quantity: order.quantity
      }
    });

    res.json({ 
      success: true, 
      paymentUrl: paymentResult.paymentUrl,
      reference: paymentResult.transactionId
    });

  } catch (error) {
    logger.error('Error initiating Ozow payment:', error);
    res.status(500).json({ success: false, message: 'Failed to initiate payment' });
  }
});

// Ozow payment callback
router.post('/ozow/callback', async (req, res) => {
  try {
    const callbackData = req.body;
    
    logger.info('Ozow callback received:', callbackData);

    // Verify the callback signature
    const verificationResult = await PaymentService.verifyOzowCallback(callbackData);
    
    if (!verificationResult.verified) {
      logger.error('Ozow callback verification failed');
      return res.status(400).json({ success: false, message: 'Invalid callback signature' });
    }

    // Find the order using metadata
    const order = await Order.findById(verificationResult.metadata.orderId);
    if (!order) {
      logger.error('Order not found for Ozow callback:', verificationResult.metadata.orderId);
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Update order payment status
    if (verificationResult.status === 'complete') {
      order.status = 'confirmed';
      order.paymentStatus = 'paid';
      order.paymentMethod = 'eft';
      order.paymentProvider = 'ozow';
      order.transactionId = verificationResult.transactionId;
      order.paidAt = new Date();
      await order.save();

      logger.info('Ozow payment completed for order:', order.orderNumber);
    } else {
      logger.warn('Ozow payment failed for order:', order.orderNumber, verificationResult.status);
    }

    res.json({ success: true });

  } catch (error) {
    logger.error('Error processing Ozow callback:', error);
    res.status(500).json({ success: false, message: 'Callback processing failed' });
  }
});

// Get payment history
router.get('/history', verifyToken, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const orders = await Order.find({ 
      userId: req.user.id,
      paymentStatus: 'paid'
    })
    .select('_id total paymentMethod paymentProvider paidAt status orderNumber')
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
        refundResult = await processCardRefund(order, reason);
        break;
      case 'eft':
        refundResult = await processEFTRefund(order, reason);
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
      order: order,
      refund: refundResult
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

    return { 
      success: true,
      refundId: `WALLET_REFUND_${Date.now()}`,
      provider: 'wallet'
    };
  } catch (error) {
    logger.error('Error processing wallet refund:', error);
    return { success: false, message: 'Wallet refund failed' };
  }
}

// Process card refund
async function processCardRefund(order, reason) {
  try {
    const refundResult = await PaymentService.processYocoRefund(
      order.transactionId,
      order.total,
      reason
    );

    return {
      success: true,
      refundId: refundResult.refundId,
      provider: 'yoco',
      amount: refundResult.amount,
      status: refundResult.status
    };
  } catch (error) {
    logger.error('Error processing card refund:', error);
    return { success: false, message: error.message };
  }
}

// Process EFT refund
async function processEFTRefund(order, reason) {
  try {
    const refundResult = await PaymentService.processOzowRefund(
      order.transactionId,
      order.total,
      reason
    );

    return {
      success: true,
      refundId: refundResult.refundId,
      provider: 'ozow',
      amount: refundResult.amount,
      status: refundResult.status
    };
  } catch (error) {
    logger.error('Error processing EFT refund:', error);
    return { success: false, message: error.message };
  }
}

// Get payment gateway status
router.get('/gateways/status', async (req, res) => {
  try {
    const status = await PaymentService.getGatewayStatus();
    res.json({ success: true, status });
  } catch (error) {
    logger.error('Gateway status error:', error);
    res.status(500).json({ success: false, message: 'Failed to get gateway status' });
  }
});

// Get test tokens (development only)
router.get('/test/tokens', (req, res) => {
  try {
    const tokens = PaymentService.getTestTokens();
    res.json({ success: true, tokens });
  } catch (error) {
    res.status(403).json({ success: false, message: error.message });
  }
});

module.exports = router;
