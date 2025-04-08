import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getDatabase, ref, onValue, set, push, update } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import './NoiseBeforeDefeat.css';
import ChatBox from './ChatBox';
import { renderBoard, renderInfantry, renderLongRange, renderNode } from './GameRenderers';
import { calculateDamage, isInAttackRange, isCenterSquare, getValidMoves, isValidPosition, gridToSvg, gridToChessNotation } from './GameUtilities';
import { handleAttack, handleHack, handleSurroundAttack, findSurroundingAttackers, findAttackTargets } from './CombatHandlers';
import { FriendsList } from './FriendsList';

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

  // Firebase references
  const auth = getAuth();
  const db = getDatabase();
  
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
    surroundAttackTarget: null,
    gameId: null
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
  const [showFriendsList, setShowFriendsList] = useState(false);
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

  // Save game log to Firebase
  const saveGameLog = () => {
    if (gameLogSaved || !gameState.gameId) return;
    
    const logData = {
      timestamp: new Date().toISOString(),
      players: {
        p1: {
          uid: auth.currentUser.uid,
          username: gameState.players.p1.username
        },
        p2: {
          uid: opponentId || 'ai',
          username: gameState.players.p2.username
        }
      },
      winner: gameState.winner ? gameState.players[gameState.winner].username : null,
      moves: gameLogRef.current
    };
    
    // Save to Firebase
    const gameLogRef = ref(db, `gameLogs/${gameState.gameId}`);
    set(gameLogRef, logData)
      .then(() => {
        setGameLogSaved(true);
        console.log("Game log saved to Firebase");
      })
      .catch(error => {
        console.error("Error saving game log:", error);
      });
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
      
      // If this is a multiplayer game, update Firebase
      if (newState.gameId && opponentId) {
        const gameStateRef = ref(db, `games/${newState.gameId}/state`);
        update(gameStateRef, {
          ...newState,
          lastUpdateTime: new Date().getTime()
        });
      }
      
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
      
      // If this is a multiplayer game, update Firebase
      if (newState.gameId && opponentId) {
        const gameStateRef = ref(db, `games/${newState.gameId}/state`);
        update(gameStateRef, {
          ...newState,
          lastUpdateTime: new Date().getTime()
        });
      }
      
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
      
      const validMoves = getValidMoves(position, prev, isCellOccupied, isValidPosition);
      
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
      const validMoves = getValidMoves(infantry.position, gameState, isCellOccupied, isValidPosition);
      
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
      const validMoves = getValidMoves(longRange.position, gameState, isCellOccupied, isValidPosition);
      
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
        handleAttackAction(position, gameState, setGameState, setAnimations, calculateDamage, isInAttackRange, isCenterSquare, findAttackTargets);
        break;
      case 'hack':
        handleHackAction(position, gameState, setGameState, setAnimations, HACK_COST);
        break;
      case 'split':
        handleSplitAction(position);
        break;
      case 'surroundAttack':
        handleSurroundAttackSelection(position, gameState, setGameState, findSurroundingAttackers, handleSurroundAttack);
        break;
      default:
        // Default behavior - select a piece
        handlePieceSelection(position);
        break;
    }
  };
  
  // Handle ready button click
  const handleReadyClick = () => {
    setGameState(prev => {
      const newState = {
        ...prev,
        players: {
          ...prev.players,
          [prev.activePlayer]: {
            ...prev.players[prev.activePlayer],
            ready: true
          }
        }
      };
      
      // If this is a multiplayer game, update Firebase
      if (newState.gameId && opponentId) {
        const gameStateRef = ref(db, `games/${newState.gameId}/state`);
        update(gameStateRef, newState);
      }
      
      return newState;
    });
  };

  // Handle chat message submission
  const handleChatSubmit = (message) => {
    if (!message.trim()) return;
    
    const newMessage = {
      text: message,
      sender: gameState.players[gameState.activePlayer].username,
      timestamp: new Date().toISOString()
    };
    
    // Add to local state
    setChatMessages(prev => [...prev, newMessage]);
    
    // If this is a multiplayer game, save to Firebase
    if (gameState.gameId && opponentId) {
      const chatRef = ref(db, `games/${gameState.gameId}/chat`);
      push(chatRef, newMessage);
    }
    
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
        const newConsecutiveLosses = loserId === prev.activePlayer ? 
          prev.players[loserId].consecutiveLosses + 1 : 0;
        
        const newState = {
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
        
        // If this is a multiplayer game, update player stats in Firebase
        if (newState.gameId && opponentId) {
          // Update winner stats
          if (winnerId === 'p1' && auth.currentUser) {
            const userStatsRef = ref(db, `users/${auth.currentUser.uid}/stats`);
            update(userStatsRef, {
              elo: newState.players.p1.elo,
              wins: (newState.players.p1.performance.wins || 0) + 1,
              consecutiveLosses: 0
            });
          } else if (winnerId === 'p2' && opponentId) {
            const opponentStatsRef = ref(db, `users/${opponentId}/stats`);
            update(opponentStatsRef, {
              elo: newState.players.p2.elo,
              wins: (newState.players.p2.performance.wins || 0) + 1,
              consecutiveLosses: 0
            });
          }
          
          // Update loser stats
          if (loserId === 'p1' && auth.currentUser) {
            const userStatsRef = ref(db, `users/${auth.currentUser.uid}/stats`);
            update(userStatsRef, {
              elo: newState.players.p1.elo,
              losses: (newState.players.p1.performance.losses || 0) + 1,
              consecutiveLosses: newConsecutiveLosses
            });
          } else if (loserId === 'p2' && opponentId) {
            const opponentStatsRef = ref(db, `users/${opponentId}/stats`);
            update(opponentStatsRef, {
              elo: newState.players.p2.elo,
              losses: (newState.players.p2.performance.losses || 0) + 1,
              consecutiveLosses: newConsecutiveLosses
            });
          }
        }
        
        return newState;
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
  }, [gameState.phase, gameState.winner, gameState.players, showResultModal, onGameEnd, opponentId]);

  // Effect for Firebase multiplayer game setup
  useEffect(() => {
    if (!auth.currentUser || !gameState.gameId) return;
    
    // Set up listener for game state changes
    const gameStateRef = ref(db, `games/${gameState.gameId}/state`);
    const unsubscribe = onValue(gameStateRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Only update if data from server is newer than local
        if (!gameState.lastUpdateTime || data.lastUpdateTime > gameState.lastUpdateTime) {
          setGameState(data);
        }
      }
    });
    
    // Set up listener for chat messages
    const chatRef = ref(db, `games/${gameState.gameId}/chat`);
    const chatUnsubscribe = onValue(chatRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Convert Firebase object to array
        const chatArray = Object.keys(data).map(key => ({
          ...data[key],
          id: key
        }));
        setChatMessages(chatArray);
      }
    });
    
    return () => {
      unsubscribe();
      chatUnsubscribe();
    };
  }, [gameState.gameId]);

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
        const targets = findAttackTargets(infantry.position, 'infantry', gameState, isValidPosition, isCellOccupied);
        
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
        const targets = findAttackTargets(longRange.position, 'longrange', gameState, isValidPosition, isCellOccupied);
        
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
      handleAttack(gameState.attackSource, position, gameState, setGameState, setAnimations, calculateDamage, isInAttackRange, isCenterSquare);
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
      handleHack(position, gameState, setGameState, setAnimations, HACK_COST);
    } else {
      // Cancel hack mode if clicking elsewhere
      setGameState(prev => ({
        ...prev,
        selectedAction: null
      }));
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
        const surroundAttackers = findSurroundingAttackers(position, 'infantry', gameState, isInAttackRange, isCenterSquare);
        
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
        const surroundAttackers = findSurroundingAttackers(position, 'longrange', gameState, isInAttackRange, isCenterSquare);
        
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
          const surroundAttackers = findSurroundingAttackers(position, nodeType, gameState, isInAttackRange, isCenterSquare);
          
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
      handleSurroundAttack(gameState, setGameState, setAnimations, calculateDamage);
    }
  };

  // Action buttons
  const renderActionButtons = () => (
    <div className="action-buttons">
      <button 
        className={`action-button ${gameState.selectedAction === 'move' ? 'active' : ''}`}
        onClick={() => handleActionSelection('move')}
        disabled={gameState.currentTurnMoves >= MOVES_PER_TURN || gameState.players[gameState.activePlayer].ready}
      >
        Move
      </button>
      <button 
        className={`action-button ${gameState.selectedAction === 'attack' ? 'active' : ''}`}
        onClick={() => handleActionSelection('attack')}
        disabled={gameState.currentTurnMoves >= MOVES_PER_TURN || gameState.players[gameState.activePlayer].ready}
      >
        Attack
      </button>
      <button 
        className={`action-button ${gameState.selectedAction === 'hack' ? 'active' : ''}`}
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
        className={`action-button ${gameState.selectedAction === 'split' ? 'active' : ''}`}
        onClick={() => handleActionSelection('split')}
        disabled={gameState.currentTurnMoves >= MOVES_PER_TURN || gameState.players[gameState.activePlayer].ready}
      >
        Split
      </button>
      <button 
        className={`action-button ${gameState.selectedAction === 'surroundAttack' ? 'active' : ''}`}
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
      <div className={`player ${playerId} ${isActivePlayer ? 'active' : ''}`}>
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

  // Render game result modal
  const renderResultModal = () => {
    if (!showResultModal || !gameState.winner) return null;
    
    const winner = gameState.players[gameState.winner];
    const loser = gameState.players[gameState.winner === 'p1' ? 'p2' : 'p1'];
    
    return (
      <div className="result-modal-backdrop">
        <div className="result-modal">
          <h2>Game Over</h2>
          <div className="result-content">
            <div className="winner">
              <h3>{winner.username} Wins!</h3>
              <div className="rating-grade rating-{winner.performance.rating.toLowerCase()}">{winner.performance.rating}</div>
              <div className="elo-change positive">+{calculateEloAdjustment(winner, loser)}</div>
              <div className="new-elo">New ELO: {winner.elo}</div>
            </div>
            <div className="loser">
              <h3>{loser.username}</h3>
              <div className="rating-grade rating-{loser.performance.rating.toLowerCase()}">{loser.performance.rating}</div>
              <div className="elo-change negative">-{calculateEloAdjustment(winner, loser)}</div>
              <div className="new-elo">New ELO: {loser.elo}</div>
            </div>
          </div>
          <div className="result-actions">
            <button className="play-again-button" onClick={() => window.location.reload()}>Play Again</button>
            <button className="close-button" onClick={() => setShowResultModal(false)}>Close</button>
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
              <div className="split-amounts">
                <span>{splitAmount}</span>
                <span>
                  {splitGroupId && splitGroupId.includes('lr')
                    ? gameState.players[gameState.activePlayer].longRange.count - splitAmount
                    : gameState.players[gameState.activePlayer].infantry.find(i => i.id === splitGroupId)?.count - splitAmount || 0}
                </span>
              </div>
            </div>
          </div>
          <div className="split-buttons">
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
  
  // Handle exiting game
  const handleExitGame = () => {
    // If game hasn't ended, confirm before exiting
    if (gameState.phase !== 'gameOver' && !window.confirm("Are you sure you want to exit the game? Your progress will be lost.")) {
      return;
    }
    
    // Navigate back to dashboard
    window.location.href = '/dashboard';
  };

  return (
    <div className="noise-game-container">
      <div className="game-header">
        <h1 className="game-title">Noise Before Defeat - {gameMode.charAt(0).toUpperCase() + gameMode.slice(1)} Mode</h1>
        <h4 className="game-subtitle">A Noah Riordan Production</h4>
        <button className="exit-game-button" onClick={handleExitGame}>Exit Game</button>
      </div>
      
      <div className="game-layout">
        <div className="game-controls">
          <div className="turn-info">
            <h3>Turn: {gameState.turn} | Moves: {gameState.currentTurnMoves}/{MOVES_PER_TURN}</h3>
            {gameState.timer !== null && (
              <div className="timer">{gameState.timer}s</div>
            )}
          </div>
          
          <div className="player-info">
            {renderPlayerInfo('p1')}
            {renderPlayerInfo('p2')}
          </div>
          
          <div className="action-buttons-container">
            {renderActionButtons()}
          </div>
          
          <div className="friends-section">
            <button className="manage-friends-button" onClick={() => setShowFriendsList(!showFriendsList)}>
              {showFriendsList ? 'Hide Friends' : 'Manage Friends'}
            </button>
            {showFriendsList && <FriendsList currentUser={currentUser} />}
          </div>
          
          <ChatBox 
            messages={chatMessages}
            onSendMessage={handleChatSubmit}
            currentUser={gameState.players[gameState.activePlayer].username}
            gameLog={gameState.gameLog}
          />
        </div>
        
        <div className="board-container">
          <svg
            ref={svgRef}
            width={GRID_SIZE * 2 * CELL_SIZE}
            height={GRID_SIZE * 2 * CELL_SIZE}
            className="game-board"
            viewBox={`0 0 ${GRID_SIZE * 2 * CELL_SIZE} ${GRID_SIZE * 2 * CELL_SIZE}`}
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Render board cells */}
            {renderBoard(
              GRID_SIZE, 
              CELL_SIZE, 
              LIGHT_CELL_COLOR, 
              DARK_CELL_COLOR, 
              CENTER_CELL_COLOR, 
              HIGHLIGHT_COLOR, 
              gameState, 
              handleCellClick, 
              isValidPosition, 
              gridToSvg, 
              gridToChessNotation
            )}
            
            {/* Render p1 units */}
            {gameState.players.p1.infantry.map(inf => 
              renderInfantry(inf, 'p1', gameState, animations, CELL_SIZE, handleCellClick)
            )}
            {renderLongRange(gameState.players.p1.longRange, 'p1', gameState, animations, CELL_SIZE, handleCellClick)}
            
            {/* Render p1 nodes */}
            {Object.entries(gameState.players.p1.nodes).map(([nodeType, node]) => 
              renderNode(node, nodeType, 'p1', animations, CELL_SIZE, handleCellClick)
            )}
            
            {/* Render p2 units */}
            {gameState.players.p2.infantry.map(inf => 
              renderInfantry(inf, 'p2', gameState, animations, CELL_SIZE, handleCellClick)
            )}
            {renderLongRange(gameState.players.p2.longRange, 'p2', gameState, animations, CELL_SIZE, handleCellClick)}
            
            {/* Render p2 nodes */}
            {Object.entries(gameState.players.p2.nodes).map(([nodeType, node]) => 
              renderNode(node, nodeType, 'p2', animations, CELL_SIZE, handleCellClick)
            )}
          </svg>
        </div>
      </div>
      
      {renderSplitPopup()}
      {renderResultModal()}
    </div>
  );
};

export default NoiseBeforeDefeat;