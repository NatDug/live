import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { FaGasPump, FaMapMarkerAlt, FaCreditCard, FaWallet, FaCalculator, FaInfoCircle } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { useQuery, useMutation } from 'react-query';
import axios from 'axios';

const CreateOrder = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedStation, setSelectedStation] = useState(null);
  const [pricing, setPricing] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm();

  const fuelType = watch('fuelType');
  const quantity = watch('quantity');
  const stationId = watch('stationId');
  const paymentMethod = watch('paymentMethod');

  // Fetch available stations
  const { data: stations, isLoading: stationsLoading } = useQuery(
    'stations',
    async () => {
      const response = await axios.get('/api/stations/available');
      return response.data.stations;
    },
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  // Fetch user addresses
  const { data: userAddresses } = useQuery(
    'userAddresses',
    async () => {
      const response = await axios.get('/api/users/addresses');
      return response.data.addresses;
    },
    {
      enabled: !!user,
    }
  );

  // Calculate pricing mutation
  const calculatePricingMutation = useMutation(
    async (data) => {
      const response = await axios.post('/api/orders/calculate-pricing', data);
      return response.data;
    },
    {
      onSuccess: (data) => {
        setPricing(data.pricing);
        setIsCalculating(false);
      },
      onError: (error) => {
        toast.error('Failed to calculate pricing');
        setIsCalculating(false);
      },
    }
  );

  // Create order mutation
  const createOrderMutation = useMutation(
    async (orderData) => {
      const response = await axios.post('/api/orders', orderData);
      return response.data;
    },
    {
      onSuccess: (data) => {
        toast.success('Order created successfully!');
        navigate(`/user/orders/${data.order._id}`);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to create order');
      },
    }
  );

  // Calculate pricing when inputs change
  useEffect(() => {
    if (fuelType && quantity && stationId && deliveryAddress) {
      setIsCalculating(true);
      calculatePricingMutation.mutate({
        fuelType,
        quantity: parseFloat(quantity),
        stationId,
        deliveryAddress,
      });
    }
  }, [fuelType, quantity, stationId, deliveryAddress]);

  // Set default delivery address
  useEffect(() => {
    if (userAddresses && userAddresses.length > 0) {
      const defaultAddress = userAddresses.find(addr => addr.isDefault) || userAddresses[0];
      setDeliveryAddress(defaultAddress);
      setValue('deliveryAddress', defaultAddress);
    }
  }, [userAddresses, setValue]);

  const onSubmit = async (data) => {
    if (!deliveryAddress) {
      toast.error('Please select a delivery address');
      return;
    }

    if (!pricing) {
      toast.error('Please wait for pricing calculation');
      return;
    }

    const orderData = {
      ...data,
      quantity: parseFloat(data.quantity),
      deliveryAddress,
      stationId: selectedStation?._id,
    };

    createOrderMutation.mutate(orderData);
  };

  const handleStationSelect = (station) => {
    setSelectedStation(station);
    setValue('stationId', station._id);
  };

  const handleAddressSelect = (address) => {
    setDeliveryAddress(address);
    setValue('deliveryAddress', address);
  };

  const fuelTypes = [
    { value: 'petrol95', label: 'Petrol 95', price: 25.50 },
    { value: 'petrol93', label: 'Petrol 93', price: 25.00 },
    { value: 'diesel', label: 'Diesel', price: 24.50 },
  ];

  const paymentMethods = [
    { value: 'wallet', label: 'Wallet', icon: <FaWallet />, available: user?.wallet?.balance > 0 },
    { value: 'card', label: 'Credit/Debit Card', icon: <FaCreditCard />, available: true },
    { value: 'eft', label: 'Instant EFT', icon: <FaCreditCard />, available: true },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Create New Order
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Order fuel for delivery to your location
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Station Selection */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                <FaGasPump className="mr-2" />
                Select Station
              </h2>
            </div>
            <div className="card-body">
              {stationsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {stations?.map((station) => (
                    <div
                      key={station._id}
                      onClick={() => handleStationSelect(station)}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedStation?._id === station._id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                      }`}
                    >
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                        {station.stationName}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                        {station.address.street}, {station.address.city}
                      </p>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-green-600 dark:text-green-400">
                          {station.isOpen ? 'Open' : 'Closed'}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400">
                          ⭐ {station.rating?.toFixed(1) || 'N/A'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {errors.stationId && (
                <p className="form-error mt-2">{errors.stationId.message}</p>
              )}
            </div>
          </div>

          {/* Fuel Selection */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                <FaGasPump className="mr-2" />
                Fuel Details
              </h2>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="form-label">Fuel Type</label>
                  <select
                    {...register('fuelType', { required: 'Please select a fuel type' })}
                    className="form-input"
                  >
                    <option value="">Select fuel type</option>
                    {fuelTypes.map((fuel) => (
                      <option key={fuel.value} value={fuel.value}>
                        {fuel.label} - R{fuel.price}/L
                      </option>
                    ))}
                  </select>
                  {errors.fuelType && (
                    <p className="form-error">{errors.fuelType.message}</p>
                  )}
                </div>

                <div>
                  <label className="form-label">Quantity (Liters)</label>
                  <input
                    type="number"
                    min="5"
                    max="500"
                    step="0.5"
                    {...register('quantity', {
                      required: 'Please enter quantity',
                      min: { value: 5, message: 'Minimum 5 liters' },
                      max: { value: 500, message: 'Maximum 500 liters' },
                    })}
                    className="form-input"
                    placeholder="Enter quantity"
                  />
                  {errors.quantity && (
                    <p className="form-error">{errors.quantity.message}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Delivery Address */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                <FaMapMarkerAlt className="mr-2" />
                Delivery Address
              </h2>
            </div>
            <div className="card-body">
              {userAddresses && userAddresses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {userAddresses.map((address) => (
                    <div
                      key={address._id}
                      onClick={() => handleAddressSelect(address)}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        deliveryAddress?._id === address._id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {address.street}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            {address.city}, {address.province} {address.postalCode}
                          </p>
                        </div>
                        {address.isDefault && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            Default
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FaMapMarkerAlt className="text-4xl text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    No addresses found. Please add a delivery address first.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/user/addresses')}
                    className="btn btn-primary"
                  >
                    Add Address
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Pricing Breakdown */}
          {pricing && (
            <div className="card">
              <div className="card-header">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                  <FaCalculator className="mr-2" />
                  Pricing Breakdown
                </h2>
              </div>
              <div className="card-body">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Fuel Cost</span>
                    <span className="font-medium">R {pricing.fuelTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Delivery Fee</span>
                    <span className="font-medium">R {pricing.deliveryFee.toFixed(2)}</span>
                  </div>
                  {pricing.loadSheddingSurcharge > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300 flex items-center">
                        Load-shedding Surcharge
                        <FaInfoCircle className="ml-1 text-yellow-500" title="Additional charge during load-shedding" />
                      </span>
                      <span className="font-medium text-yellow-600">R {pricing.loadSheddingSurcharge.toFixed(2)}</span>
                    </div>
                  )}
                  {pricing.areaSurcharge > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Area Surcharge</span>
                      <span className="font-medium text-orange-600">R {pricing.areaSurcharge.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">VAT (15%)</span>
                    <span className="font-medium">R {pricing.vat.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Platform Commission</span>
                    <span className="font-medium">R {pricing.platformCommission.toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span>R {pricing.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Payment Method */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                <FaCreditCard className="mr-2" />
                Payment Method
              </h2>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {paymentMethods.map((method) => (
                  <div
                    key={method.value}
                    onClick={() => setValue('paymentMethod', method.value)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      paymentMethod === method.value
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    } ${!method.available ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl text-gray-600 dark:text-gray-300">
                        {method.icon}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {method.label}
                        </h3>
                        {method.value === 'wallet' && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Balance: R {user?.wallet?.balance?.toFixed(2) || '0.00'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {errors.paymentMethod && (
                <p className="form-error mt-2">{errors.paymentMethod.message}</p>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/user/dashboard')}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createOrderMutation.isLoading || isCalculating || !pricing}
              className="btn btn-primary"
            >
              {createOrderMutation.isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating Order...
                </div>
              ) : (
                'Create Order'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateOrder;
