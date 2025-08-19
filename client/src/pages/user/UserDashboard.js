import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { FaGasPump, FaWallet, FaHistory, FaMapMarkerAlt, FaClock, FaPlus } from 'react-icons/fa';

const UserDashboard = () => {
  const { user } = useAuth();
  const [recentOrders, setRecentOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading recent orders
    setTimeout(() => {
      setRecentOrders([
        {
          id: '1',
          orderNumber: 'WF-2024-001',
          fuelType: 'Petrol 95',
          quantity: '50L',
          total: 'R 1,250.00',
          status: 'delivered',
          date: '2024-01-15',
          time: '14:30'
        },
        {
          id: '2',
          orderNumber: 'WF-2024-002',
          fuelType: 'Diesel',
          quantity: '30L',
          total: 'R 750.00',
          status: 'in_progress',
          date: '2024-01-16',
          time: '09:15'
        }
      ]);
      setIsLoading(false);
    }, 1000);
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'delivered':
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
      case 'delivered':
        return 'Delivered';
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
                Welcome back, {user?.firstName || 'User'}!
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Manage your fuel orders and account
              </p>
            </div>
            <Link
              to="/user/order"
              className="btn btn-primary flex items-center space-x-2"
            >
              <FaPlus className="text-sm" />
              <span>New Order</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card">
            <div className="card-body">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900">
                  <FaWallet className="text-2xl text-blue-600 dark:text-blue-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Wallet Balance
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    R {user?.wallet?.balance?.toFixed(2) || '0.00'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
                  <FaGasPump className="text-2xl text-green-600 dark:text-green-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total Orders
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {user?.orderCount || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900">
                  <FaMapMarkerAlt className="text-2xl text-purple-600 dark:text-purple-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Saved Addresses
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {user?.addresses?.length || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Link
            to="/user/order"
            className="card hover:shadow-lg transition-shadow cursor-pointer"
          >
            <div className="card-body text-center">
              <FaGasPump className="text-3xl text-blue-600 dark:text-blue-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Order Fuel
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Place a new fuel order
              </p>
            </div>
          </Link>

          <Link
            to="/user/wallet"
            className="card hover:shadow-lg transition-shadow cursor-pointer"
          >
            <div className="card-body text-center">
              <FaWallet className="text-3xl text-green-600 dark:text-green-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Manage Wallet
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Add funds and view transactions
              </p>
            </div>
          </Link>

          <Link
            to="/user/addresses"
            className="card hover:shadow-lg transition-shadow cursor-pointer"
          >
            <div className="card-body text-center">
              <FaMapMarkerAlt className="text-3xl text-purple-600 dark:text-purple-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Addresses
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Manage delivery addresses
              </p>
            </div>
          </Link>

          <Link
            to="/user/profile"
            className="card hover:shadow-lg transition-shadow cursor-pointer"
          >
            <div className="card-body text-center">
              <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-3 flex items-center justify-center">
                <span className="text-lg font-semibold text-gray-600 dark:text-gray-300">
                  {user?.firstName?.charAt(0) || 'U'}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Profile
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Update your information
              </p>
            </div>
          </Link>
        </div>

        {/* Recent Orders */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <FaHistory className="text-xl text-gray-600 dark:text-gray-400 mr-3" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Recent Orders
                </h2>
              </div>
              <Link
                to="/user/orders"
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
                        Fuel Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Total
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
                            to={`/user/orders/${order.id}`}
                            className="text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                          >
                            {order.orderNumber}
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {order.fuelType}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {order.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {order.total}
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
                <FaHistory className="text-4xl text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  No orders yet. Place your first order to get started!
                </p>
                <Link
                  to="/user/order"
                  className="btn btn-primary mt-4"
                >
                  Order Fuel
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
