import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import NetworkSphere from './NetworkSphere';
import './Game.css';

function Game() {
  const { modeId } = useParams();
  const [loading, setLoading] = useState(true);
  const [gameState, setGameState] = useState(null);
  
  // Game mode details
  const gameModes = {
    flash: {
      name: '2 Player Flash',
      description: '10 minute games, 40 seconds think limit',
      players: 2
    },
    standard: {
      name: '2 Player Standard',
      description: 'Classic gameplay with no time limits',
      players: 2
    },
    threeplayer: {
      name: '3 Player Mode',
      description: 'Strategic complexity with three opponents',
      players: 3
    },
    fiveplayer: {
      name: '5 Player Mode',
      description: 'Chaos and alliances in a five-way battle',
      players: 5
    },
    ai: {
      name: 'Play AI',
      description: 'Practice against the computer with adaptive difficulty',
      players: 2
    }
  };
  
  const currentMode = gameModes[modeId] || {
    name: 'Unknown Mode',
    description: 'This game mode is not recognized',
    players: 2
  };
  
  // Simulate game loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
      setGameState({
        status: 'waiting',
        message: 'Waiting for game implementation...'
      });
    }, 3000);
    
    return () => clearTimeout(timer);
  }, []);
  
  if (loading) {
    return (
      <div className="game-loading">
        <NetworkSphere />
        <p>Initializing {currentMode.name}...</p>
      </div>
    );
  }
  
  return (
    <div className="game-container">
      <div className="game-header">
        <h1>{currentMode.name}</h1>
        <p>{currentMode.description}</p>
      </div>
      
      <div className="game-placeholder">
        <div className="placeholder-message">
          <h2>Game Implementation Coming Soon</h2>
          <p>The game mechanics are currently in development.</p>
          <p>This will be where the {currentMode.players}-player game board appears.</p>
        </div>
      </div>
    </div>
  );
}

export default Game;
