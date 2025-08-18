const axios = require('axios');
const { logger } = require('../utils/logger');

class PaymentService {
  constructor() {
    this.yocoApiKey = process.env.YOCO_API_KEY;
    this.ozowApiKey = process.env.OZOW_API_KEY;
    this.ozowSiteCode = process.env.OZOW_SITE_CODE;
    this.ozowPrivateKey = process.env.OZOW_PRIVATE_KEY;
  }

  // Process card payment via Yoco
  async processCardPayment(paymentData) {
    try {
      const { amount, currency = 'ZAR', source, metadata } = paymentData;

      const response = await axios.post('https://online.yoco.com/v1/charges/', {
        token: source,
        amountInCents: Math.round(amount * 100), // Convert to cents
        currency: currency,
        metadata: metadata
      }, {
        headers: {
          'X-Auth-Secret-Key': this.yocoApiKey
        }
      });

      if (response.data.status === 'successful') {
        return {
          success: true,
          transactionId: response.data.id,
          amount: amount,
          currency: currency,
          status: 'completed',
          provider: 'yoco',
          metadata: response.data
        };
      } else {
        throw new Error(`Payment failed: ${response.data.failure_reason}`);
      }
    } catch (error) {
      logger.error('Yoco payment error:', error.message);
      return {
        success: false,
        error: error.message,
        provider: 'yoco'
      };
    }
  }

  // Process instant EFT via Ozow
  async processInstantEFT(paymentData) {
    try {
      const { amount, currency = 'ZAR', customerEmail, customerName, transactionReference } = paymentData;

      // Generate Ozow signature
      const signature = this.generateOzowSignature({
        SiteCode: this.ozowSiteCode,
        CountryCode: 'ZA',
        CurrencyCode: currency,
        Amount: amount.toFixed(2),
        TransactionReference: transactionReference,
        BankReference: transactionReference,
        CancelUrl: `${process.env.CLIENT_URL}/payment/cancel`,
        ErrorUrl: `${process.env.CLIENT_URL}/payment/error`,
        SuccessUrl: `${process.env.CLIENT_URL}/payment/success`,
        NotifyUrl: `${process.env.API_URL}/api/payments/ozow/webhook`,
        Customer: customerName,
        CustomerEmail: customerEmail
      });

      const ozowData = {
        SiteCode: this.ozowSiteCode,
        CountryCode: 'ZA',
        CurrencyCode: currency,
        Amount: amount.toFixed(2),
        TransactionReference: transactionReference,
        BankReference: transactionReference,
        CancelUrl: `${process.env.CLIENT_URL}/payment/cancel`,
        ErrorUrl: `${process.env.CLIENT_URL}/payment/error`,
        SuccessUrl: `${process.env.CLIENT_URL}/payment/success`,
        NotifyUrl: `${process.env.API_URL}/api/payments/ozow/webhook`,
        Customer: customerName,
        CustomerEmail: customerEmail,
        Signature: signature
      };

      // Redirect to Ozow payment page
      const ozowUrl = 'https://pay.ozow.com';
      const formData = new URLSearchParams(ozowData).toString();

      return {
        success: true,
        redirectUrl: ozowUrl,
        formData: formData,
        transactionReference: transactionReference,
        provider: 'ozow'
      };
    } catch (error) {
      logger.error('Ozow payment error:', error.message);
      return {
        success: false,
        error: error.message,
        provider: 'ozow'
      };
    }
  }

  // Generate Ozow signature
  generateOzowSignature(data) {
    const crypto = require('crypto');
    
    // Create string to sign (alphabetical order)
    const stringToSign = Object.keys(data)
      .filter(key => key !== 'Signature')
      .sort()
      .map(key => `${key}=${data[key]}`)
      .join('&');

    // Sign with private key
    const sign = crypto.createSign('SHA512');
    sign.update(stringToSign);
    return sign.sign(this.ozowPrivateKey, 'base64');
  }

  // Process wallet payment
  async processWalletPayment(userId, amount, orderId) {
    try {
      const User = require('../models/User');
      const user = await User.findById(userId);

      if (!user) {
        throw new Error('User not found');
      }

      if (user.wallet.balance < amount) {
        throw new Error('Insufficient wallet balance');
      }

      // Deduct from wallet
      user.wallet.balance -= amount;
      
      // Add transaction record
      user.wallet.transactions.push({
        type: 'payment',
        amount: -amount,
        description: `Payment for order ${orderId}`,
        status: 'completed',
        timestamp: new Date()
      });

      await user.save();

      return {
        success: true,
        transactionId: `WALLET_${Date.now()}`,
        amount: amount,
        status: 'completed',
        provider: 'wallet',
        newBalance: user.wallet.balance
      };
    } catch (error) {
      logger.error('Wallet payment error:', error.message);
      return {
        success: false,
        error: error.message,
        provider: 'wallet'
      };
    }
  }

