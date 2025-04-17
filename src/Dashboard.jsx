// Modified Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import './Dashboard.css';
import FriendsList from './FriendsList';
import NoiseBeforeDefeat from './components/NoiseBeforeDefeat';

function Dashboard() {
  const { currentUser } = useAuth();
  const [activeGame, setActiveGame] = useState(null);
  const [showFriendsList, setShowFriendsList] = useState(false);
  const [gameLoading, setGameLoading] = useState(false);

  // Player stats (for demo purposes; you may replace these values with dynamic data)
  const playerStats = {
    wins: 12,
    losses: 5,
    winRate: 70.6,
    eloRating: 1342,
  };

  // Game modes available
  const gameModes = [
    {
      id: 'flash',
      name: '2 Player Flash',
      description: '10 minute games, 40 seconds think limit',
      players: 2,
    },
    {
      id: 'standard',
      name: 'Standard',
      description: 'Classic gameplay with no time limits',
      players: 2,
    },
    {
      id: 'multiplayer',
      name: 'Battle Royale',
      description: 'Strategic complexity with multiple opponents',
      players: 4,
    },
  ];

  // Handle starting a game
  const handlePlayNow = (gameMode) => {
    setGameLoading(true);
    
    // Simulate loading time for WebAssembly module
    setTimeout(() => {
      setActiveGame(gameMode);
      setGameLoading(false);
    }, 1000);
  };

  // Handle exiting a game
  const handleExitGame = () => {
    setActiveGame(null);
  };
  
  // Handle game end with results
  const handleGameEnd = (results) => {
    console.log("Game ended:", results);
    // Here you would typically update the player stats
    // For now, we'll just exit the game
    setActiveGame(null);
  };

  // Loading screen for game initialization
  if (gameLoading) {
    return (
      <div className="dashboard-container">
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <h2>Loading Game...</h2>
          <p>Initializing WebAssembly core...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {!activeGame ? (
        // Dashboard view when no game is active
        <>
          <h1 className="dashboard-welcome">
            Welcome, {currentUser.displayName || 'Player'}!
          </h1>

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
              {gameModes.map((mode) => (
                <div key={mode.id} className="game-mode-card">
                  <h3 className="game-mode-title">{mode.name}</h3>
                  <p className="game-mode-description">{mode.description}</p>
                  <div className="game-mode-footer">
                    <span className="player-count">{mode.players} Players</span>
                    <button
                      className="action-button"
                      onClick={() => handlePlayNow(mode.id)}
                    >
                      Play Now
                    </button>
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
                <p className="action-description">
                  Practice against the computer with adaptive difficulty
                </p>
                <button className="action-button" onClick={() => handlePlayNow('ai')}>
                  Start Game
                </button>
              </div>

              <div className="action-card">
                <h3 className="action-title">Learn</h3>
                <p className="action-description">
                  Master the game through puzzles and tutorials
                </p>
                <button className="action-button">Start Learning</button>
              </div>

              <div className="action-card">
                <h3 className="action-title">Manage Friends</h3>
                <p className="action-description">
                  Find friends and challenge them to a match
                </p>
                <button
                  className="action-button"
                  onClick={() => setShowFriendsList(true)}
                >
                  Manage Friends
                </button>
              </div>
            </div>
          </section>
        </>
      ) : (
        // Game view when a game is active
        <div className="game-view">
          <div className="game-header">
            <h2>
              Noise Before Defeat -{' '}
              {gameModes.find((mode) => mode.id === activeGame)?.name || 'Game'}
            </h2>
            <button className="exit-game-button" onClick={handleExitGame}>
              Exit Game
            </button>
          </div>
          <div className="game-container">
            <NoiseBeforeDefeat
              gameMode={activeGame}
              onGameEnd={handleGameEnd}
              currentUser={currentUser}
            />
          </div>
        </div>
      )}

      {showFriendsList && (
        <div className="friends-modal-backdrop">
          <FriendsList
            currentUser={currentUser}
            onClose={() => setShowFriendsList(false)}
          />
        </div>
      )}
    </div>
  );
}

export default Dashboard;
