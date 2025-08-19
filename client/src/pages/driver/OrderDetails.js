import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { 
  FaMapMarkerAlt, FaClock, FaUser, FaPhone, FaTruck, 
  FaGasPump, FaCheckCircle, FaTimesCircle, FaArrowLeft,
  FaLocationArrow, FaRoute, FaQrcode, FaCamera
} from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';

const OrderDetails = () => {
  const { orderId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentLocation, setCurrentLocation] = useState(null);

  // Fetch order details
  const { data: order, isLoading: orderLoading } = useQuery(
    ['driver-order', orderId],
    () => axios.get(`/api/drivers/orders/${orderId}`).then(res => res.data),
    { 
      enabled: !!orderId,
      refetchInterval: 5000 // Refresh every 5 seconds
    }
  );

  // Update order status mutation
  const updateStatusMutation = useMutation(
    (status) => axios.patch(`/api/drivers/orders/${orderId}/status`, { status }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['driver-order', orderId]);
        queryClient.invalidateQueries(['driver-current-order', user?.id]);
        toast.success('Order status updated successfully!');
      },
      onError: () => {
        toast.error('Failed to update order status');
      }
    }
  );

  // Update location mutation
  const updateLocationMutation = useMutation(
    (location) => axios.patch('/api/drivers/location', location),
    {
      onSuccess: () => {
        toast.success('Location updated');
      },
      onError: () => {
        toast.error('Failed to update location');
      }
    }
  );

  useEffect(() => {
    // Get current location when component mounts
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            timestamp: new Date().toISOString()
          };
          setCurrentLocation(location);
          updateLocationMutation.mutate(location);
        },
        (error) => {
          console.error('Error getting location:', error);
          toast.error('Unable to get your location');
        }
      );
    }
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'accepted': return 'bg-blue-100 text-blue-800';
      case 'picked_up': return 'bg-yellow-100 text-yellow-800';
      case 'delivering': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getNextAction = (status) => {
    switch (status) {
      case 'accepted':
        return {
          label: 'Pick Up Order',
          action: 'picked_up',
          color: 'bg-blue-600 hover:bg-blue-700'
        };
      case 'picked_up':
        return {
          label: 'Start Delivery',
          action: 'delivering',
          color: 'bg-yellow-600 hover:bg-yellow-700'
        };
      case 'delivering':
        return {
          label: 'Mark Delivered',
          action: 'delivered',
          color: 'bg-green-600 hover:bg-green-700'
        };
      default:
        return null;
    }
  };

  const handleStatusUpdate = (status) => {
    updateStatusMutation.mutate(status);
  };

  const handleCallCustomer = () => {
    if (order?.user?.phone) {
      window.open(`tel:${order.user.phone}`, '_self');
    } else {
      toast.error('Customer phone number not available');
    }
  };

  const handleCallStation = () => {
    if (order?.station?.phone) {
      window.open(`tel:${order.station.phone}`, '_self');
    } else {
      toast.error('Station phone number not available');
    }
  };

  const handleNavigateToStation = () => {
    if (order?.station?.address) {
      const encodedAddress = encodeURIComponent(order.station.address);
      window.open(`https://maps.google.com/?q=${encodedAddress}`, '_blank');
    } else {
      toast.error('Station address not available');
    }
  };

  const handleNavigateToCustomer = () => {
    if (order?.deliveryAddress) {
      const encodedAddress = encodeURIComponent(order.deliveryAddress);
      window.open(`https://maps.google.com/?q=${encodedAddress}`, '_blank');
    } else {
      toast.error('Delivery address not available');
    }
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
            onClick={() => navigate('/driver/dashboard')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const nextAction = getNextAction(order.status);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/driver/dashboard')}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <FaArrowLeft className="text-xl" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Order Details</h1>
                <p className="text-gray-600">Order #{order.orderNumber}</p>
              </div>
            </div>
            <div className="text-right">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                {order.status.replace('_', ' ').toUpperCase()}
              </span>
              <p className="text-lg font-bold text-gray-900 mt-1">
                R{order.driverEarnings.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Order Information */}
          <div className="space-y-6">
            {/* Order Details */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Information</h2>
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
                  <span className="text-gray-600">Total Order Value</span>
                  <span className="font-bold text-gray-900">R{order.totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Your Earnings</span>
                  <span className="font-bold text-green-600">R{order.driverEarnings.toFixed(2)}</span>
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

            {/* Pickup Station */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Pickup Station</h2>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <FaGasPump className="text-green-600 text-xl" />
                  <div>
                    <h3 className="font-semibold text-gray-900">{order.station.name}</h3>
                    <p className="text-gray-600">{order.station.address}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <FaPhone className="text-gray-400" />
                  <span className="text-gray-600">{order.station.phone}</span>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={handleCallStation}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                  >
                    <FaPhone />
                    <span>Call Station</span>
                  </button>
                  <button
                    onClick={handleNavigateToStation}
                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
                  >
                    <FaMapMarkerAlt />
                    <span>Navigate</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Customer Information */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h2>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <FaUser className="text-blue-600 text-xl" />
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {order.user.firstName} {order.user.lastName}
                    </h3>
                    <p className="text-gray-600">{order.user.phone}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <FaMapMarkerAlt className="text-red-500 text-xl mt-1" />
                  <div>
                    <p className="font-medium text-gray-900">{order.deliveryAddress}</p>
                    <p className="text-gray-600">{order.deliveryInstructions || 'No special instructions'}</p>
                  </div>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={handleCallCustomer}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                  >
                    <FaPhone />
                    <span>Call Customer</span>
                  </button>
                  <button
                    onClick={handleNavigateToCustomer}
                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
                  >
                    <FaMapMarkerAlt />
                    <span>Navigate</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Actions & Status */}
          <div className="space-y-6">
            {/* Current Status */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Status</h2>
              <div className="space-y-4">
                <div className="text-center">
                  <div className={`inline-block px-4 py-2 rounded-full text-lg font-medium ${getStatusColor(order.status)}`}>
                    {order.status.replace('_', ' ').toUpperCase()}
                  </div>
                </div>
                
                {nextAction && (
                  <button
                    onClick={() => handleStatusUpdate(nextAction.action)}
                    disabled={updateStatusMutation.isLoading}
                    className={`w-full text-white py-3 px-4 rounded-lg font-medium transition-colors ${nextAction.color}`}
                  >
                    {updateStatusMutation.isLoading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mx-auto"></div>
                    ) : (
                      nextAction.label
                    )}
                  </button>
                )}

                {order.status === 'delivered' && (
                  <div className="text-center py-4">
                    <FaCheckCircle className="text-green-500 text-4xl mx-auto mb-2" />
                    <p className="text-green-600 font-medium">Order completed successfully!</p>
                  </div>
                )}
              </div>
            </div>

            {/* QR Code Scanner */}
            {order.status === 'picked_up' && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Delivery Verification</h2>
                <div className="space-y-4">
                  <div className="text-center">
                    <FaQrcode className="text-gray-400 text-4xl mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">Scan QR code or take photo for delivery verification</p>
                  </div>
                  <div className="flex space-x-3">
                    <button className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2">
                      <FaQrcode />
                      <span>Scan QR</span>
                    </button>
                    <button className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2">
                      <FaCamera />
                      <span>Take Photo</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Location Tracking */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Location Tracking</h2>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <FaLocationArrow className="text-green-600" />
                  <span className="text-gray-600">
                    {currentLocation ? 'Location tracking active' : 'Getting your location...'}
                  </span>
                </div>
                {currentLocation && (
                  <div className="bg-gray-100 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Current Location:</p>
                    <p className="text-sm font-medium text-gray-900">
                      {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
                    </p>
                  </div>
                )}
                <button
                  onClick={() => {
                    if (navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition(
                        (position) => {
                          const location = {
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude,
                            timestamp: new Date().toISOString()
                          };
                          setCurrentLocation(location);
                          updateLocationMutation.mutate(location);
                        },
                        (error) => {
                          toast.error('Unable to get your location');
                        }
                      );
                    }
                  }}
                  disabled={updateLocationMutation.isLoading}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {updateLocationMutation.isLoading ? 'Updating...' : 'Update Location'}
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/driver/orders')}
                  className="w-full flex items-center space-x-3 p-3 text-left rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <FaTruck className="text-blue-600" />
                  <span className="text-gray-700">View All Orders</span>
                </button>
                <button
                  onClick={() => navigate('/driver/earnings')}
                  className="w-full flex items-center space-x-3 p-3 text-left rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <FaCheckCircle className="text-green-600" />
                  <span className="text-gray-700">View Earnings</span>
                </button>
                <button
                  onClick={() => navigate('/driver/profile')}
                  className="w-full flex items-center space-x-3 p-3 text-left rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <FaUser className="text-purple-600" />
                  <span className="text-gray-700">Profile Settings</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;
