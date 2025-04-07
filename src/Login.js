import React, { useState } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider 
} from 'firebase/auth';
import { auth } from './firebase';
import './App.css'; // Import your existing CSS

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (isSignUp) {
        // Sign up logic
        await createUserWithEmailAndPassword(auth, email, password);
        alert('Account created successfully!');
      } else {
        // Sign in logic
        await signInWithEmailAndPassword(auth, email, password);
        alert('Logged in successfully!');
      }
    } catch (error) {
      setError(error.message);
      console.error('Authentication error:', error);
    }
  };

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      // Add these scopes if needed
      provider.addScope('https://www.googleapis.com/auth/userinfo.email');
      provider.addScope('https://www.googleapis.com/auth/userinfo.profile');
      
      const result = await signInWithPopup(auth, provider);
      // This will give you more information about the signed-in user
      const user = result.user;
      console.log(user);
      alert('Google Sign-In successful!');
    } catch (error) {
      // More detailed error logging
      console.error('Google Sign-In error:', error);
      setError(error.message);
    }
  };

  return (
    <div className="home-container" style={{
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      height: '100vh'
    }}>
      <h2 style={{color: '#E9D8A1', marginBottom: '20px'}}>
        {isSignUp ? 'Sign Up' : 'Login'}
      </h2>
      
      {error && <p style={{color: 'red', marginBottom: '15px'}}>{error}</p>}
      
      <form 
        onSubmit={handleEmailSubmit} 
        style={{
          display: 'flex', 
          flexDirection: 'column', 
          width: '300px',
          gap: '15px'
        }}
      >
        <div style={{
          position: 'relative',
          width: '100%'
        }}>
          <label 
            htmlFor="email" 
            style={{
              color: '#E9D8A1', 
              position: 'absolute', 
              top: '-20px'
            }}
          >
            Email:
          </label>
          <input 
            type="email" 
            id="email"
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
            style={{
              width: '100%',
              backgroundColor: 'transparent',
              border: '2px solid #795548',
              borderRadius: '8px',
              color: '#E9D8A1',
              padding: '10px',
              boxSizing: 'border-box'
            }}
          />
        </div>
        <div style={{
          position: 'relative',
          width: '100%'
        }}>
          <label 
            htmlFor="password" 
            style={{
              color: '#E9D8A1', 
              position: 'absolute', 
              top: '-20px'
            }}
          >
            Password:
          </label>
          <input 
            type="password" 
            id="password"
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
            style={{
              width: '100%',
              backgroundColor: 'transparent',
              border: '2px solid #795548',
              borderRadius: '8px',
              color: '#E9D8A1',
              padding: '10px',
              boxSizing: 'border-box'
            }}
          />
        </div>
        <button 
          type="submit"
          style={{
            backgroundColor: '#795548',
            color: '#E9D8A1',
            border: 'none',
            borderRadius: '8px',
            padding: '10px',
            cursor: 'pointer',
            marginTop: '10px'
          }}
        >
          {isSignUp ? 'Create Account' : 'Log In'}
        </button>
      </form>
      
      <div style={{
        marginTop: '20px', 
        textAlign: 'center',
        width: '300px'
      }}>
        <p style={{color: '#E9D8A1', marginBottom: '10px'}}>Or continue with:</p>
        <button 
          onClick={handleGoogleSignIn}
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: '#795548',
            color: '#E9D8A1',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Sign in with Google
        </button>
      </div>
      
      <p style={{
        marginTop: '20px', 
        color: '#E9D8A1'
      }}>
        {isSignUp 
          ? 'Already have an account? ' 
          : 'Don\'t have an account? '}
        <button 
          onClick={() => setIsSignUp(!isSignUp)}
          style={{
            background: 'none', 
            border: 'none', 
            color: '#E9D8A1', 
            textDecoration: 'underline',
            cursor: 'pointer'
          }}
        >
          {isSignUp ? 'Log In' : 'Sign Up'}
        </button>
      </p>
    </div>
  );
}

export default Login;
