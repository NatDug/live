import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { 
  FaTruck, FaMapMarkerAlt, FaClock, FaMoneyBillWave, 
  FaUser, FaGasPump, FaCheckCircle, FaTimesCircle,
  FaPlay, FaPause, FaHistory, FaWallet, FaChartLine
} from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';

const DriverDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isOnline, setIsOnline] = useState(false);

  // Fetch driver data
  const { data: driver, isLoading: driverLoading } = useQuery(
    ['driver', user?.id],
    () => axios.get('/api/drivers/profile').then(res => res.data),
    { enabled: !!user?.id }
  );

  // Fetch current order
  const { data: currentOrder, isLoading: orderLoading } = useQuery(
    ['driver-current-order', user?.id],
    () => axios.get('/api/drivers/orders/current').then(res => res.data),
    { enabled: !!user?.id, refetchInterval: 5000 }
  );

  // Fetch available orders
  const { data: availableOrders, isLoading: availableLoading } = useQuery(
    ['driver-available-orders'],
    () => axios.get('/api/drivers/orders/available').then(res => res.data),
    { enabled: isOnline, refetchInterval: 10000 }
  );

  // Fetch earnings
  const { data: earnings, isLoading: earningsLoading } = useQuery(
    ['driver-earnings', user?.id],
    () => axios.get('/api/drivers/earnings').then(res => res.data),
    { enabled: !!user?.id }
  );

  // Status mutation
  const statusMutation = useMutation(
    (status) => axios.patch('/api/drivers/status', { status }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['driver', user?.id]);
        toast.success(`Status updated to ${isOnline ? 'Online' : 'Offline'}`);
      },
      onError: () => {
        toast.error('Failed to update status');
        setIsOnline(!isOnline); // Revert state
      }
    }
  );

  // Accept order mutation
  const acceptOrderMutation = useMutation(
    (orderId) => axios.post(`/api/drivers/orders/${orderId}/accept`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['driver-current-order', user?.id]);
        queryClient.invalidateQueries(['driver-available-orders']);
        toast.success('Order accepted successfully!');
      },
      onError: () => {
        toast.error('Failed to accept order');
      }
    }
  );

  const handleStatusToggle = () => {
    const newStatus = !isOnline;
    setIsOnline(newStatus);
    statusMutation.mutate(newStatus ? 'online' : 'offline');
  };

  const handleAcceptOrder = (orderId) => {
    acceptOrderMutation.mutate(orderId);
  };

  const handleViewOrder = (orderId) => {
    navigate(`/driver/order/${orderId}`);
  };

  if (driverLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <FaTruck className="text-blue-600 text-xl" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Driver Dashboard</h1>
                <p className="text-gray-600">Welcome back, {driver?.firstName}!</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/driver/profile')}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <FaUser className="text-xl" />
              </button>
              <button
                onClick={() => navigate('/driver/wallet')}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <FaWallet className="text-xl" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Toggle */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Driver Status</h2>
              <p className="text-gray-600">
                {isOnline ? 'You are currently online and receiving orders' : 'You are currently offline'}
              </p>
            </div>
            <button
              onClick={handleStatusToggle}
              disabled={statusMutation.isLoading}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                isOnline
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {statusMutation.isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  {isOnline ? <FaPause className="inline mr-2" /> : <FaPlay className="inline mr-2" />}
                  {isOnline ? 'Go Offline' : 'Go Online'}
                </>
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Current Order */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Current Order</h2>
                {currentOrder && (
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                    {currentOrder.status}
                  </span>
                )}
              </div>

              {orderLoading ? (
                <div className="animate-pulse">
                  <div className="h-32 bg-gray-200 rounded"></div>
                </div>
              ) : currentOrder ? (
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <FaGasPump className="text-green-600 text-xl" />
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {currentOrder.fuelType} - {currentOrder.quantity}L
                        </h3>
                        <p className="text-gray-600">Order #{currentOrder.orderNumber}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">
                        R{currentOrder.totalAmount.toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-600">Earnings: R{currentOrder.driverEarnings.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <FaMapMarkerAlt className="text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">Delivery Address</p>
                        <p className="text-gray-600">{currentOrder.deliveryAddress}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <FaClock className="text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">Pickup Station</p>
                        <p className="text-gray-600">{currentOrder.station.name}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex space-x-3">
                    <button
                      onClick={() => handleViewOrder(currentOrder._id)}
                      className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => navigate(`/driver/order/${currentOrder._id}/track`)}
                      className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Track Order
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <FaTruck className="text-gray-300 text-4xl mx-auto mb-4" />
                  <p className="text-gray-600">No active orders</p>
                  {!isOnline && (
                    <p className="text-sm text-gray-500 mt-2">Go online to receive orders</p>
                  )}
                </div>
              )}
            </div>

            {/* Available Orders */}
            {isOnline && (
              <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Orders</h2>
                {availableLoading ? (
                  <div className="animate-pulse space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-20 bg-gray-200 rounded"></div>
                    ))}
                  </div>
                ) : availableOrders?.length > 0 ? (
                  <div className="space-y-4">
                    {availableOrders.slice(0, 5).map((order) => (
                      <div key={order._id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {order.fuelType} - {order.quantity}L
                            </h3>
                            <p className="text-gray-600">{order.deliveryAddress}</p>
                            <p className="text-sm text-gray-500">Distance: {order.distance}km</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-gray-900">
                              R{order.driverEarnings.toFixed(2)}
                            </p>
                            <button
                              onClick={() => handleAcceptOrder(order._id)}
                              disabled={acceptOrderMutation.isLoading}
                              className="mt-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                            >
                              Accept
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 text-center py-4">No available orders at the moment</p>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Today's Stats</h2>
              {earningsLoading ? (
                <div className="animate-pulse space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 bg-gray-200 rounded"></div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <FaMoneyBillWave className="text-green-600" />
                      <span className="text-gray-600">Earnings</span>
                    </div>
                    <span className="font-semibold text-gray-900">
                      R{earnings?.today?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <FaCheckCircle className="text-blue-600" />
                      <span className="text-gray-600">Completed</span>
                    </div>
                    <span className="font-semibold text-gray-900">
                      {earnings?.completedOrders || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <FaClock className="text-yellow-600" />
                      <span className="text-gray-600">Active</span>
                    </div>
                    <span className="font-semibold text-gray-900">
                      {earnings?.activeOrders || 0}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/driver/orders')}
                  className="w-full flex items-center space-x-3 p-3 text-left rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <FaHistory className="text-blue-600" />
                  <span className="text-gray-700">Order History</span>
                </button>
                <button
                  onClick={() => navigate('/driver/earnings')}
                  className="w-full flex items-center space-x-3 p-3 text-left rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <FaChartLine className="text-green-600" />
                  <span className="text-gray-700">Earnings Report</span>
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

            {/* Driver Info */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Driver Info</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Vehicle</p>
                  <p className="font-medium text-gray-900">{driver?.vehicle?.make} {driver?.vehicle?.model}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">License Plate</p>
                  <p className="font-medium text-gray-900">{driver?.vehicle?.licensePlate}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Rating</p>
                  <div className="flex items-center space-x-1">
                    <span className="font-medium text-gray-900">{driver?.rating?.toFixed(1) || 'N/A'}</span>
                    <span className="text-yellow-500">★</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriverDashboard;
