import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDatabase, ref, set } from 'firebase/database';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile 
} from 'firebase/auth';
import { auth } from './firebase';
import { useAuth } from './AuthContext';
import './Login.css';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { currentUser, authReady } = useAuth();

  // Check if user is already authenticated
  useEffect(() => {
    if (authReady && currentUser) {
      console.log("User already authenticated, redirecting to dashboard");
      navigate('/dashboard');
    }
  }, [authReady, currentUser, navigate]);

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isSignUp) {
        // Sign up logic
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Generate a default username if not provided
        const defaultUsername = username.trim() || email.split('@')[0];
        
        // Update Firebase Auth profile
        await updateProfile(user, {
          displayName: defaultUsername
        });
        
        // Create user data in Realtime Database with flat structure
        const db = getDatabase();
        const userRef = ref(db, `users/${user.uid}`);
        await set(userRef, {
          username: defaultUsername,
          email: email,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          totalGames: 0,
          wins: 0,
          losses: 0,
          eloRating: 1500 // Starting ELO rating
        });
        
        alert('Account created successfully!');
      } else {
        // Sign in logic
        await signInWithEmailAndPassword(auth, email, password);
        alert('Logged in successfully!');
      }
      
      // After successful auth, navigate to dashboard
      navigate('/dashboard');
    } catch (error) {
      setError(error.message);
      console.error('Authentication error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      provider.addScope('https://www.googleapis.com/auth/userinfo.email');
      provider.addScope('https://www.googleapis.com/auth/userinfo.profile');
      
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;
      
      // Get database reference
      const db = getDatabase();
      const userRef = ref(db, `users/${user.uid}`);
      
      // Check if user already exists in database
      await set(userRef, {
        username: user.displayName || user.email.split('@')[0],
        email: user.email,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        totalGames: 0,
        wins: 0,
        losses: 0,
        eloRating: 1500 // Starting ELO rating
      }, { merge: true });
      
      console.log("Google authentication successful");
      alert('Google Sign-In successful!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Google Sign-In error:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // If the page is still checking authentication, show loading
  if (!authReady) {
    return (
      <div className="login-container">
        <p>Checking authentication status...</p>
      </div>
    );
  }

  return (
    <div className="login-container">
      <h2 className="title">
        {isSignUp ? 'Sign Up' : 'Login'}
      </h2>
      
      {error && <p className="error-message">{error}</p>}
      
      <form onSubmit={handleEmailSubmit} className="login-form">
        {isSignUp && (
          <div className="form-group">
            <label htmlFor="username">Username:</label>
            <input 
              type="text" 
              id="username"
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              className="form-input"
            />
          </div>
        )}
        
        <div className="form-group">
          <label htmlFor="email">Email:</label>
          <input 
            type="email" 
            id="email"
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
            disabled={isLoading}
            className="form-input"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="password">Password:</label>
          <input 
            type="password" 
            id="password"
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
            disabled={isLoading}
            className="form-input"
          />
        </div>
        
        <button 
          type="submit"
          disabled={isLoading}
          className="submit-button"
        >
          {isLoading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Log In')}
        </button>
      </form>
      
      <div className="alternate-login">
        <p>Or continue with:</p>
        <button 
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="google-button"
        >
          Sign in with Google
        </button>
      </div>
      
      <div className="account-toggle">
        {isSignUp 
          ? 'Already have an account? ' 
          : 'Don\'t have an account? '}
        <button 
          onClick={() => setIsSignUp(!isSignUp)}
          disabled={isLoading}
          className="toggle-button"
        >
          {isSignUp ? 'Log In' : 'Sign Up'}
        </button>
      </div>
    </div>
  );
}

export default Login;
