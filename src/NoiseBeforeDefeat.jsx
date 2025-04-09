// NoiseBeforeDefeat.jsx
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
  const MOVES_PER_TURN = 2;
  const HACK_COST = 40;
  const DEFAULT_ELO = 500;
  const MOVE_ANIMATION_DURATION = 500;

  // Board colors
  const LIGHT_CELL_COLOR = '#A3D3D6';
  const DARK_CELL_COLOR = '#FF9966';
  const CENTER_CELL_COLOR = '#75BBCB80';
  const HIGHLIGHT_COLOR = 'rgba(150, 150, 150, 0.5)';

  // Firebase refs
  const auth = getAuth();
  const db = getDatabase();

  // Initial game state (simplified; merge with full state as needed)
  const initialGameState = {
    turn: 1,
    phase: "planning",
    timer: gameMode === "flash" ? 40 : null,
    activePlayer: 'p1',
    currentTurnMoves: 0,
    selectedAction: null, // 'move', 'attack', 'hack', etc.
    selectedPiece: null,
    validMoves: [],
    attackSource: null,
    centerControllers: { p1: false, p2: false },
    winner: null,
    players: {
      p1: {
        username: currentUser?.displayName || "Player 1",
        intelPoints: 100,
        nodes: {
          core: { type: "core", position: { x: 0, y: -4 }, hp: 50, maxHp: 50 },
          comms: { type: "comms", position: { x: -1, y: -3 }, hp: 50, maxHp: 50 },
          rd: { type: "rd", position: { x: 1, y: -3 }, hp: 50, maxHp: 50 }
        },
        infantry: [
          { id: "p1-inf-1", position: { x: -1, y: -2 }, count: 45, hp: 90, maxHp: 90 },
          { id: "p1-inf-2", position: { x: 1, y: -2 }, count: 45, hp: 90, maxHp: 90 }
        ],
        longRange: { id: "p1-lr", position: { x: 0, y: -2 }, count: 5, hp: 10, maxHp: 10 }
      },
      p2: {
        username: "Player 2",
        intelPoints: 100,
        nodes: {
          core: { type: "core", position: { x: 0, y: 4 }, hp: 50, maxHp: 50 },
          comms: { type: "comms", position: { x: -1, y: 3 }, hp: 50, maxHp: 50 },
          rd: { type: "rd", position: { x: 1, y: 3 }, hp: 50, maxHp: 50 }
        },
        infantry: [
          { id: "p2-inf-1", position: { x: -1, y: 2 }, count: 45, hp: 90, maxHp: 90 },
          { id: "p2-inf-2", position: { x: 1, y: 2 }, count: 45, hp: 90, maxHp: 90 }
        ],
        longRange: { id: "p2-lr", position: { x: 0, y: 2 }, count: 5, hp: 10, maxHp: 10 }
      }
    },
    gameLog: []
  };

  // State declarations
  const [gameState, setGameState] = useState(initialGameState);
  const [animations, setAnimations] = useState({});
  const [lightningBoltProps, setLightningBoltProps] = useState(null);
  const [showFriendsList, setShowFriendsList] = useState(false);
  const svgRef = useRef(null);

  // Helper: Check if a cell is occupied
  const isCellOccupied = (x, y) => {
    for (const playerId of ['p1', 'p2']) {
      if (gameState.players[playerId].infantry.some(inf => inf.position.x === x && inf.position.y === y)) return true;
      for (const nodeType in gameState.players[playerId].nodes) {
        if (gameState.players[playerId].nodes[nodeType].position.x === x &&
            gameState.players[playerId].nodes[nodeType].position.y === y) return true;
      }
      const lr = gameState.players[playerId].longRange;
      if (lr.position.x === x && lr.position.y === y) return true;
    }
    return false;
  };

  // Action selection handler
  const handleActionSelection = (action) => {
    setGameState(prev => ({
      ...prev,
      selectedAction: prev.selectedAction === action ? null : action,
      selectedPiece: null,
      validMoves: []
    }));
  };

  // Piece selection handler
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
    // Clear selection if no piece is found
    setGameState(prev => ({
      ...prev,
      selectedPiece: null,
      validMoves: []
    }));
  };

  // Core cell click handler—with hack action and lightning integration
  const handleCellClick = (x, y) => {
    const position = { x, y };
    const playerId = gameState.activePlayer;
    if (gameState.currentTurnMoves >= MOVES_PER_TURN) return;

    switch (gameState.selectedAction) {
      case 'move':
        if (gameState.selectedPiece && gameState.validMoves.some(move => move.x === x && move.y === y)) {
          // (Insert actual move logic here; for now we just increment move counter)
          setGameState(prev => ({
            ...prev,
            currentTurnMoves: prev.currentTurnMoves + 1,
            selectedPiece: null,
            validMoves: [],
            selectedAction: null
          }));
        } else {
          handlePieceSelection(position);
        }
        break;
      case 'attack':
        handleAttack(gameState.selectedPiece, position, gameState, setGameState, setAnimations, calculateDamage, isInAttackRange, isCenterSquare);
        break;
      case 'hack': {
        // Identify if the clicked cell is an opponent's node
        const opponentId = playerId === 'p1' ? 'p2' : 'p1';
        let targetNode = null;
        for (const nodeType in gameState.players[opponentId].nodes) {
          const node = gameState.players[opponentId].nodes[nodeType];
          if (node.position.x === x && node.position.y === y) {
            targetNode = { type: nodeType, position: node.position };
            break;
          }
        }
        if (!targetNode) return;
        // Call existing hack handler
        handleHack(position, gameState, setGameState, setAnimations, HACK_COST);
        // Compute SVG coordinates for lightning: start from player's R&D node, end at target node
        const rdPos = gridToSvg(
          gameState.players[playerId].nodes.rd.position.x,
          gameState.players[playerId].nodes.rd.position.y
        );
        const targetPos = gridToSvg(targetNode.position.x, targetNode.position.y);
        // Determine lightning colors: for 'comms', use red + green; else red only
        let primaryColor, secondaryColor;
        if (targetNode.type === 'comms') {
          primaryColor = "#FF0000";
          secondaryColor = "#00FF00";
        } else {
          primaryColor = "#FF0000";
          secondaryColor = "#FF0000";
        }
        setLightningBoltProps({ start: rdPos, end: targetPos, color1: primaryColor, color2: secondaryColor });
        break;
      }
      case 'split':
        // (Insert split action logic if desired)
        break;
      case 'surroundAttack':
        // (Insert surround attack logic if desired)
        break;
      default:
        handlePieceSelection(position);
        break;
    }
  };

  // Render action buttons (including Hack)
  const renderActionButtons = () => (
    <div className="action-buttons">
      <button className={`action-button ${gameState.selectedAction === 'move' ? 'active' : ''}`} onClick={() => handleActionSelection('move')} disabled={gameState.currentTurnMoves >= MOVES_PER_TURN}>
        Move
      </button>
      <button className={`action-button ${gameState.selectedAction === 'attack' ? 'active' : ''}`} onClick={() => handleActionSelection('attack')} disabled={gameState.currentTurnMoves >= MOVES_PER_TURN}>
        Attack
      </button>
      <button className={`action-button ${gameState.selectedAction === 'hack' ? 'active' : ''}`} onClick={() => handleActionSelection('hack')} disabled={gameState.currentTurnMoves >= MOVES_PER_TURN || gameState.players[gameState.activePlayer].intelPoints < HACK_COST}>
        Hack ({HACK_COST} IP)
      </button>
      <button className={`action-button ${gameState.selectedAction === 'split' ? 'active' : ''}`} onClick={() => handleActionSelection('split')} disabled={gameState.currentTurnMoves >= MOVES_PER_TURN}>
        Split
      </button>
      <button className={`action-button ${gameState.selectedAction === 'surroundAttack' ? 'active' : ''}`} onClick={() => handleActionSelection('surroundAttack')} disabled={gameState.currentTurnMoves >= MOVES_PER_TURN}>
        Surround Attack
      </button>
      <button className="ready-button" onClick={() => { /* Ready action logic */ }} disabled={gameState.players[gameState.activePlayer].ready}>
        Ready
      </button>
    </div>
  );

  // Render player info (simplified)
  const renderPlayerInfo = (playerId) => {
    const player = gameState.players[playerId];
    const isActive = gameState.activePlayer === playerId;
    return (
      <div className={`player ${playerId} ${isActive ? 'active' : ''}`}>
        <h3>{player.username} {isActive && '(Active)'}</h3>
        <div>Intel Points: {player.intelPoints}</div>
        <div>ELO: {player.elo}</div>
        {Object.entries(player.nodes).map(([type, node]) => (
          <div key={type}>{type.toUpperCase()}: {Math.max(0, node.hp)}/{node.maxHp}</div>
        ))}
      </div>
    );
  };

  // Render the main UI
  return (
    <div className="noise-game-container">
      <div className="game-header">
        <h1 className="game-title">Noise Before Defeat - {gameMode.charAt(0).toUpperCase() + gameMode.slice(1)} Mode</h1>
        <h4 className="game-subtitle">A Noah Riordan Production</h4>
        <button className="exit-game-button" onClick={() => onGameEnd && onGameEnd()}>Exit Game</button>
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
          <ChatBox />
        </div>
        <div className="board-container">
          <svg
            ref={svgRef}
            width={GRID_SIZE * 2 * CELL_SIZE}
            height={GRID_SIZE * 2 * CELL_SIZE}
            className="game-board"
            viewBox={`
              ${-((GRID_SIZE * 2 * CELL_SIZE) / 2) + 155} 
              ${-((GRID_SIZE * 2 * CELL_SIZE) / 4) - 100} 
              ${GRID_SIZE * 2 * CELL_SIZE + 150} 
              ${GRID_SIZE * 2 * CELL_SIZE + 100}
            `}
            preserveAspectRatio="xMidYMin meet"
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
            {/* Render units and nodes for both players */}
            {gameState.players.p1.infantry.map(inf => renderInfantry(inf, 'p1', gameState, animations, CELL_SIZE, handleCellClick))}
            {renderLongRange(gameState.players.p1.longRange, 'p1', gameState, animations, CELL_SIZE, handleCellClick)}
            {Object.entries(gameState.players.p1.nodes).map(([type, node]) => renderNode(node, type, 'p1', animations, CELL_SIZE, handleCellClick))}
            {gameState.players.p2.infantry.map(inf => renderInfantry(inf, 'p2', gameState, animations, CELL_SIZE, handleCellClick))}
            {renderLongRange(gameState.players.p2.longRange, 'p2', gameState, animations, CELL_SIZE, handleCellClick)}
            {Object.entries(gameState.players.p2.nodes).map(([type, node]) => renderNode(node, type, 'p2', animations, CELL_SIZE, handleCellClick))}
          </svg>
        </div>
      </div>
      {/* Render any split popup or result modal here if needed */}
      {lightningBoltProps && (
        <LightningBolt
          start={lightningBoltProps.start}
          end={lightningBoltProps.end}
          color1={lightningBoltProps.color1}
          color2={lightningBoltProps.color2}
          onComplete={() => setLightningBoltProps(null)}
        />
      )}
    </div>
  );
};

export default NoiseBeforeDefeat;

