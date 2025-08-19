import React from 'react';
import { Link } from 'react-router-dom';
import { FaGasPump, FaTruck, FaStore, FaShieldAlt, FaClock, FaMapMarkerAlt } from 'react-icons/fa';
import { useTheme } from '../contexts/ThemeContext';

const LandingPage = () => {
  const { colors, toggleTheme, isDark } = useTheme();

  const features = [
    {
      icon: <FaGasPump className="text-4xl text-blue-600" />,
      title: 'On-Demand Fuel Delivery',
      description: 'Get fuel delivered to your doorstep within 30 minutes, 24/7.'
    },
    {
      icon: <FaShieldAlt className="text-4xl text-green-600" />,
      title: 'FICA Compliant',
      description: 'Secure and verified transactions with full regulatory compliance.'
    },
    {
      icon: <FaClock className="text-4xl text-orange-600" />,
      title: 'Real-Time Tracking',
      description: 'Track your delivery in real-time with live driver location updates.'
    },
    {
      icon: <FaMapMarkerAlt className="text-4xl text-red-600" />,
      title: 'Smart Pricing',
      description: 'Dynamic pricing based on location, time, and load-shedding status.'
    }
  ];

  const portals = [
    {
      title: 'Customer Portal',
      description: 'Order fuel, track deliveries, and manage your account',
      icon: <FaGasPump className="text-3xl" />,
      link: '/user/login',
      color: 'bg-blue-600 hover:bg-blue-700'
    },
    {
      title: 'Driver Portal',
      description: 'Accept orders, navigate routes, and manage earnings',
      icon: <FaTruck className="text-3xl" />,
      link: '/driver/login',
      color: 'bg-green-600 hover:bg-green-700'
    },
    {
      title: 'Station Portal',
      description: 'Manage inventory, process orders, and view analytics',
      icon: <FaStore className="text-3xl" />,
      link: '/station/login',
      color: 'bg-purple-600 hover:bg-purple-700'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Navigation */}
      <nav className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gradient">WeFuel</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                {isDark ? '☀️' : '🌙'}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            Fuel Delivery
            <span className="text-gradient block">Made Simple</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
            Get fuel delivered to your doorstep in Johannesburg within 30 minutes. 
            No more waiting in queues or driving to gas stations.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/user/register"
              className="btn btn-primary text-lg px-8 py-3"
            >
              Get Started
            </Link>
            <Link
              to="/about"
              className="btn btn-outline text-lg px-8 py-3"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 dark:text-white mb-12">
            Why Choose WeFuel?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="text-center p-6 rounded-xl bg-gray-50 dark:bg-gray-800 hover:shadow-lg transition-all duration-300"
              >
                <div className="flex justify-center mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Portal Selection Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 dark:text-white mb-12">
            Choose Your Portal
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {portals.map((portal, index) => (
              <Link
                key={index}
                to={portal.link}
                className="group block"
              >
                <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700 group-hover:border-blue-300 dark:group-hover:border-blue-600">
                  <div className="text-center">
                    <div className="flex justify-center mb-4">
                      <div className="p-4 rounded-full bg-gray-100 dark:bg-gray-700 group-hover:bg-blue-100 dark:group-hover:bg-blue-900 transition-colors">
                        {portal.icon}
                      </div>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      {portal.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-4">
                      {portal.description}
                    </p>
                    <div className={`inline-block px-6 py-2 rounded-lg text-white font-medium transition-colors ${portal.color}`}>
                      Access Portal
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-2xl font-bold text-gradient mb-4">WeFuel</h3>
              <p className="text-gray-400">
                On-demand fuel delivery service for Johannesburg, South Africa.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Services</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Fuel Delivery</li>
                <li>Convenience Store</li>
                <li>FICA Compliance</li>
                <li>Real-time Tracking</li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Help Center</li>
                <li>Contact Us</li>
                <li>Safety Guidelines</li>
                <li>Terms of Service</li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Connect</h4>
              <ul className="space-y-2 text-gray-400">
                <li>About Us</li>
                <li>Careers</li>
                <li>Partnerships</li>
                <li>News</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 WeFuel. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
