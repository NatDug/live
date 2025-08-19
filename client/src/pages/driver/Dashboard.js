import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { toast } from 'react-hot-toast';
import { 
  FaTruck, FaMapMarkerAlt, FaClock, FaMoneyBillWave, 
  FaCheckCircle, FaTimesCircle, FaPlay, FaPause,
  FaHistory, FaChartLine, FaBell, FaCog
} from 'react-icons/fa';
import axios from 'axios';

const DriverDashboard = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isOnline, setIsOnline] = useState(false);

  // Fetch current order
  const { data: currentOrder, isLoading: currentOrderLoading } = useQuery(
    ['driverCurrentOrder', user?.id],
    () => axios.get('/api/drivers/orders/current').then(res => res.data),
    { refetchInterval: 5000 } // Refresh every 5 seconds
  );

  // Fetch available orders
  const { data: availableOrders, isLoading: availableOrdersLoading } = useQuery(
    ['driverAvailableOrders', user?.id],
    () => axios.get('/api/drivers/orders/available').then(res => res.data),
    { refetchInterval: 10000 } // Refresh every 10 seconds
  );

  // Fetch driver stats
  const { data: stats, isLoading: statsLoading } = useQuery(
    ['driverStats', user?.id],
    () => axios.get('/api/drivers/stats').then(res => res.data)
  );

  // Fetch earnings
  const { data: earnings, isLoading: earningsLoading } = useQuery(
    ['driverEarnings', user?.id],
    () => axios.get('/api/drivers/earnings').then(res => res.data)
  );

  // Status toggle mutation
  const toggleStatusMutation = useMutation(
    (status) => axios.patch('/api/drivers/status', { status }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['driverStats']);
        toast.success(`Status updated to ${isOnline ? 'online' : 'offline'}`);
      },
      onError: (error) => {
        toast.error('Failed to update status');
      }
    }
  );

  // Accept order mutation
  const acceptOrderMutation = useMutation(
    (orderId) => axios.post(`/api/drivers/orders/${orderId}/accept`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['driverCurrentOrder']);
        queryClient.invalidateQueries(['driverAvailableOrders']);
        toast.success('Order accepted successfully!');
      },
      onError: (error) => {
        toast.error('Failed to accept order');
      }
    }
  );

  // Update order status mutation
  const updateOrderStatusMutation = useMutation(
    ({ orderId, status }) => axios.patch(`/api/drivers/orders/${orderId}/status`, { status }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['driverCurrentOrder']);
        toast.success('Order status updated!');
      },
      onError: (error) => {
        toast.error('Failed to update order status');
      }
    }
  );

  const handleStatusToggle = () => {
    const newStatus = isOnline ? 'offline' : 'online';
    setIsOnline(!isOnline);
    toggleStatusMutation.mutate(newStatus);
  };

  const handleAcceptOrder = (orderId) => {
    acceptOrderMutation.mutate(orderId);
  };

  const handleUpdateOrderStatus = (orderId, status) => {
    updateOrderStatusMutation.mutate({ orderId, status });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(amount);
  };

  const formatDistance = (distance) => {
    return `${distance.toFixed(1)} km`;
  };

  if (statsLoading || earningsLoading) {
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
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Driver Dashboard</h1>
              <p className="text-gray-600">Welcome back, {user?.firstName}!</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleStatusToggle}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  isOnline 
                    ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                    : 'bg-red-100 text-red-800 hover:bg-red-200'
                }`}
              >
                {isOnline ? (
                  <>
                    <FaPlay className="inline mr-2" />
                    Online
                  </>
                ) : (
                  <>
                    <FaPause className="inline mr-2" />
                    Offline
                  </>
                )}
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-600">
                <FaBell className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-600">
                <FaCog className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FaMoneyBillWave className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Today's Earnings</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(earnings?.today || 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <FaCheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completed Orders</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.completedOrders || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <FaTruck className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Distance</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatDistance(stats?.totalDistance || 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FaChartLine className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Rating</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.rating ? `${stats.rating.toFixed(1)} ⭐` : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Current Order */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Current Order</h2>
            </div>
            <div className="p-6">
              {currentOrderLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : currentOrder ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500">Order #{currentOrder.orderNumber}</span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      currentOrder.status === 'accepted' ? 'bg-blue-100 text-blue-800' :
                      currentOrder.status === 'picked_up' ? 'bg-yellow-100 text-yellow-800' :
                      currentOrder.status === 'delivering' ? 'bg-purple-100 text-purple-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {currentOrder.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center">
                      <FaMapMarkerAlt className="w-4 h-4 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Pickup Location</p>
                        <p className="text-sm text-gray-600">{currentOrder.station.name}</p>
                        <p className="text-sm text-gray-500">{currentOrder.station.address}</p>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <FaMapMarkerAlt className="w-4 h-4 text-red-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Delivery Location</p>
                        <p className="text-sm text-gray-600">{currentOrder.deliveryAddress}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                      <div>
                        <p className="text-sm text-gray-600">Order Value</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {formatCurrency(currentOrder.totalAmount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Your Earnings</p>
                        <p className="text-lg font-semibold text-green-600">
                          {formatCurrency(currentOrder.driverEarnings)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-3 pt-4">
                    {currentOrder.status === 'accepted' && (
                      <button
                        onClick={() => handleUpdateOrderStatus(currentOrder._id, 'picked_up')}
                        className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Pick Up Order
                      </button>
                    )}
                    {currentOrder.status === 'picked_up' && (
                      <button
                        onClick={() => handleUpdateOrderStatus(currentOrder._id, 'delivering')}
                        className="flex-1 bg-yellow-600 text-white py-2 px-4 rounded-lg hover:bg-yellow-700 transition-colors"
                      >
                        Start Delivery
                      </button>
                    )}
                    {currentOrder.status === 'delivering' && (
                      <button
                        onClick={() => handleUpdateOrderStatus(currentOrder._id, 'delivered')}
                        className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Mark Delivered
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <FaTruck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No active orders</p>
                  <p className="text-sm text-gray-400">You'll see your current order here</p>
                </div>
              )}
            </div>
          </div>

          {/* Available Orders */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Available Orders</h2>
            </div>
            <div className="p-6">
              {availableOrdersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : availableOrders && availableOrders.length > 0 ? (
                <div className="space-y-4">
                  {availableOrders.map((order) => (
                    <div key={order._id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-gray-900">
                          Order #{order.orderNumber}
                        </span>
                        <span className="text-sm font-semibold text-green-600">
                          {formatCurrency(order.driverEarnings)}
                        </span>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center text-sm">
                          <FaMapMarkerAlt className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-gray-600">
                            {order.station.name} → {order.deliveryAddress}
                          </span>
                        </div>
                        <div className="flex items-center text-sm">
                          <FaClock className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-gray-600">
                            {formatDistance(order.distance)} • {order.fuelQuantity}L {order.fuelType}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleAcceptOrder(order._id)}
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Accept Order
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FaTimesCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No available orders</p>
                  <p className="text-sm text-gray-400">Check back later for new orders</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Earnings */}
        <div className="mt-8 bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Earnings</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">This Week</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(earnings?.thisWeek || 0)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">This Month</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(earnings?.thisMonth || 0)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(earnings?.total || 0)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriverDashboard;
