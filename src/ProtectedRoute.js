import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function ProtectedRoute({ children }) {
  const { currentUser, loading, authReady } = useAuth();
  const navigate = useNavigate();
  
  console.log("ProtectedRoute - Current User:", currentUser ? "authenticated" : "unauthenticated");
  console.log("ProtectedRoute - Loading:", loading);
  console.log("ProtectedRoute - Auth Ready:", authReady);

  useEffect(() => {
    // Only redirect if auth is ready and user is not authenticated
    if (authReady && !loading && !currentUser) {
      console.log("Auth ready but no user detected, redirecting to login");
      navigate('/login');
    }
  }, [authReady, loading, currentUser, navigate]);

  // Show loading state until auth is determined
  if (loading || !authReady) {
    return (
      <div className="loading-container">
        <p>Verifying authentication...</p>
      </div>
    );
  }

  // Only render children if user is authenticated
  return currentUser ? children : null;
}
