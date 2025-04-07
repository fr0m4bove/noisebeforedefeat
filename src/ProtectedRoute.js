import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function ProtectedRoute({ children }) {
  const { currentUser, loading } = useAuth();
  
  console.log("ProtectedRoute - Current User:", currentUser);
  console.log("ProtectedRoute - Loading:", loading);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!currentUser) {
    console.log("No user detected, redirecting to login");
    return <Navigate to="/login" />;
  }

  console.log("User authenticated, rendering protected content");
  return children;
}
