const axios = require('axios');
const crypto = require('crypto');
const logger = require('../utils/logger');

class PaymentService {
  constructor() {
    this.yocoPublicKey = process.env.YOCO_PUBLIC_KEY;
    this.yocoSecretKey = process.env.YOCO_SECRET_KEY;
    this.ozowSiteCode = process.env.OZOW_SITE_CODE;
    this.ozowPrivateKey = process.env.OZOW_PRIVATE_KEY;
    this.ozowApiKey = process.env.OZOW_API_KEY;
    this.ozowCountryCode = process.env.OZOW_COUNTRY_CODE || 'ZA';
    this.ozowCurrencyCode = process.env.OZOW_CURRENCY_CODE || 'ZAR';
    
    // Yoco API endpoints
    this.yocoBaseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://online.yoco.com/v1'
      : 'https://online.yoco.com/v1'; // Yoco uses same URL for test/prod
    
    // Ozow API endpoints
    this.ozowBaseUrl = process.env.NODE_ENV === 'production'
      ? 'https://pay.ozow.com'
      : 'https://pay.ozow.com'; // Ozow uses same URL for test/prod
  }

  /**
   * Process Yoco card payment
   */
  async processYocoPayment(paymentData) {
    try {
      const {
        amount,
        currency = 'ZAR',
        source = 'tok_visa', // Default test token
        metadata = {},
        description = 'WeFuel Payment'
      } = paymentData;

      const payload = {
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toUpperCase(),
        source: source,
        metadata: {
          ...metadata,
          description: description
        }
      };

      const response = await axios.post(
        `${this.yocoBaseUrl}/charges/`,
        payload,
        {
          headers: {
            'X-Auth-Secret-Key': this.yocoSecretKey,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.status === 'successful') {
        return {
          success: true,
          transactionId: response.data.id,
          amount: response.data.amount / 100, // Convert back from cents
          currency: response.data.currency,
          status: response.data.status,
          metadata: response.data.metadata
        };
      } else {
        throw new Error(`Payment failed: ${response.data.failure_reason || 'Unknown error'}`);
      }
    } catch (error) {
      logger.error('Yoco payment error:', error.response?.data || error.message);
      throw new Error(`Yoco payment failed: ${error.response?.data?.failure_reason || error.message}`);
    }
  }

  /**
   * Verify Yoco payment
   */
  async verifyYocoPayment(transactionId) {
    try {
      const response = await axios.get(
        `${this.yocoBaseUrl}/charges/${transactionId}/`,
        {
          headers: {
            'X-Auth-Secret-Key': this.yocoSecretKey
          }
        }
      );

      return {
        success: true,
        transactionId: response.data.id,
        amount: response.data.amount / 100,
        currency: response.data.currency,
        status: response.data.status,
        metadata: response.data.metadata
      };
    } catch (error) {
      logger.error('Yoco verification error:', error.response?.data || error.message);
      throw new Error(`Yoco verification failed: ${error.message}`);
    }
  }

  /**
   * Process Ozow EFT payment
   */
  async processOzowPayment(paymentData) {
    try {
      const {
        amount,
        reference,
        customerEmail,
        customerName,
        successUrl,
        cancelUrl,
        errorUrl,
        notifyUrl,
        metadata = {}
      } = paymentData;

      // Generate unique transaction reference
      const transactionRef = reference || `WF_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create signature
      const signatureData = [
        this.ozowSiteCode,
        transactionRef,
        customerEmail,
        amount.toFixed(2),
        this.ozowCountryCode,
        this.ozowCurrencyCode,
        successUrl,
        cancelUrl,
        errorUrl,
        notifyUrl,
        this.ozowPrivateKey
      ].join('');

      const signature = crypto.createHash('sha512').update(signatureData).digest('hex');

      const payload = {
        SiteCode: this.ozowSiteCode,
        CountryCode: this.ozowCountryCode,
        CurrencyCode: this.ozowCurrencyCode,
        Amount: amount.toFixed(2),
        TransactionReference: transactionRef,
        BankReference: transactionRef,
        Optional1: metadata.orderId || '',
        Optional2: metadata.userId || '',
        Optional3: metadata.fuelType || '',
        Optional4: metadata.quantity || '',
        Optional5: JSON.stringify(metadata),
        IsTest: process.env.NODE_ENV !== 'production',
        Customer: customerName,
        BankReference: transactionRef,
        CancelUrl: cancelUrl,
        ErrorUrl: errorUrl,
        SuccessUrl: successUrl,
        NotifyUrl: notifyUrl,
        CustomerEmail: customerEmail,
        Signature: signature
      };

      // For Ozow, we return the payment URL for redirect
      const queryString = Object.keys(payload)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(payload[key])}`)
        .join('&');

      const paymentUrl = `${this.ozowBaseUrl}/?${queryString}`;

      return {
        success: true,
        transactionId: transactionRef,
        paymentUrl: paymentUrl,
        amount: amount,
        currency: this.ozowCurrencyCode,
        status: 'pending',
        metadata: metadata
      };
    } catch (error) {
      logger.error('Ozow payment error:', error.message);
      throw new Error(`Ozow payment failed: ${error.message}`);
    }
  }

  /**
   * Verify Ozow payment callback
   */
  async verifyOzowCallback(callbackData) {
    try {
      const {
        TransactionId,
        TransactionReference,
        Amount,
        Status,
        Signature,
        Optional1,
        Optional2,
        Optional3,
        Optional4,
        Optional5
      } = callbackData;

      // Recreate signature for verification
      const signatureData = [
        this.ozowSiteCode,
        TransactionReference,
        Amount,
        Status,
        this.ozowPrivateKey
      ].join('');

      const expectedSignature = crypto.createHash('sha512').update(signatureData).digest('hex');

      if (Signature !== expectedSignature) {
        throw new Error('Invalid signature');
      }

      // Parse metadata
      let metadata = {};
      try {
        if (Optional5) {
          metadata = JSON.parse(Optional5);
        }
      } catch (e) {
        // Metadata parsing failed, use individual fields
        metadata = {
          orderId: Optional1,
          userId: Optional2,
          fuelType: Optional3,
          quantity: Optional4
        };
      }

      return {
        success: true,
        transactionId: TransactionId,
        transactionReference: TransactionReference,
        amount: parseFloat(Amount),
        status: Status.toLowerCase(),
        metadata: metadata,
        verified: true
      };
    } catch (error) {
      logger.error('Ozow callback verification error:', error.message);
      throw new Error(`Ozow callback verification failed: ${error.message}`);
    }
  }

  /**
   * Process Ozow payment status check
   */
  async checkOzowPaymentStatus(transactionReference) {
    try {
      const response = await axios.post(
        `${this.ozowBaseUrl}/api/transaction/status`,
        {
          SiteCode: this.ozowSiteCode,
          TransactionReference: transactionReference
        },
        {
          headers: {
            'Authorization': `Bearer ${this.ozowApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        transactionReference: transactionReference,
        status: response.data.Status,
        amount: response.data.Amount,
        verified: true
      };
    } catch (error) {
      logger.error('Ozow status check error:', error.response?.data || error.message);
      throw new Error(`Ozow status check failed: ${error.message}`);
    }
  }

  /**
   * Process refund for Yoco payment
   */
  async processYocoRefund(chargeId, amount, reason = 'Customer request') {
    try {
      const payload = {
        amount: Math.round(amount * 100), // Convert to cents
        reason: reason
      };

      const response = await axios.post(
        `${this.yocoBaseUrl}/charges/${chargeId}/refunds/`,
        payload,
        {
          headers: {
            'X-Auth-Secret-Key': this.yocoSecretKey,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        refundId: response.data.id,
        amount: response.data.amount / 100,
        status: response.data.status,
        reason: response.data.reason
      };
    } catch (error) {
      logger.error('Yoco refund error:', error.response?.data || error.message);
      throw new Error(`Yoco refund failed: ${error.response?.data?.failure_reason || error.message}`);
    }
  }

  /**
   * Process refund for Ozow payment
   */
  async processOzowRefund(transactionReference, amount, reason = 'Customer request') {
    try {
      const signatureData = [
        this.ozowSiteCode,
        transactionReference,
        amount.toFixed(2),
        reason,
        this.ozowPrivateKey
      ].join('');

      const signature = crypto.createHash('sha512').update(signatureData).digest('hex');

      const payload = {
        SiteCode: this.ozowSiteCode,
        TransactionReference: transactionReference,
        Amount: amount.toFixed(2),
        Reason: reason,
        Signature: signature
      };

      const response = await axios.post(
        `${this.ozowBaseUrl}/api/refund`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.ozowApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        refundId: response.data.RefundId,
        amount: parseFloat(response.data.Amount),
        status: response.data.Status,
        reason: response.data.Reason
      };
    } catch (error) {
      logger.error('Ozow refund error:', error.response?.data || error.message);
      throw new Error(`Ozow refund failed: ${error.message}`);
    }
  }

  /**
   * Get payment gateway status
   */
  async getGatewayStatus() {
    const status = {
      yoco: {
        enabled: !!(this.yocoPublicKey && this.yocoSecretKey),
        testMode: process.env.NODE_ENV !== 'production'
      },
      ozow: {
        enabled: !!(this.ozowSiteCode && this.ozowPrivateKey && this.ozowApiKey),
        testMode: process.env.NODE_ENV !== 'production'
      }
    };

    return status;
  }

  /**
   * Validate payment data
   */
  validatePaymentData(paymentData, gateway) {
    const errors = [];

    if (!paymentData.amount || paymentData.amount <= 0) {
      errors.push('Invalid amount');
    }

    if (gateway === 'yoco') {
      if (!paymentData.source) {
        errors.push('Payment source is required for Yoco');
      }
    } else if (gateway === 'ozow') {
      if (!paymentData.customerEmail) {
        errors.push('Customer email is required for Ozow');
      }
      if (!paymentData.customerName) {
        errors.push('Customer name is required for Ozow');
      }
      if (!paymentData.successUrl || !paymentData.cancelUrl || !paymentData.errorUrl) {
        errors.push('URLs are required for Ozow payment');
      }
    }

    return errors;
  }

  /**
   * Format amount for display
   */
  formatAmount(amount, currency = 'ZAR') {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: currency
    }).format(amount);
  }

  /**
   * Generate test payment tokens (for development)
   */
  getTestTokens() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Test tokens not available in production');
    }

    return {
      yoco: {
        visa: 'tok_visa',
        mastercard: 'tok_mastercard',
        amex: 'tok_amex',
        declined: 'tok_chargeDeclined'
      }
    };
  }
}

module.exports = new PaymentService();
