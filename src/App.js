import React from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import Home from './Home';
import About from './About';
import Leaderboard from './Leaderboard';
import Login from './Login';
import Feedback from './Feedback';
import Dashboard from './Dashboard';
import ProtectedRoute from './ProtectedRoute';
import Brain from './Brain';
import { useAuth } from './AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from './firebase';
import './App.css';
import { AuthProvider } from './AuthContext';

function AppContent() {
  const { currentUser } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      window.location.href = '/';
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <div className="app-container">
      {/* Top Navigation */}
      <nav className="top-nav">
        <div className="nav-container">
          <div className="nav-brand">
            <Brain />
          </div>
          <div className="nav-links">
            <NavLink to="/" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
              Home
            </NavLink>
            
            <NavLink to="/about" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
              About
            </NavLink>
            
            <NavLink to="/leaderboard" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
              Leaderboard
            </NavLink>
            
            {!currentUser && (
              <NavLink to="/login" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                Login/Sign Up
              </NavLink>
            )}
            
            {currentUser && (
              <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                Dashboard
              </NavLink>
            )}
            
            <NavLink to="/feedback" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
              Feedback
            </NavLink>
          </div>
          
          {currentUser && (
            <div className="user-info">
              <span className="username-display">{currentUser.displayName || 'Player'}</span>
              <button 
                onClick={handleSignOut}
                className="sign-out-button"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </nav>
      
      {/* Main Content Area */}
      <main className="content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/login" element={<Login />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
