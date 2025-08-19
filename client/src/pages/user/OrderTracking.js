import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { 
  FaMapMarkerAlt, FaClock, FaUser, FaPhone, FaTruck, 
  FaGasPump, FaCheckCircle, FaTimesCircle, FaArrowLeft,
  FaLocationArrow, FaRoute, FaStar
} from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { useQuery, useMutation } from 'react-query';
import axios from 'axios';

const OrderTracking = () => {
  const { orderId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [driverLocation, setDriverLocation] = useState(null);
  const [estimatedTime, setEstimatedTime] = useState(null);

  // Fetch order details
  const { data: order, isLoading: orderLoading } = useQuery(
    ['order', orderId],
    () => axios.get(`/api/orders/${orderId}`).then(res => res.data),
    { 
      enabled: !!orderId,
      refetchInterval: 5000 // Refresh every 5 seconds for real-time updates
    }
  );

  // Fetch driver location (if driver is assigned)
  const { data: driverLocationData } = useQuery(
    ['driver-location', order?.driver?._id],
    () => axios.get(`/api/drivers/${order?.driver?._id}/location`).then(res => res.data),
    { 
      enabled: !!order?.driver?._id,
      refetchInterval: 3000 // Refresh every 3 seconds for location updates
    }
  );

  // Rate driver mutation
  const rateDriverMutation = useMutation(
    ({ rating, comment }) => axios.post(`/api/orders/${orderId}/rate`, { rating, comment }),
    {
      onSuccess: () => {
        toast.success('Thank you for your rating!');
        navigate('/user/orders');
      },
      onError: () => {
        toast.error('Failed to submit rating');
      }
    }
  );

  useEffect(() => {
    if (driverLocationData) {
      setDriverLocation(driverLocationData);
    }
  }, [driverLocationData]);

  useEffect(() => {
    if (order?.estimatedDeliveryTime) {
      const now = new Date();
      const deliveryTime = new Date(order.estimatedDeliveryTime);
      const diff = deliveryTime - now;
      
      if (diff > 0) {
        const minutes = Math.floor(diff / 60000);
        setEstimatedTime(minutes);
      } else {
        setEstimatedTime(0);
      }
    }
  }, [order?.estimatedDeliveryTime]);

  const getStatusStep = (status) => {
    const steps = [
      { key: 'pending', label: 'Order Placed', icon: FaClock },
      { key: 'confirmed', label: 'Order Confirmed', icon: FaCheckCircle },
      { key: 'preparing', label: 'Preparing', icon: FaGasPump },
      { key: 'ready', label: 'Ready for Pickup', icon: FaTruck },
      { key: 'picked_up', label: 'Picked Up', icon: FaLocationArrow },
      { key: 'delivering', label: 'On the Way', icon: FaRoute },
      { key: 'delivered', label: 'Delivered', icon: FaCheckCircle }
    ];

    const currentIndex = steps.findIndex(step => step.key === status);
    return { steps, currentIndex };
  };

  const getStatusColor = (status, isActive, isCompleted) => {
    if (isCompleted) return 'text-green-600 bg-green-100';
    if (isActive) return 'text-blue-600 bg-blue-100';
    return 'text-gray-400 bg-gray-100';
  };

  const handleRateDriver = (rating, comment) => {
    rateDriverMutation.mutate({ rating, comment });
  };

  if (orderLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FaTimesCircle className="text-red-500 text-4xl mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Order Not Found</h2>
          <p className="text-gray-600 mb-4">The order you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/user/orders')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Orders
          </button>
        </div>
      </div>
    );
  }

  const { steps, currentIndex } = getStatusStep(order.status);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/user/orders')}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <FaArrowLeft className="text-xl" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Order Tracking</h1>
                <p className="text-gray-600">Order #{order.orderNumber}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-gray-900">
                R{order.totalAmount.toFixed(2)}
              </p>
              <p className="text-sm text-gray-600">{order.fuelType} - {order.quantity}L</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Order Status Timeline */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Order Progress</h2>
          <div className="relative">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isActive = index === currentIndex;
                const isCompleted = index < currentIndex;
                const isUpcoming = index > currentIndex;

                return (
                  <div key={step.key} className="flex flex-col items-center relative">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${getStatusColor(step.key, isActive, isCompleted)}`}>
                      <Icon className="text-xl" />
                    </div>
                    <p className={`text-sm font-medium mt-2 ${isCompleted ? 'text-green-600' : isActive ? 'text-blue-600' : 'text-gray-400'}`}>
                      {step.label}
                    </p>
                    {index < steps.length - 1 && (
                      <div className={`absolute top-6 left-12 w-full h-0.5 ${isCompleted ? 'bg-green-600' : 'bg-gray-200'}`}></div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Order Details */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Details</h2>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Order Number</span>
                  <span className="font-medium text-gray-900">#{order.orderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Fuel Type</span>
                  <span className="font-medium text-gray-900">{order.fuelType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Quantity</span>
                  <span className="font-medium text-gray-900">{order.quantity}L</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Amount</span>
                  <span className="font-bold text-gray-900">R{order.totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Order Date</span>
                  <span className="font-medium text-gray-900">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Order Time</span>
                  <span className="font-medium text-gray-900">
                    {new Date(order.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Delivery Address */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Delivery Address</h2>
              <div className="flex items-start space-x-3">
                <FaMapMarkerAlt className="text-red-500 text-xl mt-1" />
                <div>
                  <p className="font-medium text-gray-900">{order.deliveryAddress}</p>
                  <p className="text-gray-600">{order.deliveryInstructions || 'No special instructions'}</p>
                </div>
              </div>
            </div>

            {/* Station Info */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Pickup Station</h2>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <FaGasPump className="text-green-600" />
                  <div>
                    <p className="font-medium text-gray-900">{order.station.name}</p>
                    <p className="text-gray-600">{order.station.address}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <FaPhone className="text-gray-400" />
                  <span className="text-gray-600">{order.station.phone}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Driver Info & Tracking */}
          <div className="space-y-6">
            {order.driver ? (
              <>
                {/* Driver Information */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Driver</h2>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                        <FaUser className="text-blue-600 text-2xl" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {order.driver.firstName} {order.driver.lastName}
                        </h3>
                        <p className="text-gray-600">{order.driver.vehicle.make} {order.driver.vehicle.model}</p>
                        <p className="text-gray-600">{order.driver.vehicle.licensePlate}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <FaStar className="text-yellow-500" />
                      <span className="font-medium text-gray-900">
                        {order.driver.rating?.toFixed(1) || 'N/A'}
                      </span>
                      <span className="text-gray-600">({order.driver.totalDeliveries || 0} deliveries)</span>
                    </div>
                    <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2">
                      <FaPhone />
                      <span>Call Driver</span>
                    </button>
                  </div>
                </div>

                {/* Estimated Delivery */}
                {estimatedTime !== null && (
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Estimated Delivery</h2>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600 mb-2">
                        {estimatedTime > 0 ? `${estimatedTime} min` : 'Arriving soon'}
                      </div>
                      <p className="text-gray-600">
                        {order.estimatedDeliveryTime ? 
                          `Expected by ${new Date(order.estimatedDeliveryTime).toLocaleTimeString()}` :
                          'Time will be updated soon'
                        }
                      </p>
                    </div>
                  </div>
                )}

                {/* Driver Location (if available) */}
                {driverLocation && (
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Driver Location</h2>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <FaLocationArrow className="text-green-600" />
                        <span className="text-gray-600">Driver is on the way</span>
                      </div>
                      <div className="bg-gray-100 rounded-lg p-4 text-center">
                        <p className="text-sm text-gray-600">Live tracking coming soon</p>
                        <p className="text-xs text-gray-500 mt-1">Map integration will be available in the next update</p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Driver Assignment</h2>
                <div className="text-center py-8">
                  <FaTruck className="text-gray-300 text-4xl mx-auto mb-4" />
                  <p className="text-gray-600">Waiting for driver assignment</p>
                  <p className="text-sm text-gray-500 mt-2">A driver will be assigned soon</p>
                </div>
              </div>
            )}

            {/* Rate Driver (if order is completed) */}
            {order.status === 'delivered' && !order.rating && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Rate Your Experience</h2>
                <div className="space-y-4">
                  <div className="flex justify-center space-x-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => handleRateDriver(star, '')}
                        className="text-2xl text-yellow-400 hover:text-yellow-500 transition-colors"
                      >
                        <FaStar />
                      </button>
                    ))}
                  </div>
                  <p className="text-center text-gray-600">Tap to rate your delivery experience</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderTracking;
