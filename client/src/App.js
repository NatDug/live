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
import ProtectedRoute from './components/common/ProtectedRoute';
import LoadingSpinner from './components/common/LoadingSpinner';

// User App Pages
import UserLogin from './pages/user/Login';
import UserSignup from './pages/user/Signup';
import UserDashboard from './pages/user/Dashboard';
import UserOrder from './pages/user/Order';
import UserTracking from './pages/user/Tracking';
import UserWallet from './pages/user/Wallet';
import UserProfile from './pages/user/Profile';

// Driver App Pages
import DriverLogin from './pages/driver/Login';
import DriverSignup from './pages/driver/Signup';
import DriverDashboard from './pages/driver/Dashboard';
import DriverOrders from './pages/driver/Orders';
import DriverTraining from './pages/driver/Training';
import DriverWallet from './pages/driver/Wallet';
import DriverProfile from './pages/driver/Profile';

// Station App Pages
import StationLogin from './pages/station/Login';
import StationSignup from './pages/station/Signup';
import StationDashboard from './pages/station/Dashboard';
import StationOrders from './pages/station/Orders';
import StationInventory from './pages/station/Inventory';
import StationWallet from './pages/station/Wallet';
import StationProfile from './pages/station/Profile';

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
                  <Route path="/user/login" element={<UserLogin />} />
                  <Route path="/user/signup" element={<UserSignup />} />
                  <Route 
                    path="/user/dashboard" 
                    element={
                      <ProtectedRoute userType="user">
                        <UserDashboard />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/user/order" 
                    element={
                      <ProtectedRoute userType="user">
                        <UserOrder />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/user/tracking/:orderId" 
                    element={
                      <ProtectedRoute userType="user">
                        <UserTracking />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/user/wallet" 
                    element={
                      <ProtectedRoute userType="user">
                        <UserWallet />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/user/profile" 
                    element={
                      <ProtectedRoute userType="user">
                        <UserProfile />
                      </ProtectedRoute>
                    } 
                  />
                  
                  {/* Driver Routes */}
                  <Route path="/driver/login" element={<DriverLogin />} />
                  <Route path="/driver/signup" element={<DriverSignup />} />
                  <Route 
                    path="/driver/dashboard" 
                    element={
                      <ProtectedRoute userType="driver">
                        <DriverDashboard />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/driver/orders" 
                    element={
                      <ProtectedRoute userType="driver">
                        <DriverOrders />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/driver/training" 
                    element={
                      <ProtectedRoute userType="driver">
                        <DriverTraining />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/driver/wallet" 
                    element={
                      <ProtectedRoute userType="driver">
                        <DriverWallet />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/driver/profile" 
                    element={
                      <ProtectedRoute userType="driver">
                        <DriverProfile />
                      </ProtectedRoute>
                    } 
                  />
                  
                  {/* Station Routes */}
                  <Route path="/station/login" element={<StationLogin />} />
                  <Route path="/station/signup" element={<StationSignup />} />
                  <Route 
                    path="/station/dashboard" 
                    element={
                      <ProtectedRoute userType="station">
                        <StationDashboard />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/station/orders" 
                    element={
                      <ProtectedRoute userType="station">
                        <StationOrders />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/station/inventory" 
                    element={
                      <ProtectedRoute userType="station">
                        <StationInventory />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/station/wallet" 
                    element={
                      <ProtectedRoute userType="station">
                        <StationWallet />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/station/profile" 
                    element={
                      <ProtectedRoute userType="station">
                        <StationProfile />
                      </ProtectedRoute>
                    } 
                  />
                  
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
