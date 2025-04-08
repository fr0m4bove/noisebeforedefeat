import React, { useState, useEffect, useRef, useCallback } from 'react';
import './NoiseBeforeDefeat.css';
import ChatBox from './ChatBox';

const NoiseBeforeDefeat = ({ gameMode = "standard", onGameEnd, currentUser }) => {
  // Game constants
  const GRID_SIZE = 8;
  const CELL_SIZE = 50;
  const MAX_INFANTRY = 90;
  const MIN_GROUP_SIZE = 10;
  const MOVES_PER_TURN = 2;
  const IP_GAIN_CENTER_SQUARE = 10;
  const HACK_COST = 40;
  const DEFAULT_ELO = 500;
  
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
    currentTurnMoves: 0,
    selectedAction: null, // 'move', 'attack', 'hack', etc.
    attackSource: null,
    centerControllers: {
      p1: false,
      p2: false
    },
    winner: null,
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
        longRange: { id: "p1-lr", position: { x: 0, y: -2 }, count: 5, hp: 10, maxHp: 10 },
        pendingMoves: [],
        ready: false,
        elo: DEFAULT_ELO,
        consecutiveLosses: 0,
        matchHistory: [],
        performance: {
          wins: 0,
          losses: 0,
          draws: 0,
          rating: 'N/A' // A, B, C, D, F
        }
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
        longRange: { id: "p2-lr", position: { x: 0, y: 2 }, count: 5, hp: 10, maxHp: 10 },
        pendingMoves: [],
        ready: false,
        elo: DEFAULT_ELO,
        consecutiveLosses: 0,
        matchHistory: [],
        performance: {
          wins: 0,
          losses: 0,
          draws: 0,
          rating: 'N/A' // A, B, C, D, F
        }
      }
    },
    selectedPiece: null,
    splitPiece: null,
    validMoves: [],
    movingPiece: null,
    gameLog: [],
    surroundAttackMode: false,
    surroundAttackSources: [],
    surroundAttackTarget: null
  };

  // State initialization
  const [gameState, setGameState] = useState(initialGameState);
  const [showSplitPopup, setShowSplitPopup] = useState(false);
  const [splitAmount, setSplitAmount] = useState(0);
  const [splitGroupId, setSplitGroupId] = useState(null);
  const [animations, setAnimations] = useState({});
  const [chatMessages, setChatMessages] = useState([]);
  const [gameLogSaved, setGameLogSaved] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [opponentId, setOpponentId] = useState(null);
  const [consecutiveLosses, setConsecutiveLosses] = useState(0);
  const [newChatMessage, setNewChatMessage] = useState('');
  const timerRef = useRef(null);
  const svgRef = useRef(null);
  const chatEndRef = useRef(null);
  const gameLogRef = useRef([]);
  
  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  // Keep gameLogRef in sync with gameState.gameLog
  useEffect(() => {
    gameLogRef.current = gameState.gameLog;
  }, [gameState.gameLog]);

  // Calculate damage based on unit type and count
  const calculateDamage = (attacker, target) => {
    const { type, count } = attacker;
    
    if (type === 'infantry') {
      // Infantry damage calculation
      if (target.type === 'infantry') {
        return Math.min(15, count / 3); // Base infantry damage
      } else if (target.type === 'core') {
        return Math.min(20, count / 2);
      } else {
        return Math.min(10, count / 4);
      }
    } else if (type === 'longrange') {
      // Long range damage calculation based on group size
      if (target.type === 'infantry') {
        return count * 2; // 2 damage per piece in group
      } else if (target.type === 'core') {
        return count >= 2 ? 35 : 1; // 35 damage if 2+ pieces, otherwise 1
      } else {
        return count >= 2 ? 5 : 1; // 5 damage if 2+ pieces, otherwise 1
      }
    }
    
    return 0;
  };

  // Check if a position is the center square
  const isCenterSquare = (position) => {
    return position.x === 0 && position.y === 0;
  };

  // Check if a target is within attack range
  const isInAttackRange = (source, target, attackerType) => {
    const dx = Math.abs(source.x - target.x);
    const dy = Math.abs(source.y - target.y);
    
    if (attackerType === 'infantry') {
      // Infantry can attack adjacent squares (including diagonals)
      return dx <= 1 && dy <= 1 && !(dx === 0 && dy === 0);
    } else if (attackerType === 'longrange') {
      // Long range can attack up to 3 squares away
      return dx + dy <= 3 && !(dx === 0 && dy === 0);
    }
    
    return false;
  };

  // Process end of turn and apply effects
  const processTurnEnd = (state) => {
    // Apply center square IP bonus
    for (const playerId of ['p1', 'p2']) {
      if (state.centerControllers[playerId]) {
        state.players[playerId].intelPoints += IP_GAIN_CENTER_SQUARE;
        state.gameLog.push(
          `${state.players[playerId].username} gained ${IP_GAIN_CENTER_SQUARE} IP from controlling the center`
        );
      }
    }
    
    // Reset move counter for next turn
    state.currentTurnMoves = 0;
    
    // Switch active player for the next turn
    state.activePlayer = state.activePlayer === 'p1' ? 'p2' : 'p1';
    
    return state;
  };

  // Save game log to a file
  const saveGameLog = () => {
    if (gameLogSaved) return;
    
    const logData = {
      timestamp: new Date().toISOString(),
      players: {
        p1: gameState.players.p1.username,
        p2: gameState.players.p2.username
      },
      winner: gameState.winner ? gameState.players[gameState.winner].username : null,
      moves: gameLogRef.current
    };
    
    // Convert to JSON string
    const logJson = JSON.stringify(logData, null, 2);
    
    // Create a blob and download link
    const blob = new Blob([logJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `game-log-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // Mark log as saved
    setGameLogSaved(true);
  };

  // Calculate ELO rating adjustment
  const calculateEloAdjustment = (winner, loser) => {
    const expectedScore = 1 / (1 + Math.pow(10, (loser.elo - winner.elo) / 400));
    
    // Base ELO change - higher difference means smaller change for expected result
    let eloChange = 25 * (1 - expectedScore);
    
    // Adjust for consecutive losses
    if (loser.consecutiveLosses >= 1) {
      eloChange *= 1 + (0.2 * Math.min(loser.consecutiveLosses, 5));
    }
    
    // Cap maximum change
    eloChange = Math.min(Math.max(eloChange, 15), 100);
    
    return Math.round(eloChange);
  };

  // Grade performance based on game result
  const gradePerformance = (player, opponent, isWinner) => {
    if (!isWinner) {
      // Losing grades: D or F based on how close the game was
      const coreHealth = opponent.nodes.core.hp / opponent.nodes.core.maxHp;
      return coreHealth < 0.3 ? 'D' : 'F';
    }
    
    // Winning grades: A, B, or C based on remaining health
    const totalMaxHp = player.nodes.core.maxHp + player.nodes.comms.maxHp + player.nodes.rd.maxHp;
    const currentHp = player.nodes.core.hp + player.nodes.comms.hp + player.nodes.rd.hp;
    const healthRatio = currentHp / totalMaxHp;
    
    if (healthRatio > 0.8) return 'A';
    if (healthRatio > 0.5) return 'B';
    return 'C';
  };

  // Execute all moves from both players
  const executeAllMoves = useCallback(() => {
    setGameState(prev => {
      // Create a new state for executing moves
      let newState = { ...prev, phase: "executing" };
      
      // Process end of turn
      processTurnEnd(newState);
      
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
      { x: 0, y: -1 },
      { x: 1, y: 1 },  // Diagonal moves
      { x: 1, y: -1 },
      { x: -1, y: 1 },
      { x: -1, y: -1 }
    ];
    
    return directions
      .map(dir => ({ x: x + dir.x, y: y + dir.y }))
      .filter(pos => isValidPosition(pos.x, pos.y) && !isCellOccupied(pos.x, pos.y));
  };

  // Set the selected action
  const handleActionSelection = (action) => {
    setGameState(prev => {
      // If we're already in this mode, cancel it
      if (prev.selectedAction === action) {
        return {
          ...prev,
          selectedAction: null,
          selectedPiece: null,
          attackSource: null,
          validMoves: [],
          surroundAttackMode: false,
          surroundAttackSources: [],
          surroundAttackTarget: null
        };
      }
      
      // Otherwise, set the new action mode
      return {
        ...prev,
        selectedAction: action,
        selectedPiece: null,
        attackSource: null,
        validMoves: [],
        surroundAttackMode: false,
        surroundAttackSources: [],
        surroundAttackTarget: null
      };
    });
  };

  // Move a piece to a new position
  const movePiece = (piece, newPosition) => {
    setGameState(prev => {
      const playerId = prev.activePlayer;
      let newState = { ...prev };
      
      // Animation effect for moving piece
      setAnimations(anims => ({
        ...anims,
        [`move-${piece.id}`]: {
          effect: 'move',
          from: piece.type === 'infantry' 
            ? prev.players[playerId].infantry.find(i => i.id === piece.id).position
            : prev.players[playerId].longRange.position,
          to: newPosition,
          duration: MOVE_ANIMATION_DURATION
        }
      }));
      
      // Update position based on piece type
      if (piece.type === 'infantry') {
        newState.players[playerId].infantry = prev.players[playerId].infantry.map(inf => {
          if (inf.id === piece.id) {
            return { ...inf, position: newPosition };
          }
          return inf;
        });
      } else if (piece.type === 'longrange') {
        newState.players[playerId].longRange = {
          ...prev.players[playerId].longRange,
          position: newPosition
        };
      }
      
      // Check if the piece moved to the center square
      if (isCenterSquare(newPosition)) {
        newState.centerControllers = {
          ...prev.centerControllers,
          [playerId]: true
        };
        // If opponent controlled it before, they no longer do
        const opponentId = playerId === 'p1' ? 'p2' : 'p1';
        if (prev.centerControllers[opponentId]) {
          newState.centerControllers[opponentId] = false;
        }
        
        newState.gameLog.push(
          `${newState.players[playerId].username} now controls the center square`
        );
      }
      
      // Update turn moves count and reset selection
      newState.currentTurnMoves = prev.currentTurnMoves + 1;
      newState.selectedPiece = null;
      newState.validMoves = [];
      newState.selectedAction = null;
      
      return newState;
    });
  };

  // Create a split unit from the original
  const createSplitUnit = (targetPosition) => {
    setGameState(prev => {
      const playerId = prev.activePlayer;
      let newState = { ...prev };
      
      if (prev.splitPiece?.type === 'infantry') {
        // Find the original infantry group
        const originalInfantry = prev.players[playerId].infantry.find(
          inf => inf.id === prev.splitPiece.id
        );
        
        if (!originalInfantry) return prev;
        
        // Calculate HP proportion for the split group
        const originalCount = originalInfantry.count;
        const splitCount = prev.splitPiece.amount;
        const remainingCount = originalCount - splitCount;
        
        // HP for each group proportional to count
        const originalHp = originalInfantry.hp;
        const splitHp = Math.round((splitCount / originalCount) * originalHp);
        const remainingHp = originalHp - splitHp;
        
        // Create a new infantry group
        const newInfantryId = `${playerId}-inf-${Date.now()}`;
        const newInfantry = {
          id: newInfantryId,
          position: targetPosition,
          count: splitCount,
          hp: splitHp,
          maxHp: splitCount * 2 // 2 HP per infantry unit
        };
        
        // Update the original infantry group
        const updatedInfantry = prev.players[playerId].infantry.map(inf => {
          if (inf.id === originalInfantry.id) {
            return {
              ...inf,
              count: remainingCount,
              hp: remainingHp,
              maxHp: remainingCount * 2
            };
          }
          return inf;
        });
        
        // Add the new group
        newState.players[playerId].infantry = [
          ...updatedInfantry,
          newInfantry
        ];
        
        // Add to game log
        newState.gameLog.push(
          `${newState.players[playerId].username} split an infantry group of ${originalCount} into ${remainingCount} and ${splitCount}`
        );
      } else if (prev.splitPiece?.type === 'longrange') {
        // Split long range unit
        const originalLR = prev.players[playerId].longRange;
        const splitCount = prev.splitPiece.amount;
        const remainingCount = originalLR.count - splitCount;
        
        // HP for each group proportional to count
        const originalHp = originalLR.hp;
        const splitHp = Math.round((splitCount / originalLR.count) * originalHp);
        const remainingHp = originalHp - splitHp;
        
        // Create a new long range unit
        const newLRId = `${playerId}-lr-${Date.now()}`;
        const newLR = {
          id: newLRId,
          position: targetPosition,
          count: splitCount,
          hp: splitHp,
          maxHp: splitCount * 2
        };
        
        // Update player's infantry array to include the new LR unit
        newState.players[playerId].infantry.push({
          ...newLR,
          type: 'longrange'
        });
        
        // Update the original long range unit
        newState.players[playerId].longRange = {
          ...originalLR,
          count: remainingCount,
          hp: remainingHp,
          maxHp: remainingCount * 2
        };
        
        // Add to game log
        newState.gameLog.push(
          `${newState.players[playerId].username} split a long range group of ${originalLR.count} into ${remainingCount} and ${splitCount}`
        );
      }
      
      // Update turn moves count and reset split-related state
      newState.currentTurnMoves = prev.currentTurnMoves + 1;
      newState.splitPiece = null;
      newState.validMoves = [];
      newState.selectedAction = null;
      
      return newState;
    });
    
    // Close the split popup
    setShowSplitPopup(false);
  };

  // Handle the split button in the popup
  const handleSplitConfirm = () => {
    if (splitAmount < MIN_GROUP_SIZE || !splitGroupId) {
      return; // Invalid split
    }
    
    // Find the selected infantry group
    const playerId = gameState.activePlayer;
    const infantry = gameState.players[playerId].infantry.find(inf => inf.id === splitGroupId);
    const longRange = gameState.players[playerId].longRange;
    
    // Make sure split amount is valid
    let maxAmount = 0;
    let pieceType = '';
    let pieceId = '';
    
    if (infantry) {
      maxAmount = infantry.count - MIN_GROUP_SIZE;
      pieceType = 'infantry';
      pieceId = infantry.id;
    } else if (longRange && longRange.id === splitGroupId) {
      maxAmount = longRange.count - 1; // Long range units can split to as small as 1
      pieceType = 'longrange';
      pieceId = longRange.id;
    }
    
    if (splitAmount > maxAmount) {
      setGameState(prev => ({
        ...prev,
        gameLog: [
          ...prev.gameLog,
          `Invalid split amount: Cannot leave less than minimum group size`
        ]
      }));
      return;
    }
    
    // Set up the split piece and get valid move locations
    setGameState(prev => {
      const position = pieceType === 'infantry'
        ? prev.players[playerId].infantry.find(inf => inf.id === pieceId).position
        : prev.players[playerId].longRange.position;
      
      const validMoves = getValidMoves(position);
      
      return {
        ...prev,
        splitPiece: {
          id: pieceId,
          type: pieceType,
          amount: splitAmount
        },
        validMoves
      };
    });
    
    // Close the split popup
    setShowSplitPopup(false);
  };

  // Execute a hack attack
  const handleHack = (targetPosition) => {
    const playerId = gameState.activePlayer;
    const opponentId = playerId === 'p1' ? 'p2' : 'p1';
    
    // Check if player has enough IP
    if (gameState.players[playerId].intelPoints < HACK_COST) {
      setGameState(prev => ({
        ...prev,
        gameLog: [
          ...prev.gameLog,
          `Hack failed: Not enough Intel Points (${prev.players[playerId].intelPoints}/${HACK_COST})`
        ],
        selectedAction: null
      }));
      return;
    }
    
    // Find which node was targeted
    let targetNodeType = null;
    for (const nodeType in gameState.players[opponentId].nodes) {
      const node = gameState.players[opponentId].nodes[nodeType];
      if (node.position.x === targetPosition.x && node.position.y === targetPosition.y) {
        targetNodeType = nodeType;
        break;
      }
    }
    
    if (!targetNodeType) return;
    
    // Execute the hack
    setGameState(prev => {
      // Create a new state
      let newState = { ...prev };
      
      // Animation effect for hacked nodes
      setAnimations(anims => ({
        ...anims,
        [`hack-${opponentId}-${targetNodeType}`]: {
          effect: 'hack',
          duration: 1000
        }
      }));
      
      // Deduct IP cost
      newState.players[playerId].intelPoints -= HACK_COST;
      
      // Apply hack effects
      if (targetNodeType === 'comms') {
        // Comms node is completely disabled
        newState.players[opponentId].nodes.comms.hp = 0;
      } else {
        // Other nodes take damage
        const damage = 15;
        const node = newState.players[opponentId].nodes[targetNodeType];
        node.hp = Math.max(0, node.hp - damage);
        
        // Check for game over condition
        if (targetNodeType === 'core' && node.hp === 0) {
          newState.phase = 'gameOver';
          newState.winner = playerId;
        }
      }
      
      // Add to game log
      newState.gameLog.push(
        `${newState.players[playerId].username} hacked ${newState.players[opponentId].username}'s ${targetNodeType} node`
      );
      
      // Increment move counter and reset selection
      newState.currentTurnMoves = prev.currentTurnMoves + 1;
      newState.selectedAction = null;
      
      return newState;
    });
  };

  // Handle multiple surrounding attacks
  const handleSurroundAttack = () => {
    if (!gameState.surroundAttackMode || 
        !gameState.surroundAttackTarget || 
        gameState.surroundAttackSources.length < 2) {
      return;
    }
    
    const playerId = gameState.activePlayer;
    const opponentId = playerId === 'p1' ? 'p2' : 'p1';
    
    setGameState(prev => {
      let newState = { ...prev };
      let totalDamage = 0;
      
      // Calculate total damage from all sources
      for (const source of prev.surroundAttackSources) {
        let attacker = null;
        if (source.type === 'infantry') {
          attacker = prev.players[playerId].infantry.find(inf => inf.id === source.id);
        } else if (source.type === 'longrange') {
          attacker = prev.players[playerId].longRange;
        }
        
        if (attacker) {
          // Calculate damage for this source
          const damage = calculateDamage(
            { 
              type: source.type, 
              count: source.type === 'infantry' ? attacker.count : attacker.count 
            },
            { 
              type: prev.surroundAttackTarget.type 
            }
          );
          
          totalDamage += damage;
        }
      }
      
      // Apply total damage to the target
      const targetPos = prev.surroundAttackTarget.position;
      let targetUnit = null;
      let targetType = '';
      
      // Find target unit
      if (prev.surroundAttackTarget.type === 'infantry') {
        targetUnit = prev.players[opponentId].infantry.find(
          inf => inf.position.x === targetPos.x && inf.position.y === targetPos.y
        );
        targetType = 'infantry';
      } else if (prev.surroundAttackTarget.type === 'longrange') {
        targetUnit = prev.players[opponentId].longRange;
        targetType = 'longrange';
      } else {
        // Node target
        for (const nodeType in prev.players[opponentId].nodes) {
          const node = prev.players[opponentId].nodes[nodeType];
          if (node.position.x === targetPos.x && node.position.y === targetPos.y) {
            targetUnit = node;
            targetType = nodeType;
            break;
          }
        }
      }
      
      if (!targetUnit) return prev;
      
      // Animation effect for attacked unit
      setAnimations(anims => ({
        ...anims,
        [`surround-attack-${opponentId}-${targetType}`]: {
          effect: 'surround-attack',
          duration: 1000
        }
      }));
      
      // Apply damage
              if (targetType === 'infantry') {
        // Update infantry HP
        newState.players[opponentId].infantry = prev.players[opponentId].infantry.map(inf => {
          if (inf.position.x === targetPos.x && inf.position.y === targetPos.y) {
            const newHp = Math.max(0, inf.hp - totalDamage);
            // If HP is 0, remove the unit
            if (newHp === 0) {
              return null;
            }
            return { ...inf, hp: newHp };
          }
          return inf;
        }).filter(Boolean); // Remove null entries (destroyed units)
      } else if (targetType === 'longrange') {
        // Update long range HP
        const newHp = Math.max(0, targetUnit.hp - totalDamage);
        newState.players[opponentId].longRange = {
          ...targetUnit,
          hp: newHp
        };
      } else {
        // Update node HP
        const newHp = Math.max(0, targetUnit.hp - totalDamage);
        newState.players[opponentId].nodes = {
          ...prev.players[opponentId].nodes,
          [targetType]: {
            ...prev.players[opponentId].nodes[targetType],
            hp: newHp
          }
        };
        
        // Check if core is destroyed - game over
        if (targetType === 'core' && newHp === 0) {
          newState.phase = 'gameOver';
          newState.winner = playerId;
        }
      }
      
      // Add to game log
      newState.gameLog.push(
        `${newState.players[playerId].username} performed a surrounding attack with ${prev.surroundAttackSources.length} units for ${totalDamage} damage`
      );
      
      // Increment move counter and reset selection
      newState.currentTurnMoves = prev.currentTurnMoves + 1;
      newState.selectedAction = null;
      newState.surroundAttackMode = false;
      newState.surroundAttackSources = [];
      newState.surroundAttackTarget = null;
      
      return newState;
    });
  };

  // Handle attack
  const handleAttack = (attackerPiece, targetPosition) => {
    const playerId = gameState.activePlayer;
    const opponentId = playerId === 'p1' ? 'p2' : 'p1';
    
    // Get the attacking unit
    let attacker = null;
    let attackerType = '';
    
    if (attackerPiece.type === 'infantry') {
      attacker = gameState.players[playerId].infantry.find(i => i.id === attackerPiece.id);
      attackerType = 'infantry';
    } else if (attackerPiece.type === 'longrange') {
      attacker = gameState.players[playerId].longRange;
      attackerType = 'longrange';
    }
    
    if (!attacker) return;
    
    // Find target (could be infantry, longrange, or node)
    let target = null;
    let targetType = '';
    let targetId = '';
    
    // Check if target is opponent's infantry
    const targetInfantry = gameState.players[opponentId].infantry.find(
      i => i.position.x === targetPosition.x && i.position.y === targetPosition.y
    );
    
    if (targetInfantry) {
      target = targetInfantry;
      targetType = 'infantry';
      targetId = targetInfantry.id;
    } else {
      // Check if target is opponent's long range
      const targetLR = gameState.players[opponentId].longRange;
      if (targetLR.position.x === targetPosition.x && targetLR.position.y === targetPosition.y) {
        target = targetLR;
        targetType = 'longrange';
        targetId = `${opponentId}-longrange`;
      } else {
        // Check if target is a node
        for (const nodeType in gameState.players[opponentId].nodes) {
          const node = gameState.players[opponentId].nodes[nodeType];
          if (node.position.x === targetPosition.x && node.position.y === targetPosition.y) {
            target = node;
            targetType = nodeType;
            targetId = `${opponentId}-${nodeType}`;
          }
        }
      }
    }
    
    if (!target) return;
    
    // Check if target is in range
    const inRange = isInAttackRange(
      attacker.position,
      targetPosition,
      attackerType
    );
    
    if (!inRange) {
      setGameState(prev => ({
        ...prev,
        gameLog: [
          ...prev.gameLog,
          `Attack failed: Target out of range`
        ]
      }));
      return;
    }
    
    // Cannot attack from center square
    if (isCenterSquare(attacker.position)) {
      setGameState(prev => ({
        ...prev,
        gameLog: [
          ...prev.gameLog,
          `Units on the center square cannot attack`
        ]
      }));
      return;
    }
    
    // Calculate damage
    const damage = calculateDamage(
      { 
        type: attackerType, 
        count: attackerType === 'infantry' ? attacker.count : attacker.count 
      },
      { 
        type: targetType 
      }
    );
    
    // Apply damage
    setGameState(prev => {
      let updatedState = { ...prev };
      
      // Animation effect for attacked unit
      setAnimations(anims => ({
        ...anims,
        [`attack-${targetId}`]: {
          effect: 'attack',
          duration: 500
        }
      }));
      
      // Apply damage based on target type
      if (targetType === 'infantry') {
        // Update infantry HP
        updatedState.players[opponentId].infantry = prev.players[opponentId].infantry.map(inf => {
          if (inf.id === target.id) {
            const newHp = Math.max(0, inf.hp - damage);
            // If HP is 0, remove the unit
            if (newHp === 0) {
              return null;
            }
            return {
              ...inf,
              hp: newHp
            };
          }
          return inf;
        }).filter(Boolean); // Remove null entries (destroyed units)
      } else if (targetType === 'longrange') {
        // Update long range HP
        const newHp = Math.max(0, target.hp - damage);
        updatedState.players[opponentId].longRange = {
          ...target,
          hp: newHp
        };
      } else {
        // Update node HP
        const newHp = Math.max(0, target.hp - damage);
        updatedState.players[opponentId].nodes = {
          ...prev.players[opponentId].nodes,
          [targetType]: {
            ...prev.players[opponentId].nodes[targetType],
            hp: newHp
          }
        };
        
        // Check if core is destroyed - game over
        if (targetType === 'core' && newHp === 0) {
          updatedState.phase = 'gameOver';
          updatedState.winner = playerId;
        }
      }
      
      // Add to game log
      updatedState.gameLog.push(
        `${updatedState.players[playerId].username} attacked ${updatedState.players[opponentId].username}'s ${targetType} for ${damage} damage`
      );
      
      // Increment move counter and reset selection
      updatedState.currentTurnMoves = prev.currentTurnMoves + 1;
      updatedState.selectedPiece = null;
      updatedState.attackSource = null;
      updatedState.validMoves = [];
      updatedState.selectedAction = null;
      
      return updatedState;
    });
  };

  // Handle click on a cell
  const handleCellClick = (x, y) => {
    const position = { x, y };
    const playerId = gameState.activePlayer;
    
    // If player has used all moves, ignore clicks
    if (gameState.currentTurnMoves >= MOVES_PER_TURN || gameState.players[playerId].ready) {
      return;
    }
    
    // Handle different action modes
    switch (gameState.selectedAction) {
      case 'move':
        handleMoveAction(position);
        break;
      case 'attack':
        handleAttackAction(position);
        break;
      case 'hack':
        handleHackAction(position);
        break;
      case 'split':
        handleSplitAction(position);
        break;
      case 'surroundAttack':
        handleSurroundAttackSelection(position);
        break;
      default:
        // Default behavior - select a piece
        handlePieceSelection(position);
        break;
    }
  };

  // Handle surrounding attack selection
  const handleSurroundAttackSelection = (position) => {
    const playerId = gameState.activePlayer;
    const opponentId = playerId === 'p1' ? 'p2' : 'p1';
    
    // If we don't have a target yet, try to select one
    if (!gameState.surroundAttackTarget) {
      // Check if position contains opponent's piece
      
      // Check for opponent's infantry
      const targetInfantry = gameState.players[opponentId].infantry.find(
        inf => inf.position.x === position.x && inf.position.y === position.y
      );
      
      if (targetInfantry) {
        // Set as target and find potential attackers
        const surroundAttackers = findSurroundingAttackers(position, 'infantry');
        
        if (surroundAttackers.length < 2) {
          setGameState(prev => ({
            ...prev,
            gameLog: [
              ...prev.gameLog,
              `Surround attack requires at least 2 attacking units around the target`
            ]
          }));
          return;
        }
        
        setGameState(prev => ({
          ...prev,
          surroundAttackMode: true,
          surroundAttackTarget: { 
            type: 'infantry', 
            id: targetInfantry.id,
            position: targetInfantry.position
          },
          validMoves: surroundAttackers.map(a => a.position)
        }));
        return;
      }
      
      // Check for opponent's long range
      const targetLR = gameState.players[opponentId].longRange;
      if (targetLR.position.x === position.x && targetLR.position.y === position.y) {
        // Set as target and find potential attackers
        const surroundAttackers = findSurroundingAttackers(position, 'longrange');
        
        if (surroundAttackers.length < 2) {
          setGameState(prev => ({
            ...prev,
            gameLog: [
              ...prev.gameLog,
              `Surround attack requires at least 2 attacking units around the target`
            ]
          }));
          return;
        }
        
        setGameState(prev => ({
          ...prev,
          surroundAttackMode: true,
          surroundAttackTarget: { 
            type: 'longrange', 
            id: targetLR.id,
            position: targetLR.position
          },
          validMoves: surroundAttackers.map(a => a.position)
        }));
        return;
      }
      
      // Check for opponent's nodes
      for (const nodeType in gameState.players[opponentId].nodes) {
        const node = gameState.players[opponentId].nodes[nodeType];
        if (node.position.x === position.x && node.position.y === position.y) {
          // Set as target and find potential attackers
          const surroundAttackers = findSurroundingAttackers(position, nodeType);
          
          if (surroundAttackers.length < 2) {
            setGameState(prev => ({
              ...prev,
              gameLog: [
                ...prev.gameLog,
                `Surround attack requires at least 2 attacking units around the target`
              ]
            }));
            return;
          }
          
          setGameState(prev => ({
            ...prev,
            surroundAttackMode: true,
            surroundAttackTarget: { 
              type: nodeType, 
              id: `${opponentId}-${nodeType}`,
              position: node.position
            },
            validMoves: surroundAttackers.map(a => a.position)
          }));
          return;
        }
      }
      
      // No valid target at this position
      return;
    }
    
    // We have a target, check if clicked position is a valid attacking position
    if (gameState.validMoves.some(
      move => move.x === position.x && move.y === position.y
    )) {
      // Add this attacker to the surround attack sources
      
      // Find which unit is at this position
      const infantry = gameState.players[playerId].infantry.find(
        inf => inf.position.x === position.x && inf.position.y === position.y
      );
      
      if (infantry) {
        setGameState(prev => ({
          ...prev,
          surroundAttackSources: [
            ...prev.surroundAttackSources,
            { type: 'infantry', id: infantry.id, position: infantry.position }
          ],
          validMoves: prev.validMoves.filter(
            move => !(move.x === position.x && move.y === position.y)
          )
        }));
        return;
      }
      
      // Check for long range
      const longRange = gameState.players[playerId].longRange;
      if (longRange.position.x === position.x && longRange.position.y === position.y) {
        setGameState(prev => ({
          ...prev,
          surroundAttackSources: [
            ...prev.surroundAttackSources,
            { type: 'longrange', id: `${playerId}-longrange`, position: longRange.position }
          ],
          validMoves: prev.validMoves.filter(
            move => !(move.x === position.x && move.y === position.y)
          )
        }));
        return;
      }
    } else if (gameState.surroundAttackSources.length >= 2) {
      // If we have at least 2 sources and clicked elsewhere, execute the attack
      handleSurroundAttack();
    }
  };

  // Find units that can attack a target in a surround attack
  const findSurroundingAttackers = (targetPosition, targetType) => {
    const playerId = gameState.activePlayer;
    const attackers = [];
    
    // Check infantry
    for (const infantry of gameState.players[playerId].infantry) {
      // Cannot attack from center square
      if (isCenterSquare(infantry.position)) continue;
      
      // Check if in range
      if (isInAttackRange(infantry.position, targetPosition, 'infantry')) {
        attackers.push({
          type: 'infantry',
          id: infantry.id,
          position: infantry.position
        });
      }
    }
    
    // Check long range
    const longRange = gameState.players[playerId].longRange;
    if (!isCenterSquare(longRange.position) && 
        isInAttackRange(longRange.position, targetPosition, 'longrange')) {
      attackers.push({
        type: 'longrange',
        id: `${playerId}-longrange`,
        position: longRange.position
      });
    }
    
    return attackers;
  };

  // Handle move action
  const handleMoveAction = (position) => {
    const playerId = gameState.activePlayer;
    
    // If we have a selected piece and this is a valid move location
    if (gameState.selectedPiece && 
        gameState.validMoves.some(move => move.x === position.x && move.y === position.y)) {
      // Move the piece
      movePiece(gameState.selectedPiece, position);
    } else {
      // Try to select a piece at this position
      handlePieceSelection(position);
    }
  };

  // Handle attack action
  const handleAttackAction = (position) => {
    const playerId = gameState.activePlayer;
    const opponentId = playerId === 'p1' ? 'p2' : 'p1';
    
    // If we don't have an attack source yet, try to select one
    if (!gameState.attackSource) {
      // Check if there's a piece at this position
      const infantry = gameState.players[playerId].infantry.find(inf => 
        inf.position.x === position.x && inf.position.y === position.y);
      
      if (infantry) {
        // Cannot attack from center square
        if (isCenterSquare(infantry.position)) {
          setGameState(prev => ({
            ...prev,
            gameLog: [
              ...prev.gameLog,
              `Units on the center square cannot attack`
            ]
          }));
          return;
        }
        
        // Find potential targets
        const targets = findAttackTargets(infantry.position, 'infantry');
        
        if (targets.length === 0) {
          setGameState(prev => ({
            ...prev,
            gameLog: [
              ...prev.gameLog,
              `No valid targets in range`
            ]
          }));
          return;
        }
        
        setGameState(prev => ({
          ...prev,
          attackSource: { id: infantry.id, type: 'infantry' },
          validMoves: targets // Show valid targets
        }));
        return;
      }
      
      // Check for long range unit
      const longRange = gameState.players[playerId].longRange;
      if (longRange.position.x === position.x && longRange.position.y === position.y) {
        // Cannot attack from center square
        if (isCenterSquare(longRange.position)) {
          setGameState(prev => ({
            ...prev,
            gameLog: [
              ...prev.gameLog,
              `Units on the center square cannot attack`
            ]
          }));
          return;
        }
        
        // Find potential targets
        const targets = findAttackTargets(longRange.position, 'longrange');
        
        if (targets.length === 0) {
          setGameState(prev => ({
            ...prev,
            gameLog: [
              ...prev.gameLog,
              `No valid targets in range`
            ]
          }));
          return;
        }
        
        setGameState(prev => ({
          ...prev,
          attackSource: { id: `${playerId}-longrange`, type: 'longrange' },
          validMoves: targets // Show valid targets
        }));
        return;
      }
      
      // No valid attacker at this position
      return;
    }
    
    // We have an attack source, check if this is a valid target
    if (gameState.validMoves.some(move => move.x === position.x && move.y === position.y)) {
      // Execute the attack
      handleAttack(gameState.attackSource, position);
    } else {
      // Cancel attack mode
      setGameState(prev => ({
        ...prev,
        attackSource: null,
        validMoves: [],
        selectedAction: null
      }));
    }
  };

  // Find valid attack targets
  const findAttackTargets = (position, attackerType) => {
    const playerId = gameState.activePlayer;
    const opponentId = playerId === 'p1' ? 'p2' : 'p1';
    const targets = [];
    
    // Maximum attack range
    const maxRange = attackerType === 'infantry' ? 1 : 3;
    
    // Check all positions within range
    for (let dx = -maxRange; dx <= maxRange; dx++) {
      for (let dy = -maxRange; dy <= maxRange; dy++) {
        // Skip the source position
        if (dx === 0 && dy === 0) continue;
        
        // For infantry, only allow adjacent (including diagonals)
        if (attackerType === 'infantry' && Math.max(Math.abs(dx), Math.abs(dy)) > 1) continue;
        
        // For long range, limit to Manhattan distance
        if (attackerType === 'longrange' && Math.abs(dx) + Math.abs(dy) > maxRange) continue;
        
        const targetPos = { x: position.x + dx, y: position.y + dy };
        
        // Check if position is valid and contains opponent's unit
        if (isValidPosition(targetPos.x, targetPos.y)) {
          // Check for opponent's infantry
          const hasInfantry = gameState.players[opponentId].infantry.some(inf => 
            inf.position.x === targetPos.x && inf.position.y === targetPos.y);
            
          if (hasInfantry) {
            targets.push(targetPos);
            continue;
          }
          
          // Check for opponent's long range
          const longRange = gameState.players[opponentId].longRange;
          if (longRange.position.x === targetPos.x && longRange.position.y === targetPos.y) {
            targets.push(targetPos);
            continue;
          }
          
          // Check for opponent's nodes
          for (const nodeType in gameState.players[opponentId].nodes) {
            const node = gameState.players[opponentId].nodes[nodeType];
            if (node.position.x === targetPos.x && node.position.y === targetPos.y) {
              targets.push(targetPos);
              break;
            }
          }
        }
      }
    }
    
    return targets;
  };

  // Handle hack action
  const handleHackAction = (position) => {
    const playerId = gameState.activePlayer;
    const opponentId = playerId === 'p1' ? 'p2' : 'p1';
    
    // Check if clicked on opponent's node
    let isNode = false;
    
    for (const nodeType in gameState.players[opponentId].nodes) {
      const node = gameState.players[opponentId].nodes[nodeType];
      if (node.position.x === position.x && node.position.y === position.y) {
        isNode = true;
        break;
      }
    }
    
    if (isNode) {
      // Execute hack
      handleHack(position);
    } else {
      // Cancel hack mode if clicking elsewhere
      setGameState(prev => ({
        ...prev,
        selectedAction: null
      }));
    }
  };

  // Handle split action
  const handleSplitAction = (position) => {
    const playerId = gameState.activePlayer;
    
    // First check if we're selecting a unit to split
    if (!gameState.splitPiece && !splitGroupId) {
      // Check if there's an infantry at this position
      const infantry = gameState.players[playerId].infantry.find(inf => 
        inf.position.x === position.x && inf.position.y === position.y);
      
      if (infantry && infantry.count > MIN_GROUP_SIZE * 2) {
        setSplitGroupId(infantry.id);
        setSplitAmount(Math.floor(infantry.count / 2));
        setShowSplitPopup(true);
        return;
      }
      
      // Check if there's a long range unit at this position
      const longRange = gameState.players[playerId].longRange;
      if (longRange.position.x === position.x && longRange.position.y === position.y && longRange.count > 1) {
        setSplitGroupId(longRange.id);
        setSplitAmount(Math.floor(longRange.count / 2));
        setShowSplitPopup(true);
        return;
      }
      
      // No valid unit to split
      return;
    }
    
    // If we have a split piece and clicked on a valid move location
    if (gameState.splitPiece && 
        gameState.validMoves.some(move => move.x === position.x && move.y === position.y)) {
      // Complete the split by creating the new unit at the target position
      createSplitUnit(position);
    }
  };

  // Handle selecting a piece
  const handlePieceSelection = (position) => {
    const playerId = gameState.activePlayer;
    
    // Check for infantry
    const infantry = gameState.players[playerId].infantry.find(inf => 
      inf.position.x === position.x && inf.position.y === position.y);
    
    if (infantry) {
      // Get valid moves for this infantry
      const validMoves = getValidMoves(infantry.position);
      
      // Select the infantry and show valid moves
      setGameState(prev => ({
        ...prev,
        selectedPiece: { id: infantry.id, type: "infantry" },
        validMoves,
        selectedAction: 'move' // Explicitly set to move mode
      }));
      return;
    }
    
    // Check for long range unit
    const longRange = gameState.players[playerId].longRange;
    if (longRange.position.x === position.x && longRange.position.y === position.y) {
      // Get valid moves for long range unit
      const validMoves = getValidMoves(longRange.position);
      
      // Select the long range unit and show valid moves
      setGameState(prev => ({
        ...prev,
        selectedPiece: { id: `${playerId}-longrange`, type: "longrange" },
        validMoves,
        selectedAction: 'move' // Explicitly set to move mode
      }));
      return;
    }
    
    // If no piece was clicked, clear selection
    setGameState(prev => ({
      ...prev,
      selectedPiece: null,
      validMoves: []
    }));
  };
  
  // Handle ready button click
  const handleReadyClick = () => {
    setGameState(prev => ({
      ...prev,
      players: {
        ...prev.players,
        [prev.activePlayer]: {
          ...prev.players[prev.activePlayer],
          ready: true
        }
      }
    }));
  };

  // Handle chat message submission
  const handleChatSubmit = (e) => {
    e.preventDefault();
    if (!newChatMessage.trim()) return;
    
    setChatMessages(prev => [
      ...prev,
      { 
        text: newChatMessage, 
        sender: gameState.players[gameState.activePlayer].username,
        timestamp: new Date().toISOString()
      }
    ]);
    
    setNewChatMessage('');
  };

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

  // Effect for game end
  useEffect(() => {
    if (gameState.phase === 'gameOver' && gameState.winner && !showResultModal) {
      // Calculate performance ratings and ELO adjustments
      const winnerId = gameState.winner;
      const loserId = winnerId === 'p1' ? 'p2' : 'p1';
      
      // Calculate performance grade
      const winnerGrade = gradePerformance(gameState.players[winnerId], gameState.players[loserId], true);
      const loserGrade = gradePerformance(gameState.players[loserId], gameState.players[winnerId], false);
      
      // Calculate ELO adjustment
      const eloChange = calculateEloAdjustment(
        gameState.players[winnerId], 
        gameState.players[loserId]
      );
      
      // Update game state with new ratings
      setGameState(prev => {
        const newConsecutiveLosses = loserId === prev.activePlayer ? [loserId].consecutiveLosses + 1 : 0;
        
        return {
          ...prev,
          players: {
            ...prev.players,
            [winnerId]: {
              ...prev.players[winnerId],
              elo: prev.players[winnerId].elo + eloChange,
              consecutiveLosses: 0,
              performance: {
                ...prev.players[winnerId].performance,
                wins: prev.players[winnerId].performance.wins + 1,
                rating: winnerGrade
              }
            },
            [loserId]: {
              ...prev.players[loserId],
              elo: Math.max(0, prev.players[loserId].elo - eloChange),
              consecutiveLosses: newConsecutiveLosses,
              performance: {
                ...prev.players[loserId].performance,
                losses: prev.players[loserId].performance.losses + 1,
                rating: loserGrade
              }
            }
          }
        };
      });
      
      // Save game log
      saveGameLog();
      
      // Show result modal
      setShowResultModal(true);
      
      // Notify parent component of game end
      if (onGameEnd) {
        onGameEnd({
          winner: gameState.players[winnerId].username,
          loser: gameState.players[loserId].username,
          winnerElo: gameState.players[winnerId].elo + eloChange,
          loserElo: Math.max(0, gameState.players[loserId].elo - eloChange),
          eloChange,
          winnerGrade,
          loserGrade
        });
      }
    }
  }, [gameState.phase, gameState.winner, gameState.players, showResultModal, onGameEnd]);

  // Grid to SVG coordinate conversion
  const gridToSvg = (x, y) => {
    const svgX = (GRID_SIZE / 2 * CELL_SIZE) + (x * CELL_SIZE);
    const svgY = (GRID_SIZE / 2 * CELL_SIZE) + (y * CELL_SIZE);
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
    return `${file}${rank}`;
  };

  // Render infantry unit
  const renderInfantry = (unit, playerId) => {
    const { x, y } = gridToSvg(unit.position.x, unit.position.y);
    const animation = animations[`move-${unit.id}`] || animations[`attack-${unit.id}`];
    const isSelected = gameState.selectedPiece?.id === unit.id;
    const isAttackSource = gameState.attackSource?.id === unit.id;
    const isSurroundAttacker = gameState.surroundAttackSources.some(
      source => source.id === unit.id
    );
    
    // Highlight if selected or part of attack
    const highlightStroke = isSelected || isAttackSource || isSurroundAttacker
      ? "#FFFF00" // Yellow highlight
      : playerId === 'p1' ? "#0066CC" : "#CC0000";
    
    const highlightWidth = isSelected || isAttackSource || isSurroundAttacker ? 3 : 1;
    
    return (
      <g 
        key={unit.id} 
        transform={`translate(${x}, ${y})`}
        onClick={() => handleCellClick(unit.position.x, unit.position.y)}
        style={{ cursor: 'pointer' }}
      >
        <circle 
          r={CELL_SIZE * 0.4} 
          fill={playerId === 'p1' ? "#72B4E0" : "#FF7777"}
          stroke={highlightStroke}
          strokeWidth={highlightWidth}
        />
        <text 
          textAnchor="middle" 
          dy="0.3em" 
          fill={playerId === 'p1' ? "#FFFFFF" : "#FFFFFF"}
          fontWeight="bold"
        >
          {unit.count}
        </text>
        {/* Health bar */}
        <rect 
          x={-CELL_SIZE * 0.4} 
          y={CELL_SIZE * 0.25} 
          width={CELL_SIZE * 0.8} 
          height={CELL_SIZE * 0.1} 
          fill="#333333"
        />
        <rect 
          x={-CELL_SIZE * 0.4} 
          y={CELL_SIZE * 0.25} 
          width={CELL_SIZE * 0.8 * (unit.hp / unit.maxHp)} 
          height={CELL_SIZE * 0.1} 
          fill={unit.hp > unit.maxHp * 0.5 ? "#00CC00" : unit.hp > unit.maxHp * 0.25 ? "#FFCC00" : "#CC0000"}
        />
      </g>
    );
  };

  // Render long range unit
  const renderLongRange = (unit, playerId) => {
    const { x, y } = gridToSvg(unit.position.x, unit.position.y);
    const animation = animations[`move-${playerId}-longrange`] || animations[`attack-${playerId}-longrange`];
    const isSelected = gameState.selectedPiece?.type === 'longrange' && gameState.selectedPiece?.id === `${playerId}-longrange`;
    const isAttackSource = gameState.attackSource?.type === 'longrange' && gameState.attackSource?.id === `${playerId}-longrange`;
    const isSurroundAttacker = gameState.surroundAttackSources.some(
      source => source.type === 'longrange' && source.id === `${playerId}-longrange`
    );
    
    // Highlight if selected or part of attack
    const highlightStroke = isSelected || isAttackSource || isSurroundAttacker
      ? "#FFFF00" // Yellow highlight
      : playerId === 'p1' ? "#0066CC" : "#CC0000";
    
    const highlightWidth = isSelected || isAttackSource || isSurroundAttacker ? 3 : 1;
    
    return (
      <g 
        key={`${playerId}-longrange`} 
        transform={`translate(${x}, ${y})`}
        onClick={() => handleCellClick(unit.position.x, unit.position.y)}
        style={{ cursor: 'pointer' }}
      >
        <rect 
          x={-CELL_SIZE * 0.35} 
          y={-CELL_SIZE * 0.25} 
          width={CELL_SIZE * 0.7} 
          height={CELL_SIZE * 0.5}
          fill={playerId === 'p1' ? "#3399FF" : "#FF3333"}
          stroke={highlightStroke}
          strokeWidth={highlightWidth}
        />
        <text 
          textAnchor="middle" 
          dy="0.1em" 
          fill={playerId === 'p1' ? "#FFFFFF" : "#FFFFFF"}
          fontWeight="bold"
        >
          {unit.count}
        </text>
        {/* Health bar */}
        <rect 
          x={-CELL_SIZE * 0.35} 
          y={CELL_SIZE * 0.15} 
          width={CELL_SIZE * 0.7} 
          height={CELL_SIZE * 0.1} 
          fill="#333333"
        />
        <rect 
          x={-CELL_SIZE * 0.35} 
          y={CELL_SIZE * 0.15} 
          width={CELL_SIZE * 0.7 * (unit.hp / unit.maxHp)} 
          height={CELL_SIZE * 0.1} 
          fill={unit.hp > unit.maxHp * 0.5 ? "#00CC00" : unit.hp > unit.maxHp * 0.25 ? "#FFCC00" : "#CC0000"}
        />
      </g>
    );
  };

  // Render node
  const renderNode = (node, nodeType, playerId) => {
    const { x, y } = gridToSvg(node.position.x, node.position.y);
    const animation = animations[`attack-${playerId}-${nodeType}`] || animations[`hack-${playerId}-${nodeType}`];
    
    // Different shapes for different node types
    let nodeShape;
    if (nodeType === 'core') {
      // Core node - hexagon
      nodeShape = (
        <polygon 
          points={`0,${-CELL_SIZE * 0.4} ${CELL_SIZE * 0.35},${-CELL_SIZE * 0.2} ${CELL_SIZE * 0.35},${CELL_SIZE * 0.2} 0,${CELL_SIZE * 0.4} ${-CELL_SIZE * 0.35},${CELL_SIZE * 0.2} ${-CELL_SIZE * 0.35},${-CELL_SIZE * 0.2}`}
          fill={playerId === 'p1' ? "#0033CC" : "#CC0000"}
          stroke="#000000"
          strokeWidth={1}
        />
      );
    } else if (nodeType === 'comms') {
      // Comms node - diamond
      nodeShape = (
        <polygon 
          points={`0,${-CELL_SIZE * 0.4} ${CELL_SIZE * 0.4},0 0,${CELL_SIZE * 0.4} ${-CELL_SIZE * 0.4},0`}
          fill={playerId === 'p1' ? "#3366CC" : "#CC3333"}
          stroke="#000000"
          strokeWidth={1}
        />
      );
    } else if (nodeType === 'rd') {
      // R&D node - triangle
      nodeShape = (
        <polygon 
          points={`0,${-CELL_SIZE * 0.4} ${CELL_SIZE * 0.4},${CELL_SIZE * 0.3} ${-CELL_SIZE * 0.4},${CELL_SIZE * 0.3}`}
          fill={playerId === 'p1' ? "#6699CC" : "#CC6666"}
          stroke="#000000"
          strokeWidth={1}
        />
      );
    }
    
    return (
      <g 
        key={`${playerId}-${nodeType}`} 
        transform={`translate(${x}, ${y})`}
        onClick={() => handleCellClick(node.position.x, node.position.y)}
        style={{ cursor: 'pointer' }}
      >
        {nodeShape}
        {/* Health bar */}
        <rect 
          x={-CELL_SIZE * 0.4} 
          y={CELL_SIZE * 0.25} 
          width={CELL_SIZE * 0.8} 
          height={CELL_SIZE * 0.1} 
          fill="#333333"
        />
        <rect 
          x={-CELL_SIZE * 0.4} 
          y={CELL_SIZE * 0.25} 
          width={CELL_SIZE * 0.8 * (node.hp / node.maxHp)} 
          height={CELL_SIZE * 0.1} 
          fill={node.hp > node.maxHp * 0.5 ? "#00CC00" : node.hp > node.maxHp * 0.25 ? "#FFCC00" : "#CC0000"}
        />
        {/* Node type indicator */}
        <text 
          textAnchor="middle" 
          dy="0.1em" 
          fill="#FFFFFF"
          fontWeight="bold"
          fontSize={CELL_SIZE * 0.3}
        >
          {nodeType === 'core' ? 'C' : nodeType === 'comms' ? 'CO' : 'R&D'}
        </text>
      </g>
    );
  };

  // Render the game board
  const renderBoard = () => {
    const cells = [];
    
    // Render the cells
    for (let x = -GRID_SIZE; x <= GRID_SIZE; x++) {
      for (let y = -GRID_SIZE; y <= GRID_SIZE; y++) {
        // Check if position is valid
        if (!isValidPosition(x, y)) continue;
        
        const { x: svgX, y: svgY } = gridToSvg(x, y);
        
        // Determine cell color
        let fillColor = (x + y) % 2 === 0 ? LIGHT_CELL_COLOR : DARK_CELL_COLOR;
        
        // Center square has special color
        if (x === 0 && y === 0) {
          fillColor = CENTER_CELL_COLOR;
        }
        
        // Check if this is a valid move for the selected piece
        const isValidMove = gameState.validMoves.some(
          move => move.x === x && move.y === y
        );
        
        cells.push(
          <rect
            key={`cell-${x}-${y}`}
            x={svgX - CELL_SIZE / 2}
            y={svgY - CELL_SIZE / 2}
            width={CELL_SIZE}
            height={CELL_SIZE}
            fill={fillColor}
            stroke="#333333"
            strokeWidth={0.5}
            onClick={() => handleCellClick(x, y)}
            style={{ cursor: 'pointer' }}
          />
        );
        
        // Add highlight for valid moves
        if (isValidMove) {
          cells.push(
            <rect
              key={`highlight-${x}-${y}`}
              x={svgX - CELL_SIZE / 2}
              y={svgY - CELL_SIZE / 2}
              width={CELL_SIZE}
              height={CELL_SIZE}
              fill={HIGHLIGHT_COLOR}
              onClick={() => handleCellClick(x, y)}
              style={{ cursor: 'pointer' }}
            />
          );
        }
        
        // Add chess notation
        const { file, rank } = gridToChessNotation(x, y);
        if (x === -GRID_SIZE) {
          cells.push(
            <text
              key={`rank-${y}`}
              x={svgX - CELL_SIZE * 0.75}
              y={svgY + CELL_SIZE * 0.15}
              fontSize={CELL_SIZE * 0.3}
              textAnchor="middle"
            >
              {rank}
            </text>
          );
        }
        if (y === GRID_SIZE) {
          cells.push(
            <text
              key={`file-${x}`}
              x={svgX}
              y={svgY + CELL_SIZE * 0.75}
              fontSize={CELL_SIZE * 0.3}
              textAnchor="middle"
            >
              {file}
            </text>
          );
        }
      }
    }
    
    return cells;
  };

  // Render action buttons
  const renderActionButtons = () => (
    <div className="action-buttons">
      <button 
        className={`action-button ${gameState.selectedAction === 'move' ? 'selected' : ''}`}
        onClick={() => handleActionSelection('move')}
        disabled={gameState.currentTurnMoves >= MOVES_PER_TURN || gameState.players[gameState.activePlayer].ready}
      >
        Move
      </button>
      <button 
        className={`action-button ${gameState.selectedAction === 'attack' ? 'selected' : ''}`}
        onClick={() => handleActionSelection('attack')}
        disabled={gameState.currentTurnMoves >= MOVES_PER_TURN || gameState.players[gameState.activePlayer].ready}
      >
        Attack
      </button>
      <button 
        className={`action-button ${gameState.selectedAction === 'hack' ? 'selected' : ''}`}
        onClick={() => handleActionSelection('hack')}
        disabled={
          gameState.currentTurnMoves >= MOVES_PER_TURN || 
          gameState.players[gameState.activePlayer].ready ||
          gameState.players[gameState.activePlayer].intelPoints < HACK_COST
        }
      >
        Hack ({HACK_COST} IP)
      </button>
      <button 
        className={`action-button ${gameState.selectedAction === 'split' ? 'selected' : ''}`}
        onClick={() => handleActionSelection('split')}
        disabled={gameState.currentTurnMoves >= MOVES_PER_TURN || gameState.players[gameState.activePlayer].ready}
      >
        Split
      </button>
      <button 
        className={`action-button ${gameState.selectedAction === 'surroundAttack' ? 'selected' : ''}`}
        onClick={() => handleActionSelection('surroundAttack')}
        disabled={gameState.currentTurnMoves >= MOVES_PER_TURN || gameState.players[gameState.activePlayer].ready}
      >
        Surround Attack
      </button>
      <button 
        className="ready-button"
        onClick={handleReadyClick}
        disabled={gameState.players[gameState.activePlayer].ready}
      >
        Ready
      </button>
    </div>
  );

  // Render player info
  const renderPlayerInfo = (playerId) => {
    const player = gameState.players[playerId];
    const isActivePlayer = gameState.activePlayer === playerId;
    
    return (
      <div className={`player-info ${isActivePlayer ? 'active-player' : ''}`}>
        <h3>{player.username} {isActivePlayer && '(Active)'}</h3>
        <div className="player-stats">
          <div>Intel Points: {player.intelPoints}</div>
          <div>ELO: {player.elo}</div>
          {gameState.centerControllers[playerId] && (
            <div className="center-control">Controlling Center</div>
          )}
        </div>
        {/* Node status */}
        <div className="node-status">
          {Object.entries(player.nodes).map(([nodeType, node]) => (
            <div key={nodeType} className="node-health">
              {nodeType.toUpperCase()}: {Math.max(0, node.hp)}/{node.maxHp}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render game log and chat
	<div className="game-sidebar">
  {renderPlayerInfo('p1')}
  {renderPlayerInfo('p2')}
  
  <ChatBox 
    messages={chatMessages}
    onSendMessage={handleChatSubmit}
    currentUser={gameState.players[gameState.activePlayer].username}
    gameLog={gameState.gameLog}
  />
</div>

  // Render game result modal
  const renderResultModal = () => {
    if (!showResultModal || !gameState.winner) return null;
    
    const winner = gameState.players[gameState.winner];
    const loser = gameState.players[gameState.winner === 'p1' ? 'p2' : 'p1'];
    
    return (
      <div className="modal-backdrop">
        <div className="result-modal">
          <h2>Game Over</h2>
          <div className="result-content">
            <div className="winner">
              <h3>{winner.username} Wins!</h3>
              <div>Performance: {winner.performance.rating}</div>
              <div>New ELO: {winner.elo}</div>
            </div>
            <div className="loser">
              <h3>{loser.username}</h3>
              <div>Performance: {loser.performance.rating}</div>
              <div>New ELO: {loser.elo}</div>
            </div>
          </div>
          <div className="result-actions">
            <button onClick={() => window.location.reload()}>Play Again</button>
            <button onClick={() => setShowResultModal(false)}>Close</button>
          </div>
        </div>
      </div>
    );
  };

  // Render split popup
  const renderSplitPopup = () => {
    if (!showSplitPopup) return null;
    
    return (
      <div className="modal-backdrop">
        <div className="split-popup">
          <h3>Split Unit</h3>
          <div className="split-content">
            <div>
              <label>Split Amount:</label>
              <input
                type="range"
                min={MIN_GROUP_SIZE}
                max={
                  splitGroupId && splitGroupId.includes('lr')
                    ? gameState.players[gameState.activePlayer].longRange.count - 1
                    : gameState.players[gameState.activePlayer].infantry.find(i => i.id === splitGroupId)?.count - MIN_GROUP_SIZE || 0
                }
                value={splitAmount}
                onChange={(e) => setSplitAmount(parseInt(e.target.value))}
              />
              <div>{splitAmount}</div>
            </div>
          </div>
          <div className="split-actions">
            <button onClick={handleSplitConfirm}>Split</button>
            <button onClick={() => {
              setShowSplitPopup(false);
              setSplitGroupId(null);
            }}>Cancel</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="game-container">
      <h1 className="game-title">Noise Before Defeat</h1>
      <h4 className="game-subtitle">A Noah Riordan Production</h4>
      
      <div className="game-area">
        <div className="board-container">
          <div className="game-info">
            <div className="turn-info">
              Turn: {gameState.turn} | Moves: {gameState.currentTurnMoves}/{MOVES_PER_TURN}
              {gameState.timer !== null && (
                <div className="timer">Time: {gameState.timer}s</div>
              )}
            </div>
            
            {renderActionButtons()}
          </div>
          
          <svg
            ref={svgRef}
            width={GRID_SIZE * 2 * CELL_SIZE}
            height={GRID_SIZE * 2 * CELL_SIZE}
            className="game-board"
          >
            {/* Render board cells */}
            {renderBoard()}
            
            {/* Render p1 units */}
            {gameState.players.p1.infantry.map(inf => renderInfantry(inf, 'p1'))}
            {renderLongRange(gameState.players.p1.longRange, 'p1')}
            
            {/* Render p1 nodes */}
            {Object.entries(gameState.players.p1.nodes).map(([nodeType, node]) => 
              renderNode(node, nodeType, 'p1')
            )}
            
            {/* Render p2 units */}
            {gameState.players.p2.infantry.map(inf => renderInfantry(inf, 'p2'))}
            {renderLongRange(gameState.players.p2.longRange, 'p2')}
            
            {/* Render p2 nodes */}
            {Object.entries(gameState.players.p2.nodes).map(([nodeType, node]) => 
              renderNode(node, nodeType, 'p2')
            )}
          </svg>
        </div>
        
        <div className="sidebar">
          {renderPlayerInfo('p1')}
          {renderPlayerInfo('p2')}
          {renderGameLogAndChat()}
        </div>
      </div>
      
      {renderSplitPopup()}
      {renderResultModal()}
    </div>
  );
};

export default NoiseBeforeDefeat;
