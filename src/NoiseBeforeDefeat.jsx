import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getDatabase, ref, onValue, set, push, update } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import './NoiseBeforeDefeat.css';
import ChatBox from './ChatBox';
import FriendsList from './FriendsList';
import LightningBolt from './LightningBolt';

import { renderBoard, renderInfantry, renderLongRange, renderNode } from './GameRenderers';
import { 
  calculateDamage, 
  isInAttackRange, 
  isCenterSquare, 
  getValidMoves, 
  isValidPosition, 
  gridToSvg, 
  gridToChessNotation 
} from './GameUtilities';
import { 
  handleAttack, 
  handleHack, 
  handleSurroundAttack, 
  findSurroundingAttackers, 
  findAttackTargets 
} from './CombatHandlers';

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
  const MOVE_ANIMATION_DURATION = 500;

  // Board colors
  const LIGHT_CELL_COLOR = '#A3D3D6';
  const DARK_CELL_COLOR = '#FF9966';
  const CENTER_CELL_COLOR = '#75BBCB80';
  const HIGHLIGHT_COLOR = 'rgba(150, 150, 150, 0.5)';

  // Firebase references
  const auth = getAuth();
  const db = getDatabase();

  // Initial game state
  const initialGameState = {
    turn: 1,
    phase: "planning",
    timer: gameMode === "flash" ? 40 : null,
    activePlayer: 'p1',
    currentTurnMoves: 0,
    selectedAction: null, // 'move', 'attack', 'hack', etc.
    attackSource: null,
    centerControllers: { p1: false, p2: false },
    winner: null,
    players: {
      p1: {
        username: currentUser?.displayName || "Player 1",
        intelPoints: 100,
        nodes: {
          core: { type: "core", position: { x: 0, y: -4 }, hp: 50, maxHp: 50, defended: false },
          comms: { type: "comms", position: { x: -1, y: -3 }, hp: 50, maxHp: 50, defended: false },
          rd: { type: "rd", position: { x: 1, y: -3 }, hp: 50, maxHp: 50, defended: false }
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
        performance: { wins: 0, losses: 0, draws: 0, rating: 'N/A' }
      },
      p2: {
        username: "Player 2",
        intelPoints: 100,
        nodes: {
          core: { type: "core", position: { x: 0, y: 4 }, hp: 50, maxHp: 50, defended: false },
          comms: { type: "comms", position: { x: -1, y: 3 }, hp: 50, maxHp: 50, defended: false },
          rd: { type: "rd", position: { x: 1, y: 3 }, hp: 50, maxHp: 50, defended: false }
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
        performance: { wins: 0, losses: 0, draws: 0, rating: 'N/A' }
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
  const [lightningBoltProps, setLightningBoltProps] = useState(null);
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
    const gameLogRefFirebase = ref(db, `gameLogs/${gameState.gameId}`);
    set(gameLogRefFirebase, logData)
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
    let eloChange = 25 * (1 - expectedScore);
    if (loser.consecutiveLosses >= 1) {
      eloChange *= 1 + (0.2 * Math.min(loser.consecutiveLosses, 5));
    }
    eloChange = Math.min(Math.max(eloChange, 15), 100);
    return Math.round(eloChange);
  };

  // Grade performance based on game result
  const gradePerformance = (player, opponent, isWinner) => {
    if (!isWinner) {
      const coreHealth = opponent.nodes.core.hp / opponent.nodes.core.maxHp;
      return coreHealth < 0.3 ? 'D' : 'F';
    }
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
      let newState = { ...prev, phase: "executing" };
      processTurnEnd(newState);
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
    for (const playerId of ['p1', 'p2']) {
      if (gameState.players[playerId].infantry.some(inf => inf.position.x === x && inf.position.y === y)) return true;
      for (const nodeType in gameState.players[playerId].nodes) {
        const node = gameState.players[playerId].nodes[nodeType];
        if (node.position.x === x && node.position.y === y) return true;
      }
      const longRange = gameState.players[playerId].longRange;
      if (longRange.position.x === x && longRange.position.y === y) return true;
    }
    return false;
  };

  const adjustedGridToSvg = (x, y) => {
  // First get the base coordinates from your existing function
  const { x: baseX, y: baseY } = gridToSvg(x, y);
  
  // You may need to adjust these values based on your specific board layout
  // These offsets should account for any manual adjustments you made to the board position
  const offsetX = 0; // Adjust this value if needed
  const offsetY = 0; // Adjust this value if needed
  
  return { 
    x: baseX + offsetX, 
    y: baseY + offsetY 
  };
};

// Set the selected action
  const handleActionSelection = (action) => {
    setGameState(prev => {
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
      
      // Just set an animation flag, no need for from/to positions
      setAnimations(anims => ({
        ...anims,
        [`move-${piece.id}`]: {
          effect: 'move',
          duration: MOVE_ANIMATION_DURATION
        }
      }));
      
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
      
      if (isCenterSquare(newPosition)) {
        newState.centerControllers = {
          ...prev.centerControllers,
          [playerId]: true
        };
        const opponentId = playerId === 'p1' ? 'p2' : 'p1';
        if (prev.centerControllers[opponentId]) {
          newState.centerControllers[opponentId] = false;
        }
        newState.gameLog.push(
          `${newState.players[playerId].username} now controls the center square`
        );
      }
      
      newState.currentTurnMoves = prev.currentTurnMoves + 1;
      newState.selectedPiece = null;
      newState.validMoves = [];
      newState.selectedAction = null;
      
      if (newState.gameId && opponentId) {
        const gameStateRef = ref(db, `games/${newState.gameId}/state`);
        update(gameStateRef, {
          ...newState,
          lastUpdateTime: new Date().getTime()
        });
      }
      
      return newState;
    });
    
    // Clear animations after duration
    setTimeout(() => {
      setAnimations(anims => {
        const newAnims = { ...anims };
        delete newAnims[`move-${piece.id}`];
        return newAnims;
      });
    }, MOVE_ANIMATION_DURATION);
  };

  // Create a split unit from the original
  const createSplitUnit = (targetPosition) => {
    setGameState(prev => {
      const playerId = prev.activePlayer;
      let newState = { ...prev };
      if (prev.splitPiece?.type === 'infantry') {
        const originalInfantry = prev.players[playerId].infantry.find(inf => inf.id === prev.splitPiece.id);
        if (!originalInfantry) return prev;
        const originalCount = originalInfantry.count;
        const splitCount = prev.splitPiece.amount;
        const remainingCount = originalCount - splitCount;
        const originalHp = originalInfantry.hp;
        const splitHp = Math.round((splitCount / originalCount) * originalHp);
        const remainingHp = originalHp - splitHp;
        const newInfantryId = `${playerId}-inf-${Date.now()}`;
        const newInfantry = {
          id: newInfantryId,
          position: targetPosition,
          count: splitCount,
          hp: splitHp,
          maxHp: splitCount * 2
        };
        const updatedInfantry = prev.players[playerId].infantry.map(inf => {
          if (inf.id === originalInfantry.id) {
            return { ...inf, count: remainingCount, hp: remainingHp, maxHp: remainingCount * 2 };
          }
          return inf;
        });
        newState.players[playerId].infantry = [...updatedInfantry, newInfantry];
        newState.gameLog.push(
          `${newState.players[playerId].username} split an infantry group of ${originalCount} into ${remainingCount} and ${splitCount}`
        );
      } else if (prev.splitPiece?.type === 'longrange') {
        const originalLR = prev.players[playerId].longRange;
        const splitCount = prev.splitPiece.amount;
        const remainingCount = originalLR.count - splitCount;
        const originalHp = originalLR.hp;
        const splitHp = Math.round((splitCount / originalLR.count) * originalHp);
        const remainingHp = originalHp - splitHp;
        const newLRId = `${playerId}-lr-${Date.now()}`;
        const newLR = {
          id: newLRId,
          position: targetPosition,
          count: splitCount,
          hp: splitHp,
          maxHp: splitCount * 2
        };
        newState.players[playerId].infantry.push({ ...newLR, type: 'longrange' });
        newState.players[playerId].longRange = { ...originalLR, count: remainingCount, hp: remainingHp, maxHp: remainingCount * 2 };
        newState.gameLog.push(
          `${newState.players[playerId].username} split a long range group of ${originalLR.count} into ${remainingCount} and ${splitCount}`
        );
      }
      newState.currentTurnMoves = prev.currentTurnMoves + 1;
      newState.splitPiece = null;
      newState.validMoves = [];
      newState.selectedAction = null;
      if (newState.gameId && opponentId) {
        const gameStateRef = ref(db, `games/${newState.gameId}/state`);
        update(gameStateRef, { ...newState, lastUpdateTime: new Date().getTime() });
      }
      return newState;
    });
    setShowSplitPopup(false);
  };

  // Handle the split button in the popup
  const handleSplitConfirm = () => {
    if (splitAmount < MIN_GROUP_SIZE || !splitGroupId) {
      return;
    }
    const playerId = gameState.activePlayer;
    const infantry = gameState.players[playerId].infantry.find(inf => inf.id === splitGroupId);
    const longRange = gameState.players[playerId].longRange;
    let maxAmount = 0;
    let pieceType = '';
    let pieceId = '';
    if (infantry) {
      maxAmount = infantry.count - MIN_GROUP_SIZE;
      pieceType = 'infantry';
      pieceId = infantry.id;
    } else if (longRange && longRange.id === splitGroupId) {
      maxAmount = longRange.count - 1;
      pieceType = 'longrange';
      pieceId = longRange.id;
    }
    if (splitAmount > maxAmount) {
      setGameState(prev => ({
        ...prev,
        gameLog: [...prev.gameLog, `Invalid split amount: Cannot leave less than minimum group size`]
      }));
      return;
    }
    setGameState(prev => {
      const position = pieceType === 'infantry'
        ? prev.players[playerId].infantry.find(inf => inf.id === pieceId).position
        : prev.players[playerId].longRange.position;
      const validMoves = getValidMoves(position, prev, isCellOccupied, isValidPosition);
      return {
        ...prev,
        splitPiece: { id: pieceId, type: pieceType, amount: splitAmount },
        validMoves
      };
    });
    setShowSplitPopup(false);
  };

  // Handle move action
  const handleMoveAction = (position) => {
    const playerId = gameState.activePlayer;
    if (gameState.selectedPiece && gameState.validMoves.some(move => move.x === position.x && move.y === position.y)) {
      movePiece(gameState.selectedPiece, position);
    } else {
      handlePieceSelection(position);
    }
  };

  // Handle split action
  const handleSplitAction = (position) => {
    const playerId = gameState.activePlayer;
    if (!gameState.splitPiece && !splitGroupId) {
      const infantry = gameState.players[playerId].infantry.find(inf => inf.position.x === position.x && inf.position.y === position.y);
      if (infantry && infantry.count > MIN_GROUP_SIZE * 2) {
        setSplitGroupId(infantry.id);
        setSplitAmount(Math.floor(infantry.count / 2));
        setShowSplitPopup(true);
        return;
      }
      const longRange = gameState.players[playerId].longRange;
      if (longRange.position.x === position.x && longRange.position.y === position.y && longRange.count > 1) {
        setSplitGroupId(longRange.id);
        setSplitAmount(Math.floor(longRange.count / 2));
        setShowSplitPopup(true);
        return;
      }
      return;
    }
    if (gameState.splitPiece && gameState.validMoves.some(move => move.x === position.x && move.y === position.y)) {
      createSplitUnit(position);
    }
  };

  // Handle selecting a piece
  const handlePieceSelection = (position) => {
    const playerId = gameState.activePlayer;
    const infantry = gameState.players[playerId].infantry.find(inf => inf.position.x === position.x && inf.position.y === position.y);
    if (infantry) {
      const validMoves = getValidMoves(infantry.position, gameState, isCellOccupied, isValidPosition);
      setGameState(prev => ({
        ...prev,
        selectedPiece: { id: infantry.id, type: "infantry" },
        validMoves,
        selectedAction: 'move'
      }));
      return;
    }
    const longRange = gameState.players[playerId].longRange;
    if (longRange.position.x === position.x && longRange.position.y === position.y) {
      const validMoves = getValidMoves(longRange.position, gameState, isCellOccupied, isValidPosition);
      setGameState(prev => ({
        ...prev,
        selectedPiece: { id: `${playerId}-longrange`, type: "longrange" },
        validMoves,
        selectedAction: 'move'
      }));
      return;
    }
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
    if (gameState.currentTurnMoves >= MOVES_PER_TURN || gameState.players[playerId].ready) {
      return;
    }
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
    setChatMessages(prev => [...prev, newMessage]);
    if (gameState.gameId && opponentId) {
      const chatRef = ref(db, `games/${gameState.gameId}/chat`);
      push(chatRef, newMessage);
    }
    setNewChatMessage('');
  };

// Handle attack action
  const handleAttackAction = (position) => {
    const playerId = gameState.activePlayer;
    const opponentIdLocal = playerId === 'p1' ? 'p2' : 'p1';
    if (!gameState.attackSource) {
      const infantry = gameState.players[playerId].infantry.find(inf => 
        inf.position.x === position.x && inf.position.y === position.y);
      if (infantry) {
        if (isCenterSquare(infantry.position)) {
          setGameState(prev => ({
            ...prev,
            gameLog: [...prev.gameLog, `Units on the center square cannot attack`]
          }));
          return;
        }
        const targets = findAttackTargets(infantry.position, 'infantry', gameState, isValidPosition, isCellOccupied);
        if (targets.length === 0) {
          setGameState(prev => ({
            ...prev,
            gameLog: [...prev.gameLog, `No valid targets in range`]
          }));
          return;
        }
        setGameState(prev => ({
          ...prev,
          attackSource: { id: infantry.id, type: 'infantry' },
          validMoves: targets
        }));
        return;
      }
      const longRange = gameState.players[playerId].longRange;
      if (longRange.position.x === position.x && longRange.position.y === position.y) {
        if (isCenterSquare(longRange.position)) {
          setGameState(prev => ({
            ...prev,
            gameLog: [...prev.gameLog, `Units on the center square cannot attack`]
          }));
          return;
        }
        const targets = findAttackTargets(longRange.position, 'longrange', gameState, isValidPosition, isCellOccupied);
        if (targets.length === 0) {
          setGameState(prev => ({
            ...prev,
            gameLog: [...prev.gameLog, `No valid targets in range`]
          }));
          return;
        }
        setGameState(prev => ({
          ...prev,
          attackSource: { id: `${playerId}-longrange`, type: 'longrange' },
          validMoves: targets
        }));
        return;
      }
      return;
    }
    if (gameState.validMoves.some(move => move.x === position.x && move.y === position.y)) {
      handleAttack(gameState.attackSource, position, gameState, setGameState, setAnimations, calculateDamage, isInAttackRange, isCenterSquare);
    } else {
      setGameState(prev => ({
        ...prev,
        attackSource: null,
        validMoves: [],
        selectedAction: null
      }));
    }
  };

  // Modified handleHackAction function that correctly positions the lightning effect
const handleHackAction = (position) => {
  const playerId = gameState.activePlayer;
  const opponentIdLocal = playerId === 'p1' ? 'p2' : 'p1';
  let isNode = false;
  
  for (const nodeType in gameState.players[opponentIdLocal].nodes) {
    const node = gameState.players[opponentIdLocal].nodes[nodeType];
    if (node.position.x === position.x && node.position.y === position.y) {
      isNode = true;
      break;
    }
  }
  
  if (isNode) {
    handleHack(position, gameState, setGameState, setAnimations, HACK_COST);
    
    // Lightning bolt integration with corrected positioning
    const rdNode = gameState.players[playerId].nodes.rd;
    
    // Get the bounds of the SVG element to help with positioning
    const svgElement = svgRef.current;
    const svgRect = svgElement ? svgElement.getBoundingClientRect() : null;
    
    // Convert grid positions to SVG coordinates
    const { x: rdX, y: rdY } = adjustedGridToSvg(rdNode.position.x, rdNode.position.y);
    const { x: targetX, y: targetY } = adjustedGridToSvg(position.x, position.y);
    
    // Create start and end points based on actual SVG element position
    const start = { x: rdX, y: rdY };
    const end = { x: targetX, y: targetY };
    
    // Choose colors based on target node type
    let primaryColor, secondaryColor;
    if (gameState.players[opponentIdLocal].nodes.comms &&
        gameState.players[opponentIdLocal].nodes.comms.position.x === position.x &&
        gameState.players[opponentIdLocal].nodes.comms.position.y === position.y) {
      primaryColor = "#FF0000";
      secondaryColor = "#00FF00";
    } else {
      primaryColor = "#FF0000";
      secondaryColor = "#FF0000";
    }
    
    setLightningBoltProps({ 
      start: start, 
      end: end, 
      color1: primaryColor, 
      color2: secondaryColor 
    });
  } else {
    setGameState(prev => ({ ...prev, selectedAction: null }));
  }
};

  // Handle surrounding attack selection
  const handleSurroundAttackSelection = (position) => {
    const playerId = gameState.activePlayer;
    const opponentIdLocal = playerId === 'p1' ? 'p2' : 'p1';
    if (!gameState.surroundAttackTarget) {
      const targetInfantry = gameState.players[opponentIdLocal].infantry.find(inf => 
        inf.position.x === position.x && inf.position.y === position.y
      );
      if (targetInfantry) {
        const surroundAttackers = findSurroundingAttackers(position, 'infantry', gameState, isInAttackRange, isCenterSquare);
        if (surroundAttackers.length < 2) {
          setGameState(prev => ({
            ...prev,
            gameLog: [...prev.gameLog, `Surround attack requires at least 2 attacking units around the target`]
          }));
          return;
        }
        setGameState(prev => ({
          ...prev,
          surroundAttackMode: true,
          surroundAttackTarget: { type: 'infantry', id: targetInfantry.id, position: targetInfantry.position },
          validMoves: surroundAttackers.map(a => a.position)
        }));
        return;
      }
      const targetLR = gameState.players[opponentIdLocal].longRange;
      if (targetLR.position.x === position.x && targetLR.position.y === position.y) {
        const surroundAttackers = findSurroundingAttackers(position, 'longrange', gameState, isInAttackRange, isCenterSquare);
        if (surroundAttackers.length < 2) {
          setGameState(prev => ({
            ...prev,
            gameLog: [...prev.gameLog, `Surround attack requires at least 2 attacking units around the target`]
          }));
          return;
        }
        setGameState(prev => ({
          ...prev,
          surroundAttackMode: true,
          surroundAttackTarget: { type: 'longrange', id: targetLR.id, position: targetLR.position },
          validMoves: surroundAttackers.map(a => a.position)
        }));
        return;
      }
      for (const nodeType in gameState.players[opponentIdLocal].nodes) {
        const node = gameState.players[opponentIdLocal].nodes[nodeType];
        if (node.position.x === position.x && node.position.y === position.y) {
          const surroundAttackers = findSurroundingAttackers(position, nodeType, gameState, isInAttackRange, isCenterSquare);
          if (surroundAttackers.length < 2) {
            setGameState(prev => ({
              ...prev,
              gameLog: [...prev.gameLog, `Surround attack requires at least 2 attacking units around the target`]
            }));
            return;
          }
          setGameState(prev => ({
            ...prev,
            surroundAttackMode: true,
            surroundAttackTarget: { type: nodeType, id: `${opponentIdLocal}-${nodeType}`, position: node.position },
            validMoves: surroundAttackers.map(a => a.position)
          }));
          return;
        }
      }
      return;
    }
    if (gameState.validMoves.some(move => move.x === position.x && move.y === position.y)) {
      const infantry = gameState.players[playerId].infantry.find(inf => inf.position.x === position.x && inf.position.y === position.y);
      if (infantry) {
        setGameState(prev => ({
          ...prev,
          surroundAttackSources: [...prev.surroundAttackSources, { type: 'infantry', id: infantry.id, position: infantry.position }],
          validMoves: prev.validMoves.filter(move => !(move.x === position.x && move.y === position.y))
        }));
        return;
      }
      const longRange = gameState.players[playerId].longRange;
      if (longRange.position.x === position.x && longRange.position.y === position.y) {
        setGameState(prev => ({
          ...prev,
          surroundAttackSources: [...prev.surroundAttackSources, { type: 'longrange', id: `${playerId}-longrange`, position: longRange.position }],
          validMoves: prev.validMoves.filter(move => !(move.x === position.x && move.y === position.y))
        }));
        return;
      }
    } else if (gameState.surroundAttackSources.length >= 2) {
      handleSurroundAttack(gameState, setGameState, setAnimations, calculateDamage);
    }
  };

  // Effect for checking if both players are ready
  useEffect(() => {
    const { p1, p2 } = gameState.players;
    if (p1.ready && p2.ready && gameState.phase === "planning") {
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
      const winnerId = gameState.winner;
      const loserId = winnerId === 'p1' ? 'p2' : 'p1';
      const winnerGrade = gradePerformance(gameState.players[winnerId], gameState.players[loserId], true);
      const loserGrade = gradePerformance(gameState.players[loserId], gameState.players[winnerId], false);
      const eloChange = calculateEloAdjustment(gameState.players[winnerId], gameState.players[loserId]);
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
        return newState;
      });
      saveGameLog();
      setShowResultModal(true);
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
    const gameStateRef = ref(db, `games/${gameState.gameId}/state`);
    const unsubscribe = onValue(gameStateRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        if (!gameState.lastUpdateTime || data.lastUpdateTime > gameState.lastUpdateTime) {
          setGameState(data);
        }
      }
    });
    const chatRef = ref(db, `games/${gameState.gameId}/chat`);
    const chatUnsubscribe = onValue(chatRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
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

  // Render action buttons
  const renderActionButtons = () => (
    <div className="action-buttons">
      <button className={`action-button ${gameState.selectedAction === 'move' ? 'active' : ''}`}
        onClick={() => handleActionSelection('move')}
        disabled={gameState.currentTurnMoves >= MOVES_PER_TURN || gameState.players[gameState.activePlayer].ready}>
        Move
      </button>
      <button className={`action-button ${gameState.selectedAction === 'attack' ? 'active' : ''}`}
        onClick={() => handleActionSelection('attack')}
        disabled={gameState.currentTurnMoves >= MOVES_PER_TURN || gameState.players[gameState.activePlayer].ready}>
        Attack
      </button>
      <button className={`action-button ${gameState.selectedAction === 'hack' ? 'active' : ''}`}
        onClick={() => handleActionSelection('hack')}
        disabled={gameState.currentTurnMoves >= MOVES_PER_TURN || gameState.players[gameState.activePlayer].ready || gameState.players[gameState.activePlayer].intelPoints < HACK_COST}>
        Hack ({HACK_COST} IP)
      </button>
      <button className={`action-button ${gameState.selectedAction === 'split' ? 'active' : ''}`}
        onClick={() => handleActionSelection('split')}
        disabled={gameState.currentTurnMoves >= MOVES_PER_TURN || gameState.players[gameState.activePlayer].ready}>
        Split
      </button>
      <button className={`action-button ${gameState.selectedAction === 'surroundAttack' ? 'active' : ''}`}
        onClick={() => handleActionSelection('surroundAttack')}
        disabled={gameState.currentTurnMoves >= MOVES_PER_TURN || gameState.players[gameState.activePlayer].ready}>
        Surround Attack
      </button>
      <button className="ready-button"
        onClick={handleReadyClick}
        disabled={gameState.players[gameState.activePlayer].ready}>
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
              <div className={`rating-grade rating-${winner.performance.rating.toLowerCase()}`}>{winner.performance.rating}</div>
              <div className="elo-change positive">+{calculateEloAdjustment(winner, loser)}</div>
              <div className="new-elo">New ELO: {winner.elo}</div>
            </div>
            <div className="loser">
              <h3>{loser.username}</h3>
              <div className={`rating-grade rating-${loser.performance.rating.toLowerCase()}`}>{loser.performance.rating}</div>
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
    if (gameState.phase !== 'gameOver' && !window.confirm("Are you sure you want to exit the game? Your progress will be lost.")) {
      return;
    }
    window.location.href = '/dashboard';
  };

  // Main render return
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
            {gameState.timer !== null && (<div className="timer">{gameState.timer}s</div>)}
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
            {showFriendsList && <FriendsList currentUser={currentUser} onClose={() => setShowFriendsList(false)} />}
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
            {gameState.players.p1.infantry.map(inf => renderInfantry(inf, 'p1', gameState, animations, CELL_SIZE, handleCellClick))}
            {renderLongRange(gameState.players.p1.longRange, 'p1', gameState, animations, CELL_SIZE, handleCellClick)}
            {/* Render p1 nodes */}
            {Object.entries(gameState.players.p1.nodes).map(([nodeType, node]) => renderNode(node, nodeType, 'p1', animations, CELL_SIZE, handleCellClick))}
            {/* Render p2 units */}
            {gameState.players.p2.infantry.map(inf => renderInfantry(inf, 'p2', gameState, animations, CELL_SIZE, handleCellClick))}
            {renderLongRange(gameState.players.p2.longRange, 'p2', gameState, animations, CELL_SIZE, handleCellClick)}
            {/* Render p2 nodes */}
            {Object.entries(gameState.players.p2.nodes).map(([nodeType, node]) => renderNode(node, nodeType, 'p2', animations, CELL_SIZE, handleCellClick))}
          </svg>
        </div>
      </div>
      {renderSplitPopup()}
      {renderResultModal()}
      {/* LightningBolt integration */}
      {lightningBoltProps && (
  <div className="lightning-container" style={{ 
    position: 'absolute', 
    top: 0, 
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: 1000
  }}>
    <LightningBolt
      start={lightningBoltProps.start}
      end={lightningBoltProps.end}
      color1={lightningBoltProps.color1}
      color2={lightningBoltProps.color2}
      onComplete={() => setLightningBoltProps(null)}
    />
  </div>
)}
</div>
);
};

export default NoiseBeforeDefeat;
