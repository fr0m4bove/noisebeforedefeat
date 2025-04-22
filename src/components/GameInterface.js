// GameInterface.js - Bridge between WASM Core and React UI

import NoiseBeforeDefeatCore from '../public/wasm/noise_before_defeat_core.js';

// GameInterface.js - Bridge between WASM Core and React UI

class GameInterface {
  constructor() {
    this.module = null;
    this.gameState = null;
    this.isInitialized = false;
    this.onStateUpdate = null;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Import dynamically to avoid issues with webpack
      const NoiseBeforeDefeatCore = await import('../public/wasm/noise_before_defeat_core.js');
      this.module = await NoiseBeforeDefeatCore.default();
      this.gameState = new this.module.GameState();
      this.isInitialized = true;
      console.log('Game core initialized successfully');
    } catch (error) {
      console.error('Failed to initialize game core:', error);
      throw error;
    }
  }

  // Set callback for state updates
  setUpdateCallback(callback) {
    this.onStateUpdate = callback;
  }

  // Start a new game
  startGame(player1Name, player2Name) {
    if (!this.isInitialized) {
      throw new Error('Game core not initialized');
    }

    this.gameState.initializeGame(player1Name, player2Name);
    this._notifyStateUpdate();
  }

  // Submit an action to the game
  submitAction(playerId, actionType, x, y) {
    if (!this.isInitialized) {
      throw new Error('Game core not initialized');
    }

    this.gameState.submitAction(playerId, actionType, x, y);
    this._notifyStateUpdate();
  }

  // End the current turn
  endTurn() {
    if (!this.isInitialized) {
      throw new Error('Game core not initialized');
    }

    this.gameState.endTurn();
    this._notifyStateUpdate();
  }

  // Get full game state as JSON
  getGameState() {
    return this.gameState.getGameState();
  }

  // Load game state from JSON
  loadGameState(jsonState) {
    this.gameState.loadGameState(jsonState);
    this._notifyStateUpdate();
  }

  // Get player information
  getPlayerInfo(playerId) {
    return this.gameState.getPlayerInfo(playerId);
  }

  // Get game log
  getGameLog() {
    return this.gameState.getGameLog();
  }

  // Check if the game is over
  isGameOver() {
    return this.gameState.isGameOver();
  }

  // Get the winner (if game is over)
  getWinner() {
    return this.gameState.getWinner();
  }

  // Get current turn number
  getCurrentTurn() {
    return this.gameState.getCurrentTurn();
  }

  // Get current game phase
  getGamePhase() {
    return this.gameState.getGamePhase();
  }

  // Helper method to notify state updates
  _notifyStateUpdate() {
    if (this.onStateUpdate) {
      const gameData = {
        currentTurn: this.getCurrentTurn(),
        phase: this.getGamePhase(),
        players: [
          this.getPlayerInfo(0),
          this.getPlayerInfo(1)
        ],
        gameLog: this.getGameLog(),
        isGameOver: this.isGameOver(),
        winner: this.getWinner()
      };
      
      this.onStateUpdate(gameData);
    }
  }
}

// Create and export a singleton instance
const gameInterface = new GameInterface();
export default gameInterface;
