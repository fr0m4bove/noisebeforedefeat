#pragma once

#include <vector>
#include <string>
#include <map>
#include <memory>
#include "Player.h"
#include "Position.h"

enum class GamePhase {
    PLANNING,
    EXECUTING,
    GAME_OVER
};

class GameState {
public:
    GameState();
    ~GameState();

    // Game setup
    void initializeGame(const std::string& player1Name, const std::string& player2Name);
    
    // Turn management
    void submitAction(int playerId, const std::string& actionType, const Position& targetPos);
    void processActions();
    void endTurn();
    bool isGameOver() const;
    int getWinner() const;
    
    // Getters
    int getCurrentTurn() const { return m_currentTurn; }
    GamePhase getGamePhase() const { return m_phase; }
    const Player& getPlayer(int playerId) const { return *m_players[playerId]; }
    Player& getPlayerMutable(int playerId) { return *m_players[playerId]; }
    const std::vector<std::string>& getGameLog() const { return m_gameLog; }
    
    // Game state serialization
    std::string serializeState() const;
    void deserializeState(const std::string& jsonState);
    
private:
    // Game state
    int m_currentTurn;
    GamePhase m_phase;
    std::vector<std::unique_ptr<Player>> m_players;
    std::vector<std::string> m_gameLog;
    int m_winner; // -1 = no winner, 0 = player 1, 1 = player 2
    
    // Pending actions
    struct Action {
        int playerId;
        std::string actionType;
        Position targetPos;
    };
    std::vector<Action> m_pendingActions;
    
    // Helper methods
    void checkVictoryConditions();
    void addToGameLog(const std::string& message);
    bool isValidAction(int playerId, const std::string& actionType, const Position& targetPos) const;
    void executeAction(const Action& action);
    
    // Helper for simplified JSON serialization
    std::string escapeJsonString(const std::string& input) const;
};
