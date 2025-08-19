import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { FaTruck, FaWallet, FaClock, FaMapMarkerAlt, FaCheck, FaTimes, FaPlay, FaPause } from 'react-icons/fa';

const DriverDashboard = () => {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading driver data
    setTimeout(() => {
      setRecentOrders([
        {
          id: '1',
          orderNumber: 'WF-2024-001',
          customerName: 'John Doe',
          fuelType: 'Petrol 95',
          quantity: '50L',
          earnings: 'R 125.00',
          status: 'completed',
          date: '2024-01-15',
          time: '14:30',
          address: '123 Main St, Johannesburg'
        },
        {
          id: '2',
          orderNumber: 'WF-2024-002',
          customerName: 'Jane Smith',
          fuelType: 'Diesel',
          quantity: '30L',
          earnings: 'R 75.00',
          status: 'in_progress',
          date: '2024-01-16',
          time: '09:15',
          address: '456 Oak Ave, Sandton'
        }
      ]);
      setIsLoading(false);
    }, 1000);
  }, []);

  const toggleOnlineStatus = () => {
    setIsOnline(!isOnline);
    // Here you would typically make an API call to update driver status
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'in_progress':
        return 'In Progress';
      case 'pending':
        return 'Pending';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Welcome back, {user?.firstName || 'Driver'}!
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Manage your deliveries and earnings
              </p>
            </div>
            <button
              onClick={toggleOnlineStatus}
              className={`btn flex items-center space-x-2 ${
                isOnline 
                  ? 'btn-success' 
                  : 'btn-secondary'
              }`}
            >
              {isOnline ? (
                <>
                  <FaPlay className="text-sm" />
                  <span>Online</span>
                </>
              ) : (
                <>
                  <FaPause className="text-sm" />
                  <span>Offline</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="card-body">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
                  <FaWallet className="text-2xl text-green-600 dark:text-green-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Today's Earnings
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    R {user?.todayEarnings?.toFixed(2) || '0.00'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900">
                  <FaTruck className="text-2xl text-blue-600 dark:text-blue-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total Deliveries
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {user?.totalDeliveries || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900">
                  <FaClock className="text-2xl text-purple-600 dark:text-purple-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Online Hours
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {user?.onlineHours || 0}h
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900">
                  <FaCheck className="text-2xl text-yellow-600 dark:text-yellow-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Rating
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {user?.rating?.toFixed(1) || '0.0'} ⭐
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Current Order */}
        {currentOrder && (
          <div className="card mb-8 border-l-4 border-blue-500">
            <div className="card-header">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <FaTruck className="text-xl text-blue-600 mr-3" />
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Current Order
                  </h2>
                </div>
                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  Active
                </span>
              </div>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Order Number
                  </p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {currentOrder.orderNumber}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Customer
                  </p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {currentOrder.customerName}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Earnings
                  </p>
                  <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                    {currentOrder.earnings}
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Delivery Address
                </p>
                <p className="text-gray-900 dark:text-white flex items-center">
                  <FaMapMarkerAlt className="mr-2 text-red-500" />
                  {currentOrder.address}
                </p>
              </div>
              <div className="mt-4 flex space-x-3">
                <button className="btn btn-success">
                  <FaCheck className="mr-2" />
                  Mark Delivered
                </button>
                <button className="btn btn-error">
                  <FaTimes className="mr-2" />
                  Report Issue
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Link
            to="/driver/orders"
            className="card hover:shadow-lg transition-shadow cursor-pointer"
          >
            <div className="card-body text-center">
              <FaTruck className="text-3xl text-blue-600 dark:text-blue-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                View Orders
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                See available and assigned orders
              </p>
            </div>
          </Link>

          <Link
            to="/driver/earnings"
            className="card hover:shadow-lg transition-shadow cursor-pointer"
          >
            <div className="card-body text-center">
              <FaWallet className="text-3xl text-green-600 dark:text-green-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Earnings
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                View detailed earnings and withdrawals
              </p>
            </div>
          </Link>

          <Link
            to="/driver/schedule"
            className="card hover:shadow-lg transition-shadow cursor-pointer"
          >
            <div className="card-body text-center">
              <FaClock className="text-3xl text-purple-600 dark:text-purple-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Schedule
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Manage your availability and shifts
              </p>
            </div>
          </Link>

          <Link
            to="/driver/profile"
            className="card hover:shadow-lg transition-shadow cursor-pointer"
          >
            <div className="card-body text-center">
              <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-3 flex items-center justify-center">
                <span className="text-lg font-semibold text-gray-600 dark:text-gray-300">
                  {user?.firstName?.charAt(0) || 'D'}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Profile
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Update your information and documents
              </p>
            </div>
          </Link>
        </div>

        {/* Recent Orders */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <FaClock className="text-xl text-gray-600 dark:text-gray-400 mr-3" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Recent Deliveries
                </h2>
              </div>
              <Link
                to="/driver/orders"
                className="text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
              >
                View All
              </Link>
            </div>
          </div>
          <div className="card-body">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : recentOrders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Order
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Fuel Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Earnings
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {recentOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link
                            to={`/driver/orders/${order.id}`}
                            className="text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                          >
                            {order.orderNumber}
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {order.customerName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {order.fuelType}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600 dark:text-green-400">
                          {order.earnings}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                            {getStatusText(order.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex items-center">
                            <FaClock className="mr-1" />
                            {order.date} {order.time}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <FaTruck className="text-4xl text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  No deliveries yet. Go online to start receiving orders!
                </p>
                <button
                  onClick={toggleOnlineStatus}
                  className="btn btn-primary mt-4"
                >
                  Go Online
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriverDashboard;
