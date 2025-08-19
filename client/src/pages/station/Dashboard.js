import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { 
  FaGasPump, FaMapMarkerAlt, FaClock, FaMoneyBillWave, 
  FaUser, FaCheckCircle, FaTimesCircle, FaPlay, FaPause,
  FaHistory, FaChartLine, FaCog, FaBox, FaThermometerHalf
} from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';

const StationDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  // Fetch station data
  const { data: station, isLoading: stationLoading } = useQuery(
    ['station', user?.id],
    () => axios.get('/api/stations/profile').then(res => res.data),
    { enabled: !!user?.id }
  );

  // Fetch current orders
  const { data: currentOrders, isLoading: ordersLoading } = useQuery(
    ['station-orders', user?.id],
    () => axios.get('/api/stations/orders').then(res => res.data),
    { enabled: !!user?.id, refetchInterval: 10000 }
  );

  // Fetch earnings
  const { data: earnings, isLoading: earningsLoading } = useQuery(
    ['station-earnings', user?.id],
    () => axios.get('/api/stations/earnings').then(res => res.data),
    { enabled: !!user?.id }
  );

  // Fetch stats
  const { data: stats, isLoading: statsLoading } = useQuery(
    ['station-stats', user?.id],
    () => axios.get('/api/stations/stats').then(res => res.data),
    { enabled: !!user?.id }
  );

  // Status mutation
  const statusMutation = useMutation(
    (status) => axios.patch('/api/stations/status', { status }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['station', user?.id]);
        toast.success(`Station status updated to ${isOpen ? 'Open' : 'Closed'}`);
      },
      onError: () => {
        toast.error('Failed to update station status');
        setIsOpen(!isOpen); // Revert state
      }
    }
  );

  // Update order status mutation
  const updateOrderStatusMutation = useMutation(
    ({ orderId, status }) => axios.patch(`/api/stations/orders/${orderId}/status`, { status }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['station-orders', user?.id]);
        toast.success('Order status updated successfully!');
      },
      onError: () => {
        toast.error('Failed to update order status');
      }
    }
  );

  const handleStatusToggle = () => {
    const newStatus = !isOpen;
    setIsOpen(newStatus);
    statusMutation.mutate(newStatus ? 'open' : 'closed');
  };

  const handleUpdateOrderStatus = (orderId, status) => {
    updateOrderStatusMutation.mutate({ orderId, status });
  };

  const handleViewOrder = (orderId) => {
    navigate(`/station/order/${orderId}`);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'preparing': return 'bg-purple-100 text-purple-800';
      case 'ready': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (stationLoading) {
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
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <FaGasPump className="text-green-600 text-xl" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Station Dashboard</h1>
                <p className="text-gray-600">Welcome back, {station?.name}!</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/station/profile')}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <FaUser className="text-xl" />
              </button>
              <button
                onClick={() => navigate('/station/settings')}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <FaCog className="text-xl" />
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
              <h2 className="text-lg font-semibold text-gray-900">Station Status</h2>
              <p className="text-gray-600">
                {isOpen ? 'Your station is currently open and accepting orders' : 'Your station is currently closed'}
              </p>
            </div>
            <button
              onClick={handleStatusToggle}
              disabled={statusMutation.isLoading}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                isOpen
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {statusMutation.isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  {isOpen ? <FaPause className="inline mr-2" /> : <FaPlay className="inline mr-2" />}
                  {isOpen ? 'Close Station' : 'Open Station'}
                </>
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Current Orders */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Current Orders</h2>
                <button
                  onClick={() => navigate('/station/orders')}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  View All
                </button>
              </div>

              {ordersLoading ? (
                <div className="animate-pulse space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-24 bg-gray-200 rounded"></div>
                  ))}
                </div>
              ) : currentOrders?.length > 0 ? (
                <div className="space-y-4">
                  {currentOrders.slice(0, 5).map((order) => (
                    <div key={order._id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <FaGasPump className="text-green-600" />
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {order.fuelType} - {order.quantity}L
                            </h3>
                            <p className="text-gray-600">Order #{order.orderNumber}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                            {order.status}
                          </span>
                          <p className="text-lg font-bold text-gray-900 mt-1">
                            R{order.totalAmount.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center space-x-3">
                          <FaMapMarkerAlt className="text-gray-400" />
                          <span className="text-gray-600">{order.deliveryAddress}</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <FaClock className="text-gray-400" />
                          <span className="text-gray-600">
                            {new Date(order.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex space-x-3">
                        <button
                          onClick={() => handleViewOrder(order._id)}
                          className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          View Details
                        </button>
                        {order.status === 'confirmed' && (
                          <button
                            onClick={() => handleUpdateOrderStatus(order._id, 'preparing')}
                            disabled={updateOrderStatusMutation.isLoading}
                            className="flex-1 bg-yellow-600 text-white py-2 px-4 rounded-lg hover:bg-yellow-700 transition-colors"
                          >
                            Start Preparing
                          </button>
                        )}
                        {order.status === 'preparing' && (
                          <button
                            onClick={() => handleUpdateOrderStatus(order._id, 'ready')}
                            disabled={updateOrderStatusMutation.isLoading}
                            className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
                          >
                            Mark Ready
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FaGasPump className="text-gray-300 text-4xl mx-auto mb-4" />
                  <p className="text-gray-600">No current orders</p>
                  {!isOpen && (
                    <p className="text-sm text-gray-500 mt-2">Open your station to receive orders</p>
                  )}
                </div>
              )}
            </div>

            {/* Fuel Inventory */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Fuel Inventory</h2>
              {station?.fuelInventory ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.entries(station.fuelInventory).map(([fuelType, data]) => (
                    <div key={fuelType} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-900 capitalize">{fuelType}</h3>
                        <FaThermometerHalf className="text-blue-600" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Price</span>
                          <span className="font-medium text-gray-900">R{data.price.toFixed(2)}/L</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Available</span>
                          <span className="font-medium text-gray-900">{data.available}L</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${(data.available / data.capacity) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600 text-center py-4">No fuel inventory data available</p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Today's Stats</h2>
              {statsLoading ? (
                <div className="animate-pulse space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-12 bg-gray-200 rounded"></div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <FaMoneyBillWave className="text-green-600" />
                      <span className="text-gray-600">Revenue</span>
                    </div>
                    <span className="font-semibold text-gray-900">
                      R{stats?.todayRevenue?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <FaBox className="text-blue-600" />
                      <span className="text-gray-600">Orders</span>
                    </div>
                    <span className="font-semibold text-gray-900">
                      {stats?.todayOrders || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <FaCheckCircle className="text-green-600" />
                      <span className="text-gray-600">Completed</span>
                    </div>
                    <span className="font-semibold text-gray-900">
                      {stats?.todayCompleted || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <FaClock className="text-yellow-600" />
                      <span className="text-gray-600">Pending</span>
                    </div>
                    <span className="font-semibold text-gray-900">
                      {stats?.todayPending || 0}
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
                  onClick={() => navigate('/station/orders')}
                  className="w-full flex items-center space-x-3 p-3 text-left rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <FaHistory className="text-blue-600" />
                  <span className="text-gray-700">All Orders</span>
                </button>
                <button
                  onClick={() => navigate('/station/earnings')}
                  className="w-full flex items-center space-x-3 p-3 text-left rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <FaChartLine className="text-green-600" />
                  <span className="text-gray-700">Earnings Report</span>
                </button>
                <button
                  onClick={() => navigate('/station/inventory')}
                  className="w-full flex items-center space-x-3 p-3 text-left rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <FaBox className="text-purple-600" />
                  <span className="text-gray-700">Manage Inventory</span>
                </button>
                <button
                  onClick={() => navigate('/station/profile')}
                  className="w-full flex items-center space-x-3 p-3 text-left rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <FaUser className="text-orange-600" />
                  <span className="text-gray-700">Profile Settings</span>
                </button>
              </div>
            </div>

            {/* Station Info */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Station Info</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Address</p>
                  <p className="font-medium text-gray-900">{station?.address}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="font-medium text-gray-900">{station?.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Rating</p>
                  <div className="flex items-center space-x-1">
                    <span className="font-medium text-gray-900">{station?.rating?.toFixed(1) || 'N/A'}</span>
                    <span className="text-yellow-500">★</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <span className={`inline-block px-2 py-1 rounded-full text-sm font-medium ${
                    station?.status === 'open' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {station?.status || 'Unknown'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StationDashboard;
