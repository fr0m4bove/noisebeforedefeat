import React, { useState, useEffect, useRef, useCallback } from 'react';
import './NoiseBeforeDefeat.css';

const NoiseBeforeDefeat = ({ gameMode = "standard", onGameEnd, currentUser }) => {
  // Game constants
  const GRID_SIZE = 8;
  const CELL_SIZE = 50;
  const MAX_INFANTRY = 90;
  const MIN_GROUP_SIZE = 10;
  
  // Movement animation duration (ms)
  const MOVE_ANIMATION_DURATION = 500;

  // Board colors
  const LIGHT_CELL_COLOR = '#A3D3D6'; // Light blue
  const DARK_CELL_COLOR = '#FF9966';  // Dull orange
  const CENTER_CELL_COLOR = '#75BBCB80'; // Semi-transparent blue
  const HIGHLIGHT_COLOR = 'rgba(150, 150, 150, 0.5)'; // Gray for valid moves

  // Initial game state
  const initialGameState = {
    turn: 1,
    phase: "planning", // planning, executing, or gameOver
    timer: gameMode === "flash" ? 40 : null,
    activePlayer: 'p1', // For local testing, will be set by server in multiplayer
    players: {
      p1: {
        username: currentUser?.displayName || "Player 1",
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
        username: "Player 2", // Will be replaced with opponent's name in multiplayer
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
    splitPiece: null,
    validMoves: [],
    movingPiece: null,
    gameLog: []
  };

  // State initialization
  const [gameState, setGameState] = useState(initialGameState);
  const [showSplitPopup, setShowSplitPopup] = useState(false);
  const [splitAmount, setSplitAmount] = useState(0);
  const [splitGroupId, setSplitGroupId] = useState(null);
  const [animations, setAnimations] = useState({});
  const timerRef = useRef(null);
  const svgRef = useRef(null);

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

  // Effect for animation cleanup
  useEffect(() => {
    const animationTimeout = setTimeout(() => {
      if (Object.keys(animations).length > 0) {
        setAnimations({});
      }
    }, MOVE_ANIMATION_DURATION);
    
    return () => clearTimeout(animationTimeout);
  }, [animations]);

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

  // Convert grid coordinates to chess notation
  const gridToChessNotation = (x, y) => {
    // Convert x to letter (a-i)
    const file = String.fromCharCode(97 + (x + GRID_SIZE));
    // Convert y to number (1-9)
    const rank = GRID_SIZE - y;
    return { file, rank };
  };

  // Check if a cell is occupied
  const isCellOccupied = (x, y) => {
    // Check both players' infantry and other pieces
    for (const playerId of ['p1', 'p2']) {
      // Check infantry positions
      if (gameState.players[playerId].infantry.some(inf => 
        inf.position.x === x && inf.position.y === y)) {
        return true;
      }
      
      // Check node positions
      for (const nodeType in gameState.players[playerId].nodes) {
        const node = gameState.players[playerId].nodes[nodeType];
        if (node.position.x === x && node.position.y === y) {
          return true;
        }
      }
      
      // Check long range unit position
      const longRange = gameState.players[playerId].longRange;
      if (longRange.position.x === x && longRange.position.y === y) {
        return true;
      }
    }
    
    return false;
  };

  // Get valid adjacent moves for a position
  const getValidMoves = (position) => {
    const { x, y } = position;
    const directions = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 }
    ];
    
    return directions
      .map(dir => ({ x: x + dir.x, y: y + dir.y }))
      .filter(pos => isValidPosition(pos.x, pos.y) && !isCellOccupied(pos.x, pos.y));
  };

  // Handle clicking on a cell for movement
  const handleCellClick = (x, y) => {
    const position = { x, y };
    const playerId = gameState.activePlayer;
    
    // If we have a split piece waiting for placement
    if (gameState.splitPiece) {
      // Check if this is a valid move for the split piece
      if (gameState.validMoves.some(move => move.x === x && move.y === y)) {
        // Move the split piece to the new position
        createSplitUnit(position);
        
        // Clear valid moves and split piece state
        setGameState(prev => ({
          ...prev,
          splitPiece: null,
          validMoves: []
        }));
      }
      return;
    }
    
    // If we have a selected piece waiting for a move command
    if (gameState.selectedPiece) {
      // Check if this is a valid move
      if (gameState.validMoves.some(move => move.x === x && move.y === y)) {
        // Move the piece
        movePiece(gameState.selectedPiece, position);
      } else {
        // Deselect the piece if clicking elsewhere
        setGameState(prev => ({
          ...prev,
          selectedPiece: null,
          validMoves: []
        }));
      }
      return;
    }
    
    // If no piece is selected, check if there's a piece at this position
    if (!playerId) return;
    
    // Check for infantry
    const infantry = gameState.players[playerId].infantry.find(inf => 
      inf.position.x === x && inf.position.y === y);
    
    if (infantry) {
      // Get valid moves for this infantry
      const validMoves = getValidMoves(infantry.position);
      
      // Select the infantry and show valid moves
      setGameState(prev => ({
        ...prev,
        selectedPiece: { id: infantry.id, type: "infantry" },
        validMoves
      }));
      return;
    }
    
    // Check for long range unit
    const longRange = gameState.players[playerId].longRange;
    if (longRange.position.x === x && longRange.position.y === y) {
      // Get valid moves for long range unit
      const validMoves = getValidMoves(longRange.position);
      
      // Select the long range unit and show valid moves
      setGameState(prev => ({
        ...prev,
        selectedPiece: { id: `${playerId}-longrange`, type: "longrange" },
        validMoves
      }));
      return;
    }
  };

  // Move a piece to a new position
  const movePiece = (piece, newPosition) => {
    const playerId = gameState.activePlayer;
    
    // Start the animation
    setAnimations(prev => ({
      ...prev,
      [piece.id]: {
        fromPosition: null, // Will be set by the rendering function
        toPosition: newPosition
      }
    }));
    
    // After a brief delay for the animation to complete
    setTimeout(() => {
      setGameState(prev => {
        let updatedState = { ...prev };
        
        if (piece.type === "infantry") {
          // Update infantry position
          updatedState.players[playerId].infantry = prev.players[playerId].infantry.map(inf => {
            if (inf.id === piece.id) {
              return { ...inf, position: newPosition };
            }
            return inf;
          });
          
          // Add to move log
          updatedState.gameLog = [
            ...prev.gameLog,
            `${prev.players[playerId].username} moved infantry to ${newPosition.x},${newPosition.y}`
          ];
        } else if (piece.type === "longrange") {
          // Update long range position
          updatedState.players[playerId].longRange = {
            ...prev.players[playerId].longRange,
            position: newPosition
          };
          
          // Add to move log
          updatedState.gameLog = [
            ...prev.gameLog,
            `${prev.players[playerId].username} moved long range unit to ${newPosition.x},${newPosition.y}`
          ];
        }
        
        // Clear selection and valid moves
        updatedState.selectedPiece = null;
        updatedState.validMoves = [];
        
        return updatedState;
      });
    }, MOVE_ANIMATION_DURATION);
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
    const infantry = gameState.players[playerId].infantry.find(inf => inf.id === splitGroupId);
    const remainingCount = infantry.count - splitAmount;
    
    if (remainingCount < MIN_GROUP_SIZE) {
      setShowSplitPopup(false);
      return;
    }
    
    // Update the original group with reduced count
    setGameState(prev => {
      const updatedInfantry = prev.players[playerId].infantry.map(inf => {
        if (inf.id === splitGroupId) {
          return {
            ...inf,
            count: remainingCount,
            hp: remainingCount * 2,
            maxHp: remainingCount * 2
          };
        }
        return inf;
      });
      
      // Set up the split unit for placement
      return {
        ...prev,
        splitPiece: {
          parentId: splitGroupId,
          count: splitAmount,
          hp: splitAmount * 2,
          maxHp: splitAmount * 2
        },
        validMoves: getValidMoves(infantry.position),
        players: {
          ...prev.players,
          [playerId]: {
            ...prev.players[playerId],
            infantry: updatedInfantry
          }
        }
      };
    });
    
    // Close the split popup
    setShowSplitPopup(false);
  };

  // Create a new unit from split
  const createSplitUnit = (position) => {
    const playerId = gameState.activePlayer;
    const { parentId, count, hp, maxHp } = gameState.splitPiece;
    
    // Generate a unique ID for the new unit
    const newInfantryId = `${playerId}-inf-${Date.now()}`;
    
    // Create animation for the new unit
    const parentInfantry = gameState.players[playerId].infantry.find(inf => inf.id === parentId);
    
    setAnimations(prev => ({
      ...prev,
      [newInfantryId]: {
        fromPosition: parentInfantry.position,
        toPosition: position
      }
    }));
    
    // After animation delay, create the new unit
    setTimeout(() => {
      setGameState(prev => {
        // Create the new infantry group
        const newInfantry = {
          id: newInfantryId,
          position,
          count,
          hp,
          maxHp
        };
        
        // Add the new group to the player's infantry
        return {
          ...prev,
          players: {
            ...prev.players,
            [playerId]: {
              ...prev.players[playerId],
              infantry: [...prev.players[playerId].infantry, newInfantry]
            }
          },
          gameLog: [
            ...prev.gameLog,
            `${prev.players[playerId].username} split infantry group (${count} units)`
          ]
        };
      });
    }, MOVE_ANIMATION_DURATION);
  };

  // Generate the grid cells
  const generateGrid = () => {
    const cells = [];
    
    // Create board coordinates (chess-style)
    const ranks = [];
    const files = [];
    
    // Create a diamond shape using coordinate limits
    for (let y = -GRID_SIZE; y <= GRID_SIZE; y++) {
      for (let x = -GRID_SIZE; x <= GRID_SIZE; x++) {
        // Diamond shape constraint: |x| + |y| <= GRID_SIZE
        if (isValidPosition(x, y)) {
          const { x: svgX, y: svgY } = gridToSvg(x, y);
          const isCenter = x === 0 && y === 0;
          const isValidMoveTarget = gameState.validMoves.some(move => move.x === x && move.y === y);
          
          // Determine cell color
          let fillColor;
          if (isValidMoveTarget) {
            fillColor = HIGHLIGHT_COLOR;
          } else if (isCenter) {
            fillColor = CENTER_CELL_COLOR;
          } else {
            fillColor = (x + y) % 2 === 0 ? LIGHT_CELL_COLOR : DARK_CELL_COLOR;
          }
          
          cells.push(
            <rect
              key={`cell-${x},${y}`}
              x={svgX - CELL_SIZE/2}
              y={svgY - CELL_SIZE/2}
              width={CELL_SIZE}
              height={CELL_SIZE}
              fill={fillColor}
              stroke="none"
              onClick={() => handleCellClick(x, y)}
            />
          );
          
          // Collect ranks and files for coordinates
          if (y === GRID_SIZE && Math.abs(x) <= GRID_SIZE) {
            const { file } = gridToChessNotation(x, y);
            files.push({ x, file });
          }
          
          if (x === -GRID_SIZE && Math.abs(y) <= GRID_SIZE) {
            const { rank } = gridToChessNotation(x, y);
            ranks.push({ y, rank });
          }
        }
      }
    }
    
    // Add coordinate labels (chess style)
    files.forEach(({ x, file }) => {
      const { x: svgX, y: svgY } = gridToSvg(x, GRID_SIZE);
      cells.push(
        <text
          key={`file-${file}`}
          x={svgX}
          y={svgY + CELL_SIZE}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="12"
          fill="#333"
        >
          {file.toUpperCase()}
        </text>
      );
    });
    
    ranks.forEach(({ y, rank }) => {
      const { x: svgX, y: svgY } = gridToSvg(-GRID_SIZE, y);
      cells.push(
        <text
          key={`rank-${rank}`}
          x={svgX - CELL_SIZE/2}
          y={svgY}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="12"
          fill="#333"
        >
          {rank}
        </text>
      );
    });
    
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
    
    // Render split piece placeholder if needed
    if (gameState.splitPiece) {
      const playerId = gameState.activePlayer;
      const parentInfantry = gameState.players[playerId].infantry.find(inf => 
        inf.id === gameState.splitPiece.parentId);
      
      if (parentInfantry) {
        const { x, y } = parentInfantry.position;
        const { x: svgX, y: svgY } = gridToSvg(x, y);
        const playerColor = playerId === 'p1' ? '#5050ff' : '#ff5050';
        const sizeRatio = gameState.splitPiece.count / MAX_INFANTRY;
        const radius = Math.max(CELL_SIZE/5, CELL_SIZE/3 * sizeRatio);
        
        // Add a pulsing effect to the split piece
        units.push(
          <g key="split-placeholder" className="split-placeholder">
            <circle
              cx={svgX}
              cy={svgY}
              r={radius}
              fill={playerColor}
              fillOpacity={0.5}
              stroke="#ffffff"
              strokeWidth={2}
              strokeDasharray="5,5"
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
              {gameState.splitPiece.count}
            </text>
          </g>
        );
      }
    }
    
    // Render infantry for both players
    for (const playerId of ['p1', 'p2']) {
      const playerColor = playerId === 'p1' ? '#5050ff' : '#ff5050';
      
      // Render infantry groups
      gameState.players[playerId].infantry.forEach(infantry => {
        const { id, position, count } = infantry;
        let { x, y } = position;
        
        // Check if this piece is currently being animated
        if (animations[id]) {
          // Use the target position for rendering, animation will handle movement
          const targetPos = animations[id].toPosition;
          if (targetPos) {
            // Don't update actual position yet, just visual position
            x = targetPos.x;
            y = targetPos.y;
          }
        }
        
        const { x: svgX, y: svgY } = gridToSvg(x, y);
        const sizeRatio = count / MAX_INFANTRY;
        const radius = Math.max(CELL_SIZE/5, CELL_SIZE/3 * sizeRatio);
        const healthPercentage = infantry.hp / infantry.maxHp;
        
        // Determine health color
        let healthColor = '#00cc00'; // Green
        if (healthPercentage < 0.33) {
          healthColor = '#cc0000'; // Red
        } else if (healthPercentage < 0.66) {
          healthColor = '#cccc00'; // Yellow
        }
        
        // Selected highlight and animation attributes
        const isSelected = gameState.selectedPiece && 
                          gameState.selectedPiece.id === id;
        
        // Calculate animation properties
        let animationAttrs = {};
        if (animations[id]) {
          const fromPos = animations[id].fromPosition || position;
          const toPos = animations[id].toPosition;
          
          if (fromPos && toPos) {
            const fromSvg = gridToSvg(fromPos.x, fromPos.y);
            
            animationAttrs = {
              style: {
                animation: `move-piece ${MOVE_ANIMATION_DURATION}ms ease-in-out`,
                transformOrigin: `${svgX}px ${svgY}px`
              }
            };
          }
        }
        
        units.push(
          <g 
            key={id}
            onContextMenu={(e) => handleInfantryRightClick(e, id)}
            {...animationAttrs}
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
                  // Select this infantry and show valid moves
                  const validMoves = getValidMoves(position);
                  setGameState(prev => ({
                    ...prev,
                    selectedPiece: { id, type: "infantry" },
                    validMoves
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
              {count}
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
      let { x, y } = longRange.position;
      
      // Check if this piece is currently being animated
      const longRangeId = `${playerId}-longrange`;
      if (animations[longRangeId]) {
        // Use the target position for rendering, animation will handle movement
        const targetPos = animations[longRangeId].toPosition;
        if (targetPos) {
          x = targetPos.x;
          y = targetPos.y;
        }
      }
      
      const { x: svgX, y: svgY } = gridToSvg(x, y);
      const healthPercentage = longRange.hp / longRange.maxHp;
      
      // Determine health color
      let healthColor = '#00cc00'; // Green
      if (healthPercentage < 0.33) {
        healthColor = '#cc0000'; // Red
      } else if (healthPercentage < 0.66) {
        healthColor = '#cccc00'; // Yellow
      }
      
      // Selected highlight
      const isSelected = gameState.selectedPiece && 
                        gameState.selectedPiece.id === longRangeId;
      
      // Calculate animation properties
      let animationAttrs = {};
      if (animations[longRangeId]) {
        animationAttrs = {
          style: {
            animation: `move-piece ${MOVE_ANIMATION_DURATION}ms ease-in-out`,
            transformOrigin: `${svgX}px ${svgY}px`
          }
        };
      }
      
      units.push(
        <g 
          key={longRangeId}
          {...animationAttrs}
        >
          <rect
            x={svgX - CELL_SIZE/4}
            y={svgY - CELL_SIZE/4}
            width={CELL_SIZE/2}
            height={CELL_SIZE/2}
            fill={playerColor}
            stroke={isSelected ? '#ffffff' : '#333'}
            strokeWidth={isSelected ? 3 : 1}
            onClick={() => {
              if (gameState.activePlayer === playerId) {
                // Select this long range unit and show valid moves
                const validMoves = getValidMoves(longRange.position);
                setGameState(prev => ({
                  ...prev,
                  selectedPiece: { id: longRangeId, type: "longrange" },
                  validMoves
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
    
    // Render valid move indicators (gray circles)
    gameState.validMoves.forEach(move => {
      const { x, y } = move;
      const { x: svgX, y: svgY } = gridToSvg(x, y);
      
      units.push(
        <circle
          key={`valid-move-${x},${y}`}
          cx={svgX}
          cy={svgY}
          r={CELL_SIZE/6}
          fill="#999999"
          fillOpacity="0.5"
          stroke="none"
          onClick={() => handleCellClick(x, y)}
          className="valid-move-indicator"
        />
      );
    });
    
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
      activePlayer: prev.activePlayer === 'p1' ? 'p2' : 'p1',
      selectedPiece: null,
      validMoves: []
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
            <h3>{gameState.players.p1.username}</h3>
            <p>Intel: {gameState.players.p1.intelPoints} IP</p>
            <p>Status: {gameState.players.p1.ready ? 'Ready' : 'Planning'}</p>
          </div>
          
          <div className={`player p2 ${gameState.activePlayer === 'p2' ? 'active' : ''}`}>
            <h3>{gameState.players.p2.username}</h3>
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
        <button className="switch-player-button" onClick={toggleActivePlayer}>
          Switch to {gameState.activePlayer === 'p1' ? gameState.players.p2.username : gameState.players.p1.username}
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
    
    const playerId = gameState.activePlayer;
    const maxSplit = gameState.players[playerId]?.infantry.find(inf => inf.id === splitGroupId)?.count - MIN_GROUP_SIZE || 0;
    
    return (
      <div className="split-popup">
        <h3>Split Infantry Group</h3>
        <p>How many units to split off? (Min: {MIN_GROUP_SIZE})</p>
        <input 
          type="range" 
          min={MIN_GROUP_SIZE} 
          max={maxSplit} 
          value={splitAmount}
          onChange={(e) => setSplitAmount(parseInt(e.target.value))}
        />
        <div className="split-amounts">
          <span>New group: {splitAmount}</span>
          <span>Remaining: {maxSplit - splitAmount + MIN_GROUP_SIZE}</span>
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
      <div className="game-layout">
        {renderUI()}
        <div className="game-board">
          <svg 
            ref={svgRef}
            width={svgWidth} 
            height={svgHeight} 
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          >
            {generateGrid()}
            {renderNodes()}
            {renderInfantry()}
          </svg>
        </div>
      </div>
      {renderSplitPopup()}
    </div>
  );
};

export default NoiseBeforeDefeat;
