import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { 
  FaMoneyBillWave, FaChartLine, FaCalendarAlt, FaDownload, 
  FaWallet, FaClock, FaCheckCircle, FaArrowLeft
} from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { useQuery } from 'react-query';
import axios from 'axios';

const Earnings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedPeriod, setSelectedPeriod] = useState('week');

  // Fetch earnings data
  const { data: earnings, isLoading: earningsLoading } = useQuery(
    ['driver-earnings', user?.id, selectedPeriod],
    () => axios.get(`/api/drivers/earnings?period=${selectedPeriod}`).then(res => res.data),
    { enabled: !!user?.id }
  );

  // Fetch wallet balance
  const { data: wallet, isLoading: walletLoading } = useQuery(
    ['driver-wallet', user?.id],
    () => axios.get('/api/drivers/wallet').then(res => res.data),
    { enabled: !!user?.id }
  );

  const periods = [
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'year', label: 'This Year' }
  ];

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(amount || 0);
  };

  const handleWithdraw = () => {
    toast.success('Withdrawal request submitted successfully!');
  };

  const handleDownloadStatement = () => {
    toast.success('Statement download started...');
  };

  if (earningsLoading || walletLoading) {
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
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/driver/dashboard')}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <FaArrowLeft className="text-xl" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Earnings</h1>
                <p className="text-gray-600">Track your earnings and payments</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleDownloadStatement}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <FaDownload />
                <span>Download Statement</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Period Selector */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Select Period</h2>
            <div className="flex space-x-2">
              {periods.map((period) => (
                <button
                  key={period.key}
                  onClick={() => setSelectedPeriod(period.key)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedPeriod === period.key
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {period.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Earnings Overview */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Earnings Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FaMoneyBillWave className="text-green-600 text-2xl" />
                  </div>
                  <p className="text-sm text-gray-600">Total Earnings</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(earnings?.totalEarnings)}
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FaCheckCircle className="text-blue-600 text-2xl" />
                  </div>
                  <p className="text-sm text-gray-600">Completed Orders</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {earnings?.completedOrders || 0}
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FaClock className="text-yellow-600 text-2xl" />
                  </div>
                  <p className="text-sm text-gray-600">Active Orders</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {earnings?.activeOrders || 0}
                  </p>
                </div>
              </div>
            </div>

            {/* Recent Earnings */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Earnings</h2>
              {earnings?.recentEarnings?.length > 0 ? (
                <div className="space-y-4">
                  {earnings.recentEarnings.map((earning) => (
                    <div key={earning._id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                          <FaMoneyBillWave className="text-green-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            Order #{earning.orderNumber}
                          </h3>
                          <p className="text-gray-600">
                            {new Date(earning.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-600">
                          {formatCurrency(earning.amount)}
                        </p>
                        <p className="text-sm text-gray-600">
                          {earning.fuelType} - {earning.quantity}L
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FaMoneyBillWave className="text-gray-300 text-4xl mx-auto mb-4" />
                  <p className="text-gray-600">No earnings for this period</p>
                </div>
              )}
            </div>

            {/* Earnings Chart Placeholder */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Earnings Trend</h2>
              <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <FaChartLine className="text-gray-400 text-4xl mx-auto mb-4" />
                  <p className="text-gray-600">Chart visualization coming soon</p>
                  <p className="text-sm text-gray-500">Interactive charts will be available in the next update</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Wallet Balance */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Wallet Balance</h2>
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FaWallet className="text-blue-600 text-2xl" />
                </div>
                <p className="text-3xl font-bold text-gray-900 mb-2">
                  {formatCurrency(wallet?.balance)}
                </p>
                <p className="text-gray-600 mb-4">Available for withdrawal</p>
                <button
                  onClick={handleWithdraw}
                  disabled={!wallet?.balance || wallet.balance <= 0}
                  className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Withdraw Funds
                </button>
              </div>
            </div>

            {/* Payment History */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment History</h2>
              {wallet?.transactions?.length > 0 ? (
                <div className="space-y-3">
                  {wallet.transactions.slice(0, 5).map((transaction) => (
                    <div key={transaction._id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{transaction.type}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(transaction.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${
                          transaction.type === 'withdrawal' ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {transaction.type === 'withdrawal' ? '-' : '+'}{formatCurrency(transaction.amount)}
                        </p>
                        <p className={`text-sm ${
                          transaction.status === 'completed' ? 'text-green-600' : 'text-yellow-600'
                        }`}>
                          {transaction.status}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <FaWallet className="text-gray-300 text-2xl mx-auto mb-2" />
                  <p className="text-gray-600 text-sm">No transactions yet</p>
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h2>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Average per Order</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(earnings?.averagePerOrder)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Distance</span>
                  <span className="font-semibold text-gray-900">
                    {(earnings?.totalDistance || 0).toFixed(1)} km
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Online Hours</span>
                  <span className="font-semibold text-gray-900">
                    {(earnings?.onlineHours || 0).toFixed(1)} hrs
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Rating</span>
                  <span className="font-semibold text-gray-900">
                    {earnings?.rating?.toFixed(1) || 'N/A'} ⭐
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/driver/dashboard')}
                  className="w-full flex items-center space-x-3 p-3 text-left rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <FaChartLine className="text-blue-600" />
                  <span className="text-gray-700">Back to Dashboard</span>
                </button>
                <button
                  onClick={() => navigate('/driver/orders')}
                  className="w-full flex items-center space-x-3 p-3 text-left rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <FaCheckCircle className="text-green-600" />
                  <span className="text-gray-700">View Orders</span>
                </button>
                <button
                  onClick={() => navigate('/driver/profile')}
                  className="w-full flex items-center space-x-3 p-3 text-left rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <FaWallet className="text-purple-600" />
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

export default Earnings;
