#!/bin/bash

# Make the script exit on any errors
set -e

echo "Creating Noise Before Defeat files..."

# Create directories if they don't exist
mkdir -p src

# Create App.js
cat > src/App.js << 'EOF'
import React from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import Home from './Home';
import About from './About';
import Leaderboard from './Leaderboard';
import Login from './Login';
import Feedback from './Feedback';
import './App.css';

function App() {
  return (
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
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
EOF

# Create App.css
cat > src/App.css << 'EOF'
:root {
  --chess-tan: #e8e0c8;
  --chess-dark-tan: #b8a88c;
  --chess-green: #769656;
  --chess-green-dark: #5c7a43;
  --chess-dark: #121a28;
  --nav-height: 60px;
}

body {
  margin: 0;
  padding: 0;
  font-family: 'Exo 2', sans-serif;
  background-color: var(--chess-dark);
  color: var(--chess-tan);
}

.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: linear-gradient(to bottom right, #1e2636, #121a28, #0f1620);
}

/* Top Navigation - transparent */
.top-nav {
  background-color: transparent; 
  color: var(--chess-tan);
  height: var(--nav-height);
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  padding-top: 20px;
}

.nav-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  max-width: 1200px;
  margin: 0 auto;
}

.nav-links {
  display: flex;
  height: 100%;
}

.nav-item {
  display: flex;
  align-items: center;
  height: 100%;
  padding: 0 30px;
  text-decoration: none;
  color: var(--chess-tan);
  font-size: 1.1rem;
  transition: all 0.2s ease;
}

.nav-item:hover {
  background-color: rgba(255, 255, 255, 0.1);
  color: var(--chess-green);
}

.nav-item.active {
  color: var(--chess-green);
  border-bottom: 2px solid var(--chess-green);
}

/* Main Content Area - removed visible border */
.content {
  flex-grow: 1;
  padding: 20px;
  margin-top: var(--nav-height);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - var(--nav-height));
  /* Remove any box-shadow, border, or background that might be creating the visible border */
  border: none;
  box-shadow: none;
  background: transparent;
}

/* For mobile responsiveness */
@media (max-width: 768px) {
  .nav-container {
    justify-content: space-around;
  }
  
  .nav-links {
    width: 100%;
    justify-content: space-between;
  }
  
  .nav-item {
    padding: 0 15px;
    font-size: 0.9rem;
  }
}
EOF

# Create Home.jsx
cat > src/Home.jsx << 'EOF'
import React, { useEffect, useState } from "react";
import "./Home.css";

const Home = () => {
  const quotes = [
    "In the moment I truly understand my enemy, I also love him -Ender Wiggin",
    "The greatest victory is that which requires no battle.",
    "Never interrupt your enemy when he's making a mistake.",
    "Chaos is order yet undeciphered -Jose Saramago",
    "Its not truth that matters, but victory -Adolf Hitler",
    "The mind is the first battlefield -Anonymous",
    "War is the unfolding of miscalculations -Barbara Tuchman"
  ];

  const [quoteIndex, setQuoteIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    let timeoutId;

    const cycle = () => {
      // First fade out
      setFade(false);
      
      // Wait 1 second for fade-out to complete
      timeoutId = setTimeout(() => {
        // Change quote
        setQuoteIndex((prevIndex) => (prevIndex + 1) % quotes.length);
        // Then fade in
        setFade(true);
        
        // Wait 4 seconds before starting the next cycle
        timeoutId = setTimeout(cycle, 4000);
      }, 1000); // This should match your CSS transition time
    };

    cycle();

    return () => clearTimeout(timeoutId);
  }, [quotes.length]);

  return (
    <div className="home-container">
      <h1 className="title">Noise Before Defeat</h1>
      <div className="quote-container">
        <p className={`quote ${fade ? 'fade-in' : 'fade-out'}`}>
          {quotes[quoteIndex]}
        </p>
      </div>
    </div>
  );
};

export default Home;
EOF

# Create Home.css
cat > src/Home.css << 'EOF'
.home-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - var(--nav-height));
  padding: 0 20px;
  text-align: center;
  width: 100%;
  /* Remove any borders or background colors */
  background: transparent;
  border: none;
  box-shadow: none;
}

.title {
  font-size: 2.5rem;
  font-weight: bold;
  margin-bottom: 2rem;
  color: var(--chess-tan);
}

.quote-container {
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
  /* Remove any borders */
  border: none;
  background: transparent;
}

.quote {
  font-size: 1.75rem;
  line-height: 1.4;
  color: var(--chess-tan);
  font-family: 'Exo 2', sans-serif;
  text-align: center;
  transition: opacity 1s ease;
  opacity: 1;
}

.fade-in {
  opacity: 1;
}

.fade-out {
  opacity: 0;
}
EOF

# Create About.jsx
cat > src/About.jsx << 'EOF'
import React from 'react';
import './About.css';

function About() {
  return (
    <div className="about-container">
      <h1 className="title">About Noise Before Defeat</h1>
      
      <div className="about-content">
        <p className="about-text">
          Noise Before Defeat is a simultaneous turn strategy game that relies heavily on prediction, deception, and timing. 
          It's not about overwhelming power, it's about control, anticipation, and manipulation. Your success depends 
          on your ability to stay unreadable, coax your opponent into vulnerability, and attack only when the balance 
          tilts in your favor.
        </p>
        
        <div className="game-principles">
          <div className="principle">
            <h3>Prediction</h3>
            <p>Anticipate your opponent's moves and counter them before they happen.</p>
          </div>
          
          <div className="principle">
            <h3>Deception</h3>
            <p>Use misdirection and false moves to mask your true strategy.</p>
          </div>
          
          <div className="principle">
            <h3>Timing</h3>
            <p>Strike when your opponent is most vulnerable, not when you're most powerful.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default About;
EOF

# Create About.css
cat > src/About.css << 'EOF'
.about-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - var(--nav-height));
  padding: 0 20px;
  text-align: center;
  width: 100%;
  background: transparent;
  border: none;
  box-shadow: none;
}

.title {
  font-size: 2.5rem;
  font-weight: bold;
  margin-bottom: 2rem;
  color: var(--chess-tan);
}

.about-content {
  max-width: 800px;
  margin: 0 auto;
  text-align: left;
}

.about-text {
  font-size: 1.25rem;
  line-height: 1.6;
  color: var(--chess-tan);
  margin-bottom: 2rem;
  text-align: center;
}

.game-principles {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-around;
  gap: 2rem;
  margin-top: 3rem;
}

.principle {
  flex: 1;
  min-width: 200px;
  padding: 1.5rem;
  border-radius: 8px;
  background-color: rgba(255, 255, 255, 0.05);
  transition: transform 0.3s ease, background-color 0.3s ease;
}

.principle:hover {
  transform: translateY(-5px);
  background-color: rgba(255, 255, 255, 0.08);
}

.principle h3 {
  color: var(--chess-green);
  font-size: 1.5rem;
  margin-bottom: 0.75rem;
}

.principle p {
  color: var(--chess-tan);
  font-size: 1rem;
  line-height: 1.5;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .game-principles {
    flex-direction: column;
