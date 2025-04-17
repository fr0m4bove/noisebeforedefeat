#include "GameState.h"
#include <sstream>
#include <iostream>

GameState::GameState() 
    : m_currentTurn(1)
    , m_phase(GamePhase::PLANNING)
    , m_winner(-1)
{
}

GameState::~GameState() {
}

void GameState::initializeGame(const std::string& player1Name, const std::string& player2Name) {
    // Clear any existing game state
    m_players.clear();
    m_pendingActions.clear();
    m_gameLog.clear();
    m_currentTurn = 1;
    m_phase = GamePhase::PLANNING;
    m_winner = -1;
    
    // Create players
    m_players.push_back(std::make_unique<Player>(0, player1Name));
    m_players.push_back(std::make_unique<Player>(1, player2Name));
    
    // Initialize player 1 nodes
    m_players[0]->initializeNodes(Position(0, -4), Position(-1, -3), Position(1, -3));
    
    // Initialize player 2 nodes
    m_players[1]->initializeNodes(Position(0, 4), Position(-1, 3), Position(1, 3));
    
    // Initialize player 1 units
    m_players[0]->addInfantryGroup(Position(-1, -2), 45);
    m_players[0]->addInfantryGroup(Position(1, -2), 45);
    m_players[0]->setLongRangeUnit(Position(0, -2), 5);
    
    // Initialize player 2 units
    m_players[1]->addInfantryGroup(Position(-1, 2), 45);
    m_players[1]->addInfantryGroup(Position(1, 2), 45);
    m_players[1]->setLongRangeUnit(Position(0, 2), 5);
    
    // Add initial game log entry
    addToGameLog("Game started: " + player1Name + " vs " + player2Name);
}

void GameState::submitAction(int playerId, const std::string& actionType, const Position& targetPos) {
    if (m_phase != GamePhase::PLANNING) {
        addToGameLog("Cannot submit action: not in planning phase");
        return;
    }
    
    if (playerId < 0 || playerId >= static_cast<int>(m_players.size())) {
        addToGameLog("Invalid player ID");
        return;
    }
    
    if (!isValidAction(playerId, actionType, targetPos)) {
        addToGameLog("Invalid action: " + actionType);
        return;
    }
    
    // Add the action to pending actions
    m_pendingActions.push_back({playerId, actionType, targetPos});
    
    // Log action submission
    addToGameLog(m_players[playerId]->getName() + " submitted action: " + actionType);
}

void GameState::processActions() {
    if (m_phase != GamePhase::PLANNING) {
        addToGameLog("Cannot process actions: not in planning phase");
        return;
    }
    
    m_phase = GamePhase::EXECUTING;
    
    // Process all pending actions
    for (const auto& action : m_pendingActions) {
        executeAction(action);
    }
    
    // Clear pending actions
    m_pendingActions.clear();
    
    // Check victory conditions
    checkVictoryConditions();
    
    if (m_winner == -1) {
        // If no winner, prepare for next turn
        m_phase = GamePhase::PLANNING;
        m_currentTurn++;
    } else {
        // Game is over
        m_phase = GamePhase::GAME_OVER;
        addToGameLog("Game over: " + m_players[m_winner]->getName() + " wins!");
    }
}

void GameState::endTurn() {
    // Called when both players are ready
    processActions();
}

bool GameState::isGameOver() const {
    return m_phase == GamePhase::GAME_OVER;
}

int GameState::getWinner() const {
    return m_winner;
}

