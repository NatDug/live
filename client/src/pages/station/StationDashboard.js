import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { FaStore, FaWallet, FaGasPump, FaChartLine, FaClock, FaCheck, FaTimes } from 'react-icons/fa';

const StationDashboard = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(true);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading station data
    setTimeout(() => {
      setPendingOrders([
        {
          id: '1',
          orderNumber: 'WF-2024-001',
          customerName: 'John Doe',
          fuelType: 'Petrol 95',
          quantity: '50L',
          total: 'R 1,250.00',
          status: 'pending',
          date: '2024-01-15',
          time: '14:30',
          driverName: 'Mike Johnson'
        },
        {
          id: '2',
          orderNumber: 'WF-2024-002',
          customerName: 'Jane Smith',
          fuelType: 'Diesel',
          quantity: '30L',
          total: 'R 750.00',
          status: 'preparing',
          date: '2024-01-16',
          time: '09:15',
          driverName: 'Sarah Wilson'
        }
      ]);
      setIsLoading(false);
    }, 1000);
  }, []);

  const toggleStationStatus = () => {
    setIsOpen(!isOpen);
    // Here you would typically make an API call to update station status
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'preparing':
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
      case 'preparing':
        return 'Preparing';
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
                Welcome back, {user?.stationName || 'Station'}!
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Manage your orders and inventory
              </p>
            </div>
            <button
              onClick={toggleStationStatus}
              className={`btn flex items-center space-x-2 ${
                isOpen 
                  ? 'btn-success' 
                  : 'btn-error'
              }`}
            >
              {isOpen ? (
                <>
                  <FaCheck className="text-sm" />
                  <span>Open</span>
                </>
              ) : (
                <>
                  <FaTimes className="text-sm" />
                  <span>Closed</span>
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
                    Today's Revenue
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    R {user?.todayRevenue?.toFixed(2) || '0.00'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900">
                  <FaStore className="text-2xl text-blue-600 dark:text-blue-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total Orders
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {user?.totalOrders || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900">
                  <FaGasPump className="text-2xl text-purple-600 dark:text-purple-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Fuel Stock
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {user?.fuelStock || 0}L
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900">
                  <FaChartLine className="text-2xl text-yellow-600 dark:text-yellow-400" />
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

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Link
            to="/station/orders"
            className="card hover:shadow-lg transition-shadow cursor-pointer"
          >
            <div className="card-body text-center">
              <FaStore className="text-3xl text-blue-600 dark:text-blue-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Manage Orders
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                View and process incoming orders
              </p>
            </div>
          </Link>

          <Link
            to="/station/inventory"
            className="card hover:shadow-lg transition-shadow cursor-pointer"
          >
            <div className="card-body text-center">
              <FaGasPump className="text-3xl text-green-600 dark:text-green-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Inventory
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Manage fuel and store inventory
              </p>
            </div>
          </Link>

          <Link
            to="/station/earnings"
            className="card hover:shadow-lg transition-shadow cursor-pointer"
          >
            <div className="card-body text-center">
              <FaWallet className="text-3xl text-purple-600 dark:text-purple-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Earnings
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                View revenue and transaction history
              </p>
            </div>
          </Link>

          <Link
            to="/station/profile"
            className="card hover:shadow-lg transition-shadow cursor-pointer"
          >
            <div className="card-body text-center">
              <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-3 flex items-center justify-center">
                <span className="text-lg font-semibold text-gray-600 dark:text-gray-300">
                  {user?.stationName?.charAt(0) || 'S'}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Station Profile
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Update station information and settings
              </p>
            </div>
          </Link>
        </div>

        {/* Pending Orders */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <FaClock className="text-xl text-gray-600 dark:text-gray-400 mr-3" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Pending Orders
                </h2>
              </div>
              <Link
                to="/station/orders"
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
            ) : pendingOrders.length > 0 ? (
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
                        Quantity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Driver
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {pendingOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link
                            to={`/station/orders/${order.id}`}
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {order.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {order.total}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {order.driverName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                            {getStatusText(order.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button className="text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">
                              Process
                            </button>
                            <button className="text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300">
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <FaStore className="text-4xl text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  No pending orders at the moment.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Inventory Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Fuel Inventory
              </h3>
            </div>
            <div className="card-body">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Petrol 95</span>
                  <span className="font-semibold text-gray-900 dark:text-white">2,500L</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Petrol 93</span>
                  <span className="font-semibold text-gray-900 dark:text-white">1,800L</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Diesel</span>
                  <span className="font-semibold text-gray-900 dark:text-white">3,200L</span>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Today's Summary
              </h3>
            </div>
            <div className="card-body">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Orders Processed</span>
                  <span className="font-semibold text-gray-900 dark:text-white">12</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Fuel Sold</span>
                  <span className="font-semibold text-gray-900 dark:text-white">450L</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Revenue</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">R 11,250</span>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Quick Actions
              </h3>
            </div>
            <div className="card-body">
              <div className="space-y-3">
                <button className="w-full btn btn-primary">
                  Update Inventory
                </button>
                <button className="w-full btn btn-outline">
                  View Reports
                </button>
                <button className="w-full btn btn-outline">
                  Manage Staff
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StationDashboard;
