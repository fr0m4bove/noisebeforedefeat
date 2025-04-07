import React, { useState, useEffect, useRef, useCallback } from 'react';
import './NoiseBeforeDefeat.css';

const NoiseBeforeDefeat = ({ gameMode = "standard", onGameEnd }) => {
  // Game constants
  const GRID_SIZE = 8;
  const CELL_SIZE = 50;
  const MAX_INFANTRY = 90;
  const MIN_GROUP_SIZE = 10;

  // Initial game state
  const initialGameState = {
    turn: 1,
    phase: "planning", // planning, executing, or gameOver
    timer: gameMode === "flash" ? 40 : null,
    activePlayer: null, // For local testing, will be set by server in multiplayer
    players: {
      p1: {
        intelPoints: 100,
        nodes: {
          core: { 
            type: "core", 
            position: { x: 0, y: -4 }, 
            hp: 50, 
            maxHp: 50,
            defended: false 
          },
          comms: { 
            type: "comms", 
            position: { x: -1, y: -3 }, 
            hp: 50, 
            maxHp: 50,
            defended: false 
          },
          rd: { 
            type: "rd", 
            position: { x: 1, y: -3 }, 
            hp: 50, 
            maxHp: 50,
            defended: false 
          }
        },
        infantry: [
          { id: "p1-inf-1", position: { x: -1, y: -2 }, count: 45, hp: 90, maxHp: 90 },
          { id: "p1-inf-2", position: { x: 1, y: -2 }, count: 45, hp: 90, maxHp: 90 }
        ],
        longRange: { position: { x: 0, y: -2 }, hp: 10, maxHp: 10 },
        pendingMoves: [],
        ready: false
      },
      p2: {
        intelPoints: 100,
        nodes: {
          core: { 
            type: "core", 
            position: { x: 0, y: 4 }, 
            hp: 50, 
            maxHp: 50,
            defended: false 
          },
          comms: { 
            type: "comms", 
            position: { x: -1, y: 3 }, 
            hp: 50, 
            maxHp: 50,
            defended: false 
          },
          rd: { 
            type: "rd", 
            position: { x: 1, y: 3 }, 
            hp: 50, 
            maxHp: 50,
            defended: false 
          }
        },
        infantry: [
          { id: "p2-inf-1", position: { x: -1, y: 2 }, count: 45, hp: 90, maxHp: 90 },
          { id: "p2-inf-2", position: { x: 1, y: 2 }, count: 45, hp: 90, maxHp: 90 }
        ],
        longRange: { position: { x: 0, y: 2 }, hp: 10, maxHp: 10 },
        pendingMoves: [],
        ready: false
      }
    },
    selectedPiece: null,
    gameLog: []
  };

  // State initialization
  const [gameState, setGameState] = useState(initialGameState);
  const [showSplitPopup, setShowSplitPopup] = useState(false);
  const [splitAmount, setSplitAmount] = useState(0);
  const [splitGroupId, setSplitGroupId] = useState(null);
  const timerRef = useRef(null);

  // Execute all moves from both players
  const executeAllMoves = useCallback(() => {
    setGameState(prev => {
      // Create a new state for executing moves
      let newState = { ...prev, phase: "executing" };
      
      // Process each player's moves...
      // This would include movement, attacks, etc.
      
      // Reset ready state and increment turn
      newState = {
        ...newState,
        turn: newState.turn + 1,
        phase: "planning",
        timer: gameMode === "flash" ? 40 : null,
        players: {
          ...newState.players,
          p1: { ...newState.players.p1, ready: false, pendingMoves: [] },
          p2: { ...newState.players.p2, ready: false, pendingMoves: [] }
        }
      };

      return newState;
    });
  }, [gameMode]);

  // Effect for turn timer
  useEffect(() => {
    if (gameState.phase === "planning" && gameState.timer !== null) {
      timerRef.current = setInterval(() => {
        setGameState(prev => {
          if (prev.timer <= 1) {
            clearInterval(timerRef.current);
            // Auto-submit if time runs out
            return {
              ...prev,
              timer: 0,
              players: {
                ...prev.players,
                [prev.activePlayer]: {
                  ...prev.players[prev.activePlayer],
                  ready: true
                }
              }
            };
          }
          return { ...prev, timer: prev.timer - 1 };
        });
      }, 1000);
      
      return () => clearInterval(timerRef.current);
    }
  }, [gameState.phase, gameState.timer, gameState.activePlayer]);

  // Effect for checking if both players are ready
  useEffect(() => {
    const { p1, p2 } = gameState.players;
    if (p1.ready && p2.ready && gameState.phase === "planning") {
      // Execute moves
      executeAllMoves();
    }
  }, [gameState.players.p1.ready, gameState.players.p2.ready, executeAllMoves, gameState.phase, gameState.players]);

  // Grid to SVG coordinate conversion
  const gridToSvg = (x, y) => {
    const svgX = (GRID_SIZE * CELL_SIZE) + (x * CELL_SIZE);
    const svgY = (GRID_SIZE * CELL_SIZE) + (y * CELL_SIZE);
    return { x: svgX, y: svgY };
  };

  // Check if a position is within grid bounds
  const isValidPosition = (x, y) => {
    return Math.abs(x) + Math.abs(y) <= GRID_SIZE;
  };

  // Handle clicking on a cell
  const handleCellClick = (x, y) => {
    const position = { x, y };
    // If no piece is selected, try to select one
    if (!gameState.selectedPiece) {
      const playerId = gameState.activePlayer;
      if (!playerId) return;
      
      // Check if player's infantry is at this position
      const infantry = gameState.players[playerId].infantry.find(inf => 
        inf.position.x === x && inf.position.y === y);
      
      if (infantry) {
        setGameState(prev => ({
          ...prev,
          selectedPiece: { id: infantry.id, type: "infantry" }
        }));
      }
    } else {
      // A piece is selected, check if this is a valid move
      const { selectedPiece } = gameState;
      const playerId = gameState.activePlayer;
      
      if (selectedPiece.type === "infantry") {
        const infantry = gameState.players[playerId].infantry.find(inf => 
          inf.id === selectedPiece.id);
        
        // Check if target position is adjacent
        const dx = Math.abs(infantry.position.x - x);
        const dy = Math.abs(infantry.position.y - y);
        
        if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) {
          // Valid move - add to pending moves
          setGameState(prev => {
            const updatedPendingMoves = [
              ...prev.players[playerId].pendingMoves,
              { 
                type: "move", 
                pieceId: selectedPiece.id, 
                from: infantry.position, 
                to: position 
              }
            ];
            
            return {
              ...prev,
              selectedPiece: null,
              players: {
                ...prev.players,
                [playerId]: {
                  ...prev.players[playerId],
                  pendingMoves: updatedPendingMoves
                }
              }
            };
          });
        }
      }
    }
  };

  // Handle right-click on infantry for splitting
  const handleInfantryRightClick = (event, infantryId) => {
    event.preventDefault();
    
    const playerId = gameState.activePlayer;
    if (!playerId) return;
    
    const infantry = gameState.players[playerId].infantry.find(inf => inf.id === infantryId);
    if (infantry && infantry.count > MIN_GROUP_SIZE * 2) {
      setSplitGroupId(infantryId);
      setSplitAmount(Math.floor(infantry.count / 2));
      setShowSplitPopup(true);
    }
  };

  // Handle splitting infantry group
  const handleSplitConfirm = () => {
    if (splitAmount < MIN_GROUP_SIZE || !splitGroupId) {
      setShowSplitPopup(false);
      return;
    }
    
    const playerId = gameState.activePlayer;
    setGameState(prev => {
      const infantry = prev.players[playerId].infantry.find(inf => inf.id === splitGroupId);
      const remainingCount = infantry.count - splitAmount;
      
      if (remainingCount < MIN_GROUP_SIZE) {
        setShowSplitPopup(false);
        return prev;
      }
      
      // Create a new infantry group
      const newInfantryId = `${playerId}-inf-${Date.now()}`;
      const newInfantry = {
        id: newInfantryId,
        position: { ...infantry.position },
        count: splitAmount,
        hp: splitAmount * 2, // 2 HP per unit
        maxHp: splitAmount * 2
      };
      
      // Update the original group
      const updatedInfantry = {
        ...infantry,
        count: remainingCount,
        hp: remainingCount * 2,
        maxHp: remainingCount * 2
      };
      
      const updatedInfantryList = prev.players[playerId].infantry.map(inf => 
        inf.id === splitGroupId ? updatedInfantry : inf
      );
      
      // Add the new group
      updatedInfantryList.push(newInfantry);
      
      return {
        ...prev,
        players: {
          ...prev.players,
          [playerId]: {
            ...prev.players[playerId],
            infantry: updatedInfantryList
          }
        }
      };
    });
    
    setShowSplitPopup(false);
  };

  // Generate the grid cells
  const generateGrid = () => {
    const cells = [];
    // Create a diamond shape using coordinate limits
    for (let y = -GRID_SIZE; y <= GRID_SIZE; y++) {
      for (let x = -GRID_SIZE; x <= GRID_SIZE; x++) {
        // Diamond shape constraint: |x| + |y| <= GRID_SIZE
        if (isValidPosition(x, y)) {
          const { x: svgX, y: svgY } = gridToSvg(x, y);
          const isCenter = x === 0 && y === 0;
          
          cells.push(
            <rect
              key={`cell-${x},${y}`}
              x={svgX - CELL_SIZE/2}
              y={svgY - CELL_SIZE/2}
              width={CELL_SIZE}
              height={CELL_SIZE}
              fill={isCenter ? '#8bc34a80' : ((x + y) % 2 === 0 ? '#f5f5dc' : '#8bc34a')}
              stroke="#333"
              strokeWidth="1"
              onClick={() => handleCellClick(x, y)}
            />
          );
          
          // Add coordinate labels for debugging
          if (x % 2 === 0 && y % 2 === 0) {
            cells.push(
              <text
                key={`text-${x},${y}`}
                x={svgX}
                y={svgY}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="10"
                fill="#333"
              >
                {x},{y}
              </text>
            );
          }
        }
      }
    }
    return cells;
  };

  // Render game nodes (Core, R&D, Comms)
  const renderNodes = () => {
    const nodes = [];
    
    // Function to render a single node
    const renderNode = (playerId, nodeType, node) => {
      const { x, y } = node.position;
      const { x: svgX, y: svgY } = gridToSvg(x, y);
      const playerColor = playerId === 'p1' ? '#5050ff' : '#ff5050';
      const healthPercentage = node.hp / node.maxHp;
      
      // Determine color based on health percentage
      let healthColor = '#00cc00'; // Green
      if (healthPercentage < 0.33) {
        healthColor = '#cc0000'; // Red
      } else if (healthPercentage < 0.66) {
        healthColor = '#cccc00'; // Yellow
      }
      
      let nodeShape;
      if (nodeType === 'core') {
        // Hourglass shape for Core
        nodeShape = (
          <path
            d={`M ${svgX - CELL_SIZE/3} ${svgY - CELL_SIZE/3} L ${svgX + CELL_SIZE/3} ${svgY - CELL_SIZE/3} L ${svgX - CELL_SIZE/3} ${svgY + CELL_SIZE/3} L ${svgX + CELL_SIZE/3} ${svgY + CELL_SIZE/3} Z`}
            fill={playerColor}
            stroke={node.defended ? '#ffcc00' : '#333'}
            strokeWidth={node.defended ? 3 : 1}
          />
        );
      } else {
        // Triangle shape for Comms and R&D
        const direction = playerId === 'p1' ? -1 : 1; // Pointing direction
        nodeShape = (
          <polygon
            points={`${svgX},${svgY - direction * CELL_SIZE/3} ${svgX - CELL_SIZE/3},${svgY + direction * CELL_SIZE/6} ${svgX + CELL_SIZE/3},${svgY + direction * CELL_SIZE/6}`}
            fill={playerColor}
            stroke={node.defended ? '#ffcc00' : '#333'}
            strokeWidth={node.defended ? 3 : 1}
          />
        );
      }
      
      return (
        <g key={`${playerId}-${nodeType}`}>
          {nodeShape}
          <text
            x={svgX}
            y={svgY}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="white"
            fontSize="10"
            fontWeight="bold"
          >
            {nodeType === 'core' ? 'CR' : nodeType === 'comms' ? 'CM' : 'RD'}
          </text>
          {/* Health bar */}
          <rect
            x={svgX - CELL_SIZE/3}
            y={svgY + CELL_SIZE/4}
            width={CELL_SIZE*2/3}
            height={5}
            fill="#333"
          />
          <rect
            x={svgX - CELL_SIZE/3}
            y={svgY + CELL_SIZE/4}
            width={CELL_SIZE*2/3 * healthPercentage}
            height={5}
            fill={healthColor}
          />
        </g>
      );
    };
    
    // Render all nodes for both players
    for (const playerId of ['p1', 'p2']) {
      for (const [nodeType, node] of Object.entries(gameState.players[playerId].nodes)) {
        nodes.push(renderNode(playerId, nodeType, node));
      }
    }
    
    return nodes;
  };

  // Render infantry units
  const renderInfantry = () => {
    const units = [];
    
    // Render infantry for both players
    for (const playerId of ['p1', 'p2']) {
      const playerColor = playerId === 'p1' ? '#5050ff' : '#ff5050';
      
      // Render infantry groups
      gameState.players[playerId].infantry.forEach(infantry => {
        const { x, y } = infantry.position;
        const { x: svgX, y: svgY } = gridToSvg(x, y);
        const sizeRatio = infantry.count / MAX_INFANTRY;
        const radius = Math.max(CELL_SIZE/5, CELL_SIZE/3 * sizeRatio);
        const healthPercentage = infantry.hp / infantry.maxHp;
        
        // Determine health color
        let healthColor = '#00cc00'; // Green
        if (healthPercentage < 0.33) {
          healthColor = '#cc0000'; // Red
        } else if (healthPercentage < 0.66) {
          healthColor = '#cccc00'; // Yellow
        }
        
        // Selected highlight
        const isSelected = gameState.selectedPiece && 
                          gameState.selectedPiece.id === infantry.id;
        
        units.push(
          <g 
            key={infantry.id} 
            onContextMenu={(e) => handleInfantryRightClick(e, infantry.id)}
          >
            <circle
              cx={svgX}
              cy={svgY}
              r={radius}
              fill={playerColor}
              stroke={isSelected ? '#ffffff' : '#333'}
              strokeWidth={isSelected ? 3 : 1}
              onClick={() => {
                if (gameState.activePlayer === playerId) {
                  setGameState(prev => ({
                    ...prev,
                    selectedPiece: { id: infantry.id, type: "infantry" }
                  }));
                }
              }}
            />
            <text
              x={svgX}
              y={svgY}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="white"
              fontSize="10"
              fontWeight="bold"
            >
              {infantry.count}
            </text>
            {/* Health bar */}
            <rect
              x={svgX - radius}
              y={svgY + radius + 2}
              width={radius * 2}
              height={4}
              fill="#333"
            />
            <rect
              x={svgX - radius}
              y={svgY + radius + 2}
              width={radius * 2 * healthPercentage}
              height={4}
              fill={healthColor}
            />
          </g>
        );
      });
      
      // Render long range unit
      const longRange = gameState.players[playerId].longRange;
      const { x, y } = longRange.position;
      const { x: svgX, y: svgY } = gridToSvg(x, y);
      const healthPercentage = longRange.hp / longRange.maxHp;
      
      // Determine health color
      let healthColor = '#00cc00'; // Green
      if (healthPercentage < 0.33) {
        healthColor = '#cc0000'; // Red
      } else if (healthPercentage < 0.66) {
        healthColor = '#cccc00'; // Yellow
      }
      
      units.push(
        <g key={`${playerId}-longrange`}>
          <rect
            x={svgX - CELL_SIZE/4}
            y={svgY - CELL_SIZE/4}
            width={CELL_SIZE/2}
            height={CELL_SIZE/2}
            fill={playerColor}
            stroke="#333"
            strokeWidth="1"
          />
          <text
            x={svgX}
            y={svgY}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="white"
            fontSize="10"
            fontWeight="bold"
          >
            LR
          </text>
          {/* Health bar */}
          <rect
            x={svgX - CELL_SIZE/4}
            y={svgY + CELL_SIZE/4 + 2}
            width={CELL_SIZE/2}
            height={4}
            fill="#333"
          />
          <rect
            x={svgX - CELL_SIZE/4}
            y={svgY + CELL_SIZE/4 + 2}
            width={CELL_SIZE/2 * healthPercentage}
            height={4}
            fill={healthColor}
          />
        </g>
      );
    }
    
    return units;
  };

  // Handle the Ready button click
  const handleReadyClick = () => {
    const playerId = gameState.activePlayer;
    if (!playerId) return;
    
    setGameState(prev => ({
      ...prev,
      players: {
        ...prev.players,
        [playerId]: {
          ...prev.players[playerId],
          ready: true
        }
      }
    }));
  };

  // For local play, toggle active player
  const toggleActivePlayer = () => {
    setGameState(prev => ({
      ...prev,
      activePlayer: prev.activePlayer === 'p1' ? 'p2' : 'p1'
    }));
  };

  // Render UI elements
  const renderUI = () => {
    return (
      <div className="game-controls">
        <div className="turn-info">
          <h3>Turn {gameState.turn}</h3>
          {gameState.timer !== null && (
            <div className="timer">Time: {gameState.timer}s</div>
          )}
        </div>
        
        <div className="player-info">
          <div className={`player p1 ${gameState.activePlayer === 'p1' ? 'active' : ''}`}>
            <h3>Player 1</h3>
            <p>Intel: {gameState.players.p1.intelPoints} IP</p>
            <p>Status: {gameState.players.p1.ready ? 'Ready' : 'Planning'}</p>
          </div>
          
          <div className={`player p2 ${gameState.activePlayer === 'p2' ? 'active' : ''}`}>
            <h3>Player 2</h3>
            <p>Intel: {gameState.players.p2.intelPoints} IP</p>
            <p>Status: {gameState.players.p2.ready ? 'Ready' : 'Planning'}</p>
          </div>
        </div>
        
        {/* Only show ready button for active player who isn't ready */}
        {gameState.activePlayer && !gameState.players[gameState.activePlayer].ready && (
          <button className="ready-button" onClick={handleReadyClick}>
            Ready
          </button>
        )}
        
        {/* For testing - toggle active player */}
        <button onClick={toggleActivePlayer}>
          Switch to {gameState.activePlayer === 'p1' ? 'Player 2' : 'Player 1'}
        </button>
        
        <div className="game-log">
          <h3>Game Log</h3>
          <div className="log-entries">
            {gameState.gameLog.length > 0 ? (
              gameState.gameLog.map((log, index) => (
                <p key={index}>{log}</p>
              ))
            ) : (
              <p>Game started. Make your move!</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Split popup dialog
  const renderSplitPopup = () => {
    if (!showSplitPopup) return null;
    
    return (
      <div className="split-popup">
        <h3>Split Infantry Group</h3>
        <p>How many units to split off? (Min: {MIN_GROUP_SIZE})</p>
        <input 
          type="range" 
          min={MIN_GROUP_SIZE} 
          max={gameState.players[gameState.activePlayer]?.infantry.find(inf => inf.id === splitGroupId)?.count - MIN_GROUP_SIZE || 0} 
          value={splitAmount}
          onChange={(e) => setSplitAmount(parseInt(e.target.value))}
        />
        <div className="split-amounts">
          <span>New group: {splitAmount}</span>
          <span>Remaining: {gameState.players[gameState.activePlayer]?.infantry.find(inf => inf.id === splitGroupId)?.count - splitAmount || 0}</span>
        </div>
        <div className="split-buttons">
          <button onClick={handleSplitConfirm}>Confirm</button>
          <button onClick={() => setShowSplitPopup(false)}>Cancel</button>
        </div>
      </div>
    );
  };

  // Calculate the SVG dimensions
  const svgWidth = (GRID_SIZE * 2 + 1) * CELL_SIZE;
  const svgHeight = (GRID_SIZE * 2 + 1) * CELL_SIZE;

  return (
    <div className="noise-game-container">
      <div className="game-board">
        <svg 
          width={svgWidth} 
          height={svgHeight} 
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        >
          {generateGrid()}
          {renderNodes()}
          {renderInfantry()}
        </svg>
      </div>
      {renderUI()}
      {renderSplitPopup()}
    </div>
  );
};

export default NoiseBeforeDefeat;
