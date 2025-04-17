import React, { useState, useEffect, useRef } from 'react';
import gameInterface from './GameInterface';
import './NoiseBeforeDefeat.css';
import GameBoard from './GameBoard';
import ActionPanel from './ActionPanel';
import InfoPanel from './InfoPanel';
import GameLog from './GameLog';
import ResultModal from './ResultModal';

const NoiseBeforeDefeat = ({ gameMode = "standard", onGameEnd, currentUser }) => {
  // Constants
  const GRID_SIZE = 8;
  const CELL_SIZE = 50;
  
  // State
  const [gameData, setGameData] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [selectedAction, setSelectedAction] = useState(null);
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [validMoves, setValidMoves] = useState([]);
  const [showResultModal, setShowResultModal] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Refs
  const svgRef = useRef(null);
  
  // Initialize the game
  useEffect(() => {
    const initGame = async () => {
      try {
        await gameInterface.initialize();
        
        // Set callback for game state updates
        gameInterface.setUpdateCallback((data) => {
          setGameData(data);
          
          // Check for game over
          if (data.isGameOver) {
            setShowResultModal(true);
          }
        });
        
        // Start the game
        gameInterface.startGame(
          currentUser?.displayName || "Player 1", 
          "Player 2"
        );
        
        setIsInitialized(true);
        setLoading(false);
      } catch (error) {
        console.error("Error initializing game:", error);
        setLoading(false);
      }
    };
    
    initGame();
  }, [currentUser]);
  
  // Handle action selection
  const handleActionSelection = (action) => {
    if (selectedAction === action) {
      setSelectedAction(null);
      setSelectedPosition(null);
      setValidMoves([]);
    } else {
      setSelectedAction(action);
      setSelectedPosition(null);
      setValidMoves([]);
    }
  };
  
  // Handle cell click on the board
  const handleCellClick = (x, y) => {
    if (!gameData) return;
    const activePlayer = gameData.phase === 0 ? gameData.currentTurn % 2 : -1;
    
    if (activePlayer < 0) return; // Not in planning phase
    
    if (selectedAction) {
      if (selectedPosition) {
        // Second click with action and position selected - execute action
        gameInterface.submitAction(activePlayer, selectedAction, x, y);
        setSelectedAction(null);
        setSelectedPosition(null);
        setValidMoves([]);
      } else {
        // First click with action selected - select position
        setSelectedPosition({ x, y });
        
        // Calculate valid moves based on action and position
        const moves = calculateValidMoves(selectedAction, { x, y }, gameData);
        setValidMoves(moves);
      }
    } else {
      // Just selecting a cell
      setSelectedPosition({ x, y });
    }
  };
  
  // Handle ready button click
  const handleReadyClick = () => {
    if (!gameData) return;
    const activePlayer = gameData.currentTurn % 2;
    
    // In a real implementation, this would mark the player as ready
    // For now, just end the turn
    gameInterface.endTurn();
  };
  
  // Handle game end
  const handleGameEnd = () => {
    if (onGameEnd && gameData) {
      onGameEnd({
        winner: gameData.winner === 0 ? 
          gameData.players[0].name : gameData.players[1].name,
        loser: gameData.winner === 0 ? 
          gameData.players[1].name : gameData.players[0].name,
        eloChange: 25 // Placeholder for ELO change
      });
    }
    
    setShowResultModal(false);
  };
  
  // Helper function to calculate valid moves
  const calculateValidMoves = (action, position, gameData) => {
    // This is a simplified implementation
    // In a real game, this would be handled by the C++ logic
    const moves = [];
    
    if (action === 'move') {
      // Add all adjacent cells as valid moves
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue;
          
          const newX = position.x + dx;
          const newY = position.y + dy;
          
          // Check if valid position (within board bounds)
          if (Math.abs(newX) + Math.abs(newY) <= GRID_SIZE) {
            // Check if cell is occupied (simplified)
            let isOccupied = false;
            
            // In a real implementation, we would check for occupancy
            // For now, we'll just add it as a valid move
            if (!isOccupied) {
              moves.push({ x: newX, y: newY });
            }
          }
        }
      }
    } else if (action === 'attack' || action === 'hack') {
      // Add nearby cells as potential targets
      const range = action === 'attack' ? 1 : 3;
      
      for (let dx = -range; dx <= range; dx++) {
        for (let dy = -range; dy <= range; dy++) {
          if (dx === 0 && dy === 0) continue;
          if (Math.abs(dx) + Math.abs(dy) > range) continue;
          
          const newX = position.x + dx;
          const newY = position.y + dy;
          
          // Check if valid position (within board bounds)
          if (Math.abs(newX) + Math.abs(newY) <= GRID_SIZE) {
            moves.push({ x: newX, y: newY });
          }
        }
      }
    }
    
    return moves;
  };
  
  // Loading screen
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Initializing game...</p>
      </div>
    );
  }
  
  // Game not initialized
  if (!isInitialized || !gameData) {
    return (
      <div className="error-container">
        <p>Error initializing game. Please refresh the page and try again.</p>
      </div>
    );
  }
  
  // Get active player
  const activePlayerId = gameData.phase === 0 ? gameData.currentTurn % 2 : -1;
  const activePlayer = activePlayerId >= 0 ? gameData.players[activePlayerId] : null;
  
  return (
    <div className="noise-game-container">
      <div className="game-header">
        <h1 className="game-title">Noise Before Defeat - {gameMode.charAt(0).toUpperCase() + gameMode.slice(1)} Mode</h1>
        <h4 className="game-subtitle">A Noah Riordan Production</h4>
      </div>
      
      <div className="game-layout">
        <div className="game-controls">
          <div className="turn-info">
            <h3>Turn: {gameData.currentTurn} | Phase: {gameData.phase === 0 ? 'Planning' : 'Executing'}</h3>
            {gameMode === "flash" && <div className="timer">40s</div>}
          </div>
          
          <InfoPanel
            players={gameData.players}
            activePlayerId={activePlayerId}
          />
          
          <ActionPanel
            activePlayer={activePlayer}
            selectedAction={selectedAction}
            onActionSelect={handleActionSelection}
            onReadyClick={handleReadyClick}
            disabled={gameData.phase !== 0}
          />
          
          <GameLog gameLog={gameData.gameLog} />
        </div>
        
        <div className="board-container">
          <GameBoard
            ref={svgRef}
            gridSize={GRID_SIZE}
            cellSize={CELL_SIZE}
            players={gameData.players}
            selectedPosition={selectedPosition}
            validMoves={validMoves}
            onCellClick={handleCellClick}
          />
        </div>
      </div>
      
      {showResultModal && (
        <ResultModal
          winner={gameData.winner === 0 ? gameData.players[0].name : gameData.players[1].name}
          loser={gameData.winner === 0 ? gameData.players[1].name : gameData.players[0].name}
          eloChange={25} // Placeholder
          onClose={handleGameEnd}
        />
      )}
    </div>
  );
};

export default NoiseBeforeDefeat;
