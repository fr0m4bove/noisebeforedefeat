import React from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import Home from './Home';
import About from './About';
import Leaderboard from './Leaderboard';
import Login from './Login';
import Feedback from './Feedback';
import Dashboard from './Dashboard';
import ProtectedRoute from './ProtectedRoute';
import './App.css';
import { AuthProvider } from './AuthContext';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app-container">
          {/* Top Navigation */}
          <nav className="top-nav">
            <div className="nav-container">
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
                
                <NavLink to="/login" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                  Login/Sign Up
                </NavLink>
                
                <NavLink to="/feedback" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                  Feedback
                </NavLink>
              </div>
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
      </Router>
    </AuthProvider>
  );
}

export default App;
