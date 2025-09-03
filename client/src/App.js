import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import { Helmet } from 'react-helmet';

// Context Providers
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { ThemeProvider } from './contexts/ThemeContext';

// Components
import ProtectedRoute from './components/ProtectedRoute';

// User App Pages (only files that exist)
import UserDashboard from './pages/user/UserDashboard';
import CreateOrder from './pages/user/CreateOrder';
import PaymentPage from './pages/user/PaymentPage';
import ProfilePage from './pages/user/ProfilePage';
import OrderTracking from './pages/user/OrderTracking';

// Driver App Pages
import DriverDashboard from './pages/driver/Dashboard';
import OrderDetails from './pages/driver/OrderDetails';
import Earnings from './pages/driver/Earnings';

// Station App Pages
import StationDashboard from './pages/station/Dashboard';

// Landing Page
import LandingPage from './pages/LandingPage';

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <SocketProvider>
            <Router>
              <Helmet>
                <title>WeFuel - Fuel Delivery</title>
                <meta name="description" content="On-demand fuel delivery in Johannesburg" />
              </Helmet>
              
              <div className="App">
                <Routes>
                  {/* Landing Page */}
                  <Route path="/" element={<LandingPage />} />
                  
                  {/* User Routes */}
                  {/* Auth routes removed (pages not present) */}
                  <Route 
                    path="/user/dashboard" 
                    element={
                      <ProtectedRoute userType="user">
                        <UserDashboard />
                      </ProtectedRoute>
                    } 
                  />
                  {/* Removed routes to non-existent pages: Order, Tracking, Wallet, Profile */}
                  <Route 
                    path="/user/create-order" 
                    element={
                      <ProtectedRoute userType="user">
                        <CreateOrder />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/user/payment/:orderId" 
                    element={
                      <ProtectedRoute userType="user">
                        <PaymentPage />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/user/profile-settings" 
                    element={
                      <ProtectedRoute userType="user">
                        <ProfilePage />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/user/order-tracking/:orderId" 
                    element={
                      <ProtectedRoute userType="user">
                        <OrderTracking />
                      </ProtectedRoute>
                    } 
                  />
                  
                  {/* Driver Routes */}
                  {/* Removed driver login/signup (not present) */}
                  <Route 
                    path="/driver/dashboard" 
                    element={
                      <ProtectedRoute userType="driver">
                        <DriverDashboard />
                      </ProtectedRoute>
                    } 
                  />
                  {/* Removed driver pages not present: Orders, Training, Wallet, Profile */}
                  <Route 
                    path="/driver/order/:orderId" 
                    element={
                      <ProtectedRoute userType="driver">
                        <OrderDetails />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/driver/earnings" 
                    element={
                      <ProtectedRoute userType="driver">
                        <Earnings />
                      </ProtectedRoute>
                    } 
                  />
                  
                  {/* Station Routes */}
                  {/* Removed station login/signup (not present) */}
                  <Route 
                    path="/station/dashboard" 
                    element={
                      <ProtectedRoute userType="station">
                        <StationDashboard />
                      </ProtectedRoute>
                    } 
                  />
                  {/* Removed station pages not present: Orders, Inventory, Wallet, Profile */}
                  
                  {/* Catch all route */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
                
                {/* Toast notifications */}
                <Toaster
                  position="top-right"
                  toastOptions={{
                    duration: 4000,
                    style: {
                      background: '#363636',
                      color: '#fff',
                    },
                    success: {
                      duration: 3000,
                      iconTheme: {
                        primary: '#4ade80',
                        secondary: '#fff',
                      },
                    },
                    error: {
                      duration: 5000,
                      iconTheme: {
                        primary: '#ef4444',
                        secondary: '#fff',
                      },
                    },
                  }}
                />
              </div>
            </Router>
          </SocketProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