std::string GameState::serializeState() const {
    std::stringstream ss;
    
    // Basic game info
    ss << "{\n";
    ss << "  \"currentTurn\": " << m_currentTurn << ",\n";
    ss << "  \"phase\": " << static_cast<int>(m_phase) << ",\n";
    ss << "  \"winner\": " << m_winner << ",\n";
    
    // Players
    ss << "  \"players\": [\n";
    for (size_t i = 0; i < m_players.size(); i++) {
        const auto& player = m_players[i];
        ss << "    {\n";
        ss << "      \"id\": " << player->getId() << ",\n";
        ss << "      \"name\": \"" << player->getName() << "\",\n";
        ss << "      \"intelPoints\": " << player->getIntelPoints() << ",\n";
        
        // Nodes
        ss << "      \"nodes\": {\n";
        const auto& nodes = player->getNodes();
        size_t nodeCount = 0;
        for (const auto& nodePair : nodes) {
            const auto& node = nodePair.second;
            ss << "        \"" << node.getTypeName() << "\": {\n";
            ss << "          \"type\": \"" << node.getTypeName() << "\",\n";
            ss << "          \"posX\": " << node.getPosition().x << ",\n";
            ss << "          \"posY\": " << node.getPosition().y << ",\n";
            ss << "          \"hp\": " << node.getHp() << ",\n";
            ss << "          \"maxHp\": " << node.getMaxHp() << ",\n";
            ss << "          \"defended\": " << (node.isDefended() ? "true" : "false") << "\n";
            ss << "        }" << (nodeCount < nodes.size() - 1 ? "," : "") << "\n";
            nodeCount++;
        }
        ss << "      },\n";
        
        // Infantry
        ss << "      \"infantry\": [\n";
        const auto& infantry = player->getInfantryGroups();
        for (size_t j = 0; j < infantry.size(); j++) {
            const auto& inf = infantry[j];
            ss << "        {\n";
            ss << "          \"id\": \"" << inf.getId() << "\",\n";
            ss << "          \"posX\": " << inf.getPosition().x << ",\n";
            ss << "          \"posY\": " << inf.getPosition().y << ",\n";
            ss << "          \"count\": " << inf.getCount() << ",\n";
            ss << "          \"hp\": " << inf.getHp() << ",\n";
            ss << "          \"maxHp\": " << inf.getMaxHp() << "\n";
            ss << "        }" << (j < infantry.size() - 1 ? "," : "") << "\n";
        }
        ss << "      ],\n";
        
        // Long Range Unit
        const auto& lr = player->getLongRangeUnit();
        ss << "      \"longRange\": {\n";
        ss << "        \"id\": \"" << lr.getId() << "\",\n";
        ss << "        \"posX\": " << lr.getPosition().x << ",\n";
        ss << "        \"posY\": " << lr.getPosition().y << ",\n";
        ss << "        \"count\": " << lr.getCount() << ",\n";
        ss << "        \"hp\": " << lr.getHp() << ",\n";
        ss << "        \"maxHp\": " << lr.getMaxHp() << "\n";
        ss << "      }\n";
        
        ss << "    }" << (i < m_players.size() - 1 ? "," : "") << "\n";
    }
    ss << "  ],\n";
    
    // Game log
    ss << "  \"gameLog\": [\n";
    for (size_t i = 0; i < m_gameLog.size(); i++) {
        ss << "    \"" << escapeJsonString(m_gameLog[i]) << "\"" << (i < m_gameLog.size() - 1 ? "," : "") << "\n";
    }
    ss << "  ]\n";
    
    ss << "}";
    return ss.str();
}

void GameState::deserializeState(const std::string& jsonState) {
    // For the simplified version, we won't implement full parsing
    // Instead, just provide a warning
    std::cerr << "Warning: Full JSON deserialization not implemented in simplified version" << std::endl;
    std::cerr << "State loading skipped" << std::endl;
    
    // Basic initialization to ensure the game is in a valid state
    if (m_players.empty()) {
        initializeGame("Player 1", "Player 2");
    }
}

void GameState::checkVictoryConditions() {
    // Check if any player's core node is destroyed
    for (size_t i = 0; i < m_players.size(); ++i) {
        if (!m_players[i]->isCoreAlive()) {
            m_winner = 1 - static_cast<int>(i);  // Opponent wins
            m_phase = GamePhase::GAME_OVER;
            return;
        }
    }
}

