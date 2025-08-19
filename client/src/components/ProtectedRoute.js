import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, allowedUserTypes = [] }) => {
  const { isAuthenticated, loading, userType } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if user type is allowed (if specified)
  if (allowedUserTypes.length > 0 && !allowedUserTypes.includes(userType)) {
    // Redirect to appropriate dashboard based on user type
    switch (userType) {
      case 'user':
        return <Navigate to="/user/dashboard" replace />;
      case 'driver':
        return <Navigate to="/driver/dashboard" replace />;
      case 'station':
        return <Navigate to="/station/dashboard" replace />;
      default:
        return <Navigate to="/" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
