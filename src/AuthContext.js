import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from './firebase';
import { onAuthStateChanged, updateProfile } from 'firebase/auth';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    console.log("Setting up auth state listener");
    
    // Ensure we start in loading state
    setLoading(true);
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log("Auth state changed, user:", user ? "authenticated" : "unauthenticated");
      setCurrentUser(user);
      setLoading(false);
      setAuthReady(true);
    }, (error) => {
      console.error("Auth state observer error:", error);
      setLoading(false);
      setAuthReady(true);
    });

    // Return cleanup function
    return () => {
      console.log("Cleaning up auth state listener");
      unsubscribe();
    };
  }, []);

  // Function to update username
  const updateUsername = async (username) => {
    try {
      if (currentUser) {
        await updateProfile(currentUser, {
          displayName: username
        });
        // Force refresh the currentUser object
        setCurrentUser({ ...currentUser });
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error updating username:", error);
      return false;
    }
  };

  // Additional function to check if user is authenticated
  const isAuthenticated = () => {
    return !!currentUser;
  };

  const value = {
    currentUser,
    loading,
    authReady,
    isAuthenticated,
    updateUsername
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