void GameState::addToGameLog(const std::string& message) {
    m_gameLog.push_back(message);
}

bool GameState::isValidAction(int playerId, const std::string& actionType, const Position& targetPos) const {
    const Player& player = *m_players[playerId];
    
    // Check if action is valid based on game rules
    if (actionType == "move") {
        // Check if player has units at the given location
        // Detailed implementation needed
        return true;
    } 
    else if (actionType == "attack") {
        // Check if attack is valid (range, target, etc.)
        return player.isRDLabAlive();
    } 
    else if (actionType == "hack") {
        // Check if hack is valid (enough IP, etc.)
        return player.isRDLabAlive() && player.getIntelPoints() >= 40;
    }
    else if (actionType == "defend") {
        // Check if defend is valid
        return true;
    }
    else if (actionType == "spy") {
        // Check if spy is valid
        return player.isCommsAlive();
    }
    
    return false;
}

void GameState::executeAction(const Action& action) {
    int playerId = action.playerId;
    Player& player = *m_players[playerId];
    int opponentId = 1 - playerId;
    Player& opponent = *m_players[opponentId];
    
    if (action.actionType == "move") {
        // Implementation for move action
        // Need to identify which unit to move
        addToGameLog(player.getName() + " moved a unit");
    } 
    else if (action.actionType == "attack") {
        // Implementation for attack action
        if (player.isRDLabAlive()) {
            // Find target
            // Calculate damage
            // Apply damage
            addToGameLog(player.getName() + " attacked " + opponent.getName());
        } else {
            addToGameLog(player.getName() + " tried to attack but R&D Lab is down");
        }
    } 
    else if (action.actionType == "hack") {
        // Implementation for hack action
        if (player.isRDLabAlive() && player.getIntelPoints() >= 40) {
            player.spendIntelPoints(40);
            
            // Find target node in opponent's nodes
            for (const auto& nodePair : opponent.getNodes()) {
                const Node& node = nodePair.second;
                if (node.getPosition() == action.targetPos) {
                    // Apply hack damage (50 HP)
                    opponent.damageNode(node.getType(), 50);
                    addToGameLog(player.getName() + " hacked " + opponent.getName() + "'s " + node.getTypeName());
                    break;
                }
            }
        } else {
            addToGameLog(player.getName() + " tried to hack but lacked resources");
        }
    }
    else if (action.actionType == "defend") {
        // Implementation for defend action
        for (const auto& nodePair : player.getNodes()) {
            const Node& node = nodePair.second;
            if (node.getPosition() == action.targetPos) {
                player.defendNode(node.getType());
                addToGameLog(player.getName() + " defended their " + node.getTypeName());
                break;
            }
        }
    }
    else if (action.actionType == "spy") {
        // Implementation for spy action
        if (player.isCommsAlive()) {
            player.addIntelPoints(15);
            addToGameLog(player.getName() + " used spy and gained 15 IP");
            
            // In a real implementation, this would reveal enemy moves
        } else {
            addToGameLog(player.getName() + " tried to spy but Comms is down");
        }
    }
}

// Helper function to escape JSON strings
std::string GameState::escapeJsonString(const std::string& input) const {
    std::string output;
    output.reserve(input.length() * 2); // Reserve space to avoid reallocations
    
    for (auto ch : input) {
        switch (ch) {
            case '\"': output += "\\\""; break;
            case '\\': output += "\\\\"; break;
            case '\b': output += "\\b"; break;
            case '\f': output += "\\f"; break;
            case '\n': output += "\\n"; break;
            case '\r': output += "\\r"; break;
            case '\t': output += "\\t"; break;
            default:
                if (static_cast<unsigned char>(ch) < 32) {
                    // Control characters
                    char buf[7];
                    snprintf(buf, 7, "\\u%04x", ch);
                    output += buf;
                } else {
                    output += ch;
                }
                break;
        }
    }
    
    return output;
}
