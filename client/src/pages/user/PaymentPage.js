import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { FaCreditCard, FaWallet, FaLock, FaShieldAlt, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { useQuery, useMutation } from 'react-query';
import axios from 'axios';

const PaymentPage = () => {
  const { orderId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm();

  // Fetch order details
  const { data: order, isLoading: orderLoading } = useQuery(
    ['order', orderId],
    async () => {
      const response = await axios.get(`/api/orders/${orderId}`);
      return response.data.order;
    },
    {
      enabled: !!orderId,
    }
  );

  // Fetch user wallet
  const { data: wallet, refetch: refetchWallet } = useQuery(
    'userWallet',
    async () => {
      const response = await axios.get('/api/users/wallet');
      return response.data.wallet;
    },
    {
      enabled: !!user,
    }
  );

  // Process payment mutation
  const processPaymentMutation = useMutation(
    async (paymentData) => {
      const response = await axios.post(`/api/payments/process`, paymentData);
      return response.data;
    },
    {
      onSuccess: (data) => {
        setPaymentStatus('success');
        toast.success('Payment processed successfully!');
        setTimeout(() => {
          navigate(`/user/orders/${orderId}`);
        }, 2000);
      },
      onError: (error) => {
        setPaymentStatus('error');
        toast.error(error.response?.data?.message || 'Payment failed');
      },
    }
  );

  // Initialize Yoco payment
  const initializeYocoPayment = async (paymentData) => {
    try {
      // Load Yoco script
      const script = document.createElement('script');
      script.src = 'https://js.yoco.com/sdk/v1/yoco-sdk-web.js';
      script.async = true;
      document.head.appendChild(script);

      script.onload = () => {
        const yoco = new window.YocoSDK({
          publicKey: process.env.REACT_APP_YOCO_PUBLIC_KEY,
        });

        yoco.showPopup({
          amountInCents: Math.round(paymentData.amount * 100),
          currency: 'ZAR',
          name: 'WeFuel Order',
          description: `Fuel delivery - Order #${orderId}`,
          metadata: {
            orderId: orderId,
            userId: user._id,
          },
          callback: async (result) => {
            if (result.error) {
              toast.error('Payment failed: ' + result.error.message);
              setPaymentStatus('error');
            } else {
              // Process successful payment
              await processPaymentMutation.mutateAsync({
                ...paymentData,
                paymentMethod: 'card',
                transactionId: result.id,
                paymentProvider: 'yoco',
              });
            }
          },
        });
      };
    } catch (error) {
      toast.error('Failed to initialize payment');
      setPaymentStatus('error');
    }
  };

  // Initialize Ozow payment
  const initializeOzowPayment = async (paymentData) => {
    try {
      const response = await axios.post('/api/payments/ozow/initiate', {
        ...paymentData,
        paymentMethod: 'eft',
        paymentProvider: 'ozow',
        returnUrl: `${window.location.origin}/user/payment/success`,
        cancelUrl: `${window.location.origin}/user/payment/cancel`,
      });

      // Redirect to Ozow payment page
      window.location.href = response.data.paymentUrl;
    } catch (error) {
      toast.error('Failed to initialize EFT payment');
      setPaymentStatus('error');
    }
  };

  const onSubmit = async (data) => {
    if (!order) {
      toast.error('Order not found');
      return;
    }

    setIsProcessing(true);
    setPaymentStatus(null);

    const paymentData = {
      orderId: orderId,
      amount: order.total,
      currency: 'ZAR',
      ...data,
    };

    try {
      switch (paymentMethod) {
        case 'wallet':
          if (wallet.balance < order.total) {
            toast.error('Insufficient wallet balance');
            setPaymentStatus('error');
            return;
          }
          await processPaymentMutation.mutateAsync({
            ...paymentData,
            paymentMethod: 'wallet',
            paymentProvider: 'internal',
          });
          break;

        case 'card':
          await initializeYocoPayment(paymentData);
          break;

        case 'eft':
          await initializeOzowPayment(paymentData);
          break;

        default:
          toast.error('Invalid payment method');
          setPaymentStatus('error');
      }
    } catch (error) {
      toast.error('Payment processing failed');
      setPaymentStatus('error');
    } finally {
      setIsProcessing(false);
    }
  };

  const paymentMethods = [
    {
      value: 'wallet',
      label: 'Wallet',
      icon: <FaWallet />,
      description: 'Pay using your wallet balance',
      available: wallet?.balance >= (order?.total || 0),
      balance: wallet?.balance || 0,
    },
    {
      value: 'card',
      label: 'Credit/Debit Card',
      icon: <FaCreditCard />,
      description: 'Secure payment via Yoco',
      available: true,
    },
    {
      value: 'eft',
      label: 'Instant EFT',
      icon: <FaCreditCard />,
      description: 'Direct bank transfer via Ozow',
      available: true,
    },
  ];

  if (orderLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <FaTimesCircle className="text-4xl text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Order Not Found
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            The order you're looking for doesn't exist or has been removed.
          </p>
          <button
            onClick={() => navigate('/user/dashboard')}
            className="btn btn-primary"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Payment
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Complete your payment for Order #{orderId}
          </p>
        </div>

        {/* Order Summary */}
        <div className="card mb-8">
          <div className="card-header">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Order Summary
            </h2>
          </div>
          <div className="card-body">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-300">Fuel Type</span>
                <span className="font-medium">{order.fuelType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-300">Quantity</span>
                <span className="font-medium">{order.quantity}L</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-300">Delivery Address</span>
                <span className="font-medium text-right max-w-xs">
                  {order.deliveryAddress.street}, {order.deliveryAddress.city}
                </span>
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total Amount</span>
                  <span>R {order.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Status */}
        {paymentStatus && (
          <div className={`card mb-8 ${
            paymentStatus === 'success' ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-red-500 bg-red-50 dark:bg-red-900/20'
          }`}>
            <div className="card-body">
              <div className="flex items-center">
                {paymentStatus === 'success' ? (
                  <FaCheckCircle className="text-2xl text-green-500 mr-3" />
                ) : (
                  <FaTimesCircle className="text-2xl text-red-500 mr-3" />
                )}
                <div>
                  <h3 className={`font-semibold ${
                    paymentStatus === 'success' ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'
                  }`}>
                    {paymentStatus === 'success' ? 'Payment Successful!' : 'Payment Failed'}
                  </h3>
                  <p className={`text-sm ${
                    paymentStatus === 'success' ? 'text-green-600 dark:text-green-300' : 'text-red-600 dark:text-red-300'
                  }`}>
                    {paymentStatus === 'success' 
                      ? 'Your payment has been processed successfully. Redirecting to order details...'
                      : 'There was an issue processing your payment. Please try again.'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Methods */}
        <div className="card mb-8">
          <div className="card-header">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Select Payment Method
            </h2>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              {paymentMethods.map((method) => (
                <div
                  key={method.value}
                  onClick={() => method.available && setPaymentMethod(method.value)}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    paymentMethod === method.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  } ${!method.available ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl text-gray-600 dark:text-gray-300">
                        {method.icon}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {method.label}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {method.description}
                        </p>
                        {method.value === 'wallet' && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Balance: R {method.balance.toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                    {paymentMethod === method.value && (
                      <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Card Payment Form */}
        {paymentMethod === 'card' && (
          <div className="card mb-8">
            <div className="card-header">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                <FaCreditCard className="mr-2" />
                Card Details
              </h2>
            </div>
            <div className="card-body">
              <div className="space-y-4">
                <div>
                  <label className="form-label">Card Number</label>
                  <input
                    type="text"
                    {...register('cardNumber', {
                      required: 'Card number is required',
                      pattern: {
                        value: /^[0-9]{16}$/,
                        message: 'Please enter a valid 16-digit card number',
                      },
                    })}
                    className="form-input"
                    placeholder="1234 5678 9012 3456"
                    maxLength="16"
                  />
                  {errors.cardNumber && (
                    <p className="form-error">{errors.cardNumber.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Expiry Date</label>
                    <input
                      type="text"
                      {...register('expiryDate', {
                        required: 'Expiry date is required',
                        pattern: {
                          value: /^(0[1-9]|1[0-2])\/([0-9]{2})$/,
                          message: 'Please enter in MM/YY format',
                        },
                      })}
                      className="form-input"
                      placeholder="MM/YY"
                      maxLength="5"
                    />
                    {errors.expiryDate && (
                      <p className="form-error">{errors.expiryDate.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="form-label">CVV</label>
                    <input
                      type="text"
                      {...register('cvv', {
                        required: 'CVV is required',
                        pattern: {
                          value: /^[0-9]{3,4}$/,
                          message: 'Please enter a valid CVV',
                        },
                      })}
                      className="form-input"
                      placeholder="123"
                      maxLength="4"
                    />
                    {errors.cvv && (
                      <p className="form-error">{errors.cvv.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="form-label">Cardholder Name</label>
                  <input
                    type="text"
                    {...register('cardholderName', {
                      required: 'Cardholder name is required',
                    })}
                    className="form-input"
                    placeholder="John Doe"
                  />
                  {errors.cardholderName && (
                    <p className="form-error">{errors.cardholderName.message}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Security Notice */}
        <div className="card mb-8">
          <div className="card-body">
            <div className="flex items-start space-x-3">
              <FaShieldAlt className="text-2xl text-green-500 mt-1" />
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Secure Payment
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Your payment information is encrypted and secure. We use industry-standard SSL encryption 
                  to protect your data. We never store your card details on our servers.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate(`/user/orders/${orderId}`)}
            className="btn btn-secondary"
            disabled={isProcessing}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit(onSubmit)}
            disabled={isProcessing || paymentStatus === 'success'}
            className="btn btn-primary"
          >
            {isProcessing ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processing Payment...
              </div>
            ) : (
              `Pay R ${order.total.toFixed(2)}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
