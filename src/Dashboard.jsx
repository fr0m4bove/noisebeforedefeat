// Dashboard.jsx
import React, { useState } from 'react';
import './Dashboard.css';

// Simple NetworkSphere component for loading animation
const NetworkSphere = () => (
  <div className="network-sphere">
    <div className="rotating-sphere"></div>
  </div>
);

function Dashboard() {
  const [loading, setLoading] = useState(false);
  const [gameMode, setGameMode] = useState(null);
  
  // Mock user data - replace with actual user data when available
  const currentUser = { displayName: 'Player', email: 'player@example.com' };
  
  // Mock player stats - replace with actual stats from your database
  const playerStats = {
    wins: 12,
    losses: 5,
    ratio: ((12 / (12 + 5)) * 100).toFixed(1),
    rank: 1342
  };
  
  // Game modes with descriptions
  const gameModes = [
    { 
      id: 'flash', 
      name: '2 Player Flash', 
      description: '10 minute games, 40 seconds think limit',
      players: 2
    },
    { 
      id: 'standard', 
      name: '2 Player Standard', 
      description: 'Classic gameplay with no time limits',
      players: 2
    },
    { 
      id: 'threeplayer', 
      name: '3 Player Mode', 
      description: 'Strategic complexity with three opponents',
      players: 3
    },
    { 
      id: 'fiveplayer', 
      name: '5 Player Mode', 
      description: 'Chaos and alliances in a five-way battle',
      players: 5
    }
  ];
  
  const startGame = (mode) => {
    setGameMode(mode);
    setLoading(true);
    
    // Simulate loading, then redirect to the game page
    setTimeout(() => {
      window.location.href = `/game/${mode.id}`;
      setLoading(false);
    }, 3000);
  };
  
  const navigateTo = (path) => {
    window.location.href = path;
  };
  
  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Welcome, {currentUser?.displayName || currentUser?.email || 'Player'}</h1>
      </div>
      
      <div className="dashboard-content">
        <div className="player-stats-card">
          <h2>Player Stats</h2>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-value">{playerStats.wins}</span>
              <span className="stat-label">Wins</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{playerStats.losses}</span>
              <span className="stat-label">Losses</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{playerStats.ratio}%</span>
              <span className="stat-label">Win Rate</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{playerStats.rank}</span>
              <span className="stat-label">ELO Rating</span>
            </div>
          </div>
        </div>
        
        <div className="dashboard-actions">
          <div className="action-card play-card">
            <h2>Play Online</h2>
            <div className="game-modes">
              {gameModes.map((mode) => (
                <div className="game-mode-item" key={mode.id} onClick={() => startGame(mode)}>
                  <h3>{mode.name}</h3>
                  <p>{mode.description}</p>
                  <span className="players-badge">{mode.players} Players</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="action-cards-row">
            <div className="action-card ai-card" onClick={() => startGame({ id: 'ai', name: 'Play AI' })}>
              <h3>Play AI</h3>
              <p>Practice against the computer with adaptive difficulty</p>
              <button className="action-button">Start Game</button>
            </div>
            
            <div className="action-card learn-card" onClick={() => navigateTo('/learn')}>
              <h3>Learn</h3>
              <p>Master the game through puzzles and tutorials</p>
              <button className="action-button">Start Learning</button>
            </div>
            
            <div className="action-card friends-card" onClick={() => navigateTo('/friends')}>
              <h3>Add Friends</h3>
              <p>Find friends and challenge them to a match</p>
              <button className="action-button">Manage Friends</button>
            </div>
          </div>
        </div>
      </div>
      
      {loading && (
        <div className="loading-overlay">
          <div className="loading-content">
            <NetworkSphere />
            <p>Loading {gameMode?.name}...</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