  // Process cash payment (for orders < R300)
  async processCashPayment(paymentData) {
    const { amount, orderId } = paymentData;

    if (amount >= 300) {
      return {
        success: false,
        error: 'Cash payments only allowed for orders under R300',
        provider: 'cash'
      };
    }

    return {
      success: true,
      transactionId: `CASH_${Date.now()}`,
      amount: amount,
      status: 'pending', // Will be completed when driver confirms
      provider: 'cash',
      requiresConfirmation: true
    };
  }

  // Process refund
  async processRefund(transactionId, amount, reason) {
    try {
      // Determine payment provider from transaction ID
      if (transactionId.startsWith('YOC')) {
        return await this.processYocoRefund(transactionId, amount);
      } else if (transactionId.startsWith('OZO')) {
        return await this.processOzowRefund(transactionId, amount);
      } else if (transactionId.startsWith('WALLET')) {
        return await this.processWalletRefund(transactionId, amount);
      } else {
        throw new Error('Unknown payment provider');
      }
    } catch (error) {
      logger.error('Refund error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Process Yoco refund
  async processYocoRefund(transactionId, amount) {
    try {
      const response = await axios.post(`https://online.yoco.com/v1/refunds/`, {
        chargeId: transactionId,
        amountInCents: Math.round(amount * 100)
      }, {
        headers: {
          'X-Auth-Secret-Key': this.yocoApiKey
        }
      });

      return {
        success: true,
        refundId: response.data.id,
        amount: amount,
        status: 'completed',
        provider: 'yoco'
      };
    } catch (error) {
      throw new Error(`Yoco refund failed: ${error.message}`);
    }
  }

  // Process Ozow refund
  async processOzowRefund(transactionId, amount) {
    // Ozow refunds are typically processed manually
    // This would integrate with their refund API when available
    return {
      success: true,
      refundId: `OZOW_REFUND_${Date.now()}`,
      amount: amount,
      status: 'pending',
      provider: 'ozow',
      note: 'Refund will be processed within 3-5 business days'
    };
  }

  // Process wallet refund
  async processWalletRefund(transactionId, amount, userId) {
    try {
      const User = require('../models/User');
      const user = await User.findById(userId);

      if (!user) {
        throw new Error('User not found');
      }

      // Add to wallet
      user.wallet.balance += amount;
      
      // Add transaction record
      user.wallet.transactions.push({
        type: 'refund',
        amount: amount,
        description: `Refund for transaction ${transactionId}`,
        status: 'completed',
        timestamp: new Date()
      });

      await user.save();

      return {
        success: true,
        refundId: `WALLET_REFUND_${Date.now()}`,
        amount: amount,
        status: 'completed',
        provider: 'wallet',
        newBalance: user.wallet.balance
      };
    } catch (error) {
      throw new Error(`Wallet refund failed: ${error.message}`);
    }
  }

  // Verify payment status
  async verifyPaymentStatus(transactionId, provider) {
    try {
      switch (provider) {
        case 'yoco':
          return await this.verifyYocoPayment(transactionId);
        case 'ozow':
          return await this.verifyOzowPayment(transactionId);
        case 'wallet':
        case 'cash':
          return { status: 'completed' };
        default:
          throw new Error('Unknown payment provider');
      }
    } catch (error) {
      logger.error('Payment verification error:', error.message);
      return { status: 'unknown', error: error.message };
    }
  }

  // Verify Yoco payment
  async verifyYocoPayment(transactionId) {
    try {
      const response = await axios.get(`https://online.yoco.com/v1/charges/${transactionId}`, {
        headers: {
          'X-Auth-Secret-Key': this.yocoApiKey
        }
      });

      return {
        status: response.data.status,
        amount: response.data.amountInCents / 100,
        currency: response.data.currency
      };
    } catch (error) {
      throw new Error(`Yoco verification failed: ${error.message}`);
    }
  }

  // Verify Ozow payment
  async verifyOzowPayment(transactionId) {
    // This would integrate with Ozow's verification API
    return {
      status: 'completed',
      note: 'Ozow payments are typically confirmed via webhook'
    };
  }
}

module.exports = new PaymentService();
