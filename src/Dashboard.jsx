import React from 'react';
import { useAuth } from './AuthContext';
import './Dashboard.css';

function Dashboard() {
  const { currentUser } = useAuth();
  
  // You would typically fetch user-specific data here
  // For now, using mock data
  const playerStats = {
    wins: 12,
    losses: 5,
    winRate: 70.6,
    eloRating: 1342
  };
  
  // Game modes available
  const gameModes = [
    {
      id: "2player-flash",
      name: "2 Player Flash",
      description: "10 minute games, 40 seconds think limit",
      players: 2
    },
    {
      id: "standard",
      name: "Standard",
      description: "Classic gameplay with no time limits",
      players: 2
    },
    {
      id: "multiplayer",
      name: "Battle Royale",
      description: "Strategic complexity with multiple opponents",
      players: 4
    }
  ];

  return (
    <div className="dashboard-container">
      <h1 className="dashboard-welcome">Welcome, {currentUser.displayName || 'Player'}</h1>
      
      {/* Player Stats Section */}
      <section className="stats-section">
        <h2 className="section-title">Player Stats</h2>
        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-value">{playerStats.wins}</div>
            <div className="stat-label">Wins</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{playerStats.losses}</div>
            <div className="stat-label">Losses</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{playerStats.winRate}%</div>
            <div className="stat-label">Win Rate</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{playerStats.eloRating}</div>
            <div className="stat-label">ELO Rating</div>
          </div>
        </div>
      </section>
      
      {/* Play Online Section */}
      <section className="play-section">
        <h2 className="section-title">Play Online</h2>
        <div className="game-modes">
          {gameModes.map(mode => (
            <div key={mode.id} className="game-mode-card">
              <h3 className="game-mode-title">{mode.name}</h3>
              <p className="game-mode-description">{mode.description}</p>
              <div className="game-mode-footer">
                <span className="player-count">{mode.players} Players</span>
                <button className="action-button">Play Now</button>
              </div>
            </div>
          ))}
        </div>
      </section>
      
      {/* Action Cards Section */}
      <section className="actions-section">
        <div className="action-cards">
          <div className="action-card">
            <h3 className="action-title">Play AI</h3>
            <p className="action-description">Practice against the computer with adaptive difficulty</p>
            <button className="action-button">Start Game</button>
          </div>
          
          <div className="action-card">
            <h3 className="action-title">Learn</h3>
            <p className="action-description">Master the game through puzzles and tutorials</p>
            <button className="action-button">Start Learning</button>
          </div>
          
          <div className="action-card">
            <h3 className="action-title">Add Friends</h3>
            <p className="action-description">Find friends and challenge them to a match</p>
            <button className="action-button">Manage Friends</button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Dashboard;
