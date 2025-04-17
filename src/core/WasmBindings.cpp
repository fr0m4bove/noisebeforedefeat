#include <emscripten/bind.h>
#include <emscripten/val.h>
#include "GameState.h"
#include "Position.h"

using namespace emscripten;

// GameState wrapper class to expose to JavaScript
class GameStateWrapper {
private:
    std::unique_ptr<GameState> m_gameState;

public:
    GameStateWrapper() : m_gameState(std::make_unique<GameState>()) {}
    
    void initializeGame(const std::string& player1Name, const std::string& player2Name) {
        m_gameState->initializeGame(player1Name, player2Name);
    }
    
    void submitAction(int playerId, const std::string& actionType, int x, int y) {
        Position targetPos(x, y);
        m_gameState->submitAction(playerId, actionType, targetPos);
    }
    
    void endTurn() {
        m_gameState->endTurn();
    }
    
    bool isGameOver() const {
        return m_gameState->isGameOver();
    }
    
    int getWinner() const {
        return m_gameState->getWinner();
    }
    
    int getCurrentTurn() const {
        return m_gameState->getCurrentTurn();
    }
    
    int getGamePhase() const {
        return static_cast<int>(m_gameState->getGamePhase());
    }
    
    std::string getGameState() const {
        return m_gameState->serializeState();
    }
    
    void loadGameState(const std::string& jsonState) {
        m_gameState->deserializeState(jsonState);
    }
    
    val getPlayerInfo(int playerId) const {
        const Player& player = m_gameState->getPlayer(playerId);
        val result = val::object();
        
        result.set("id", player.getId());
        result.set("name", player.getName());
        result.set("intelPoints", player.getIntelPoints());
        
        // Nodes
        val nodesObj = val::object();
        for (const auto& nodeData : player.getNodes()) {
            const Node& node = nodeData.second;
            val nodeObj = val::object();
            
            nodeObj.set("type", node.getTypeName());
            nodeObj.set("posX", node.getPosition().x);
            nodeObj.set("posY", node.getPosition().y);
            nodeObj.set("hp", node.getHp());
            nodeObj.set("maxHp", node.getMaxHp());
            nodeObj.set("defended", node.isDefended());
            
            nodesObj.set(node.getTypeName(), nodeObj);
        }
        result.set("nodes", nodesObj);
        
        // Infantry groups
        val infantryArray = val::array();
        const auto& infantryGroups = player.getInfantryGroups();
        for (size_t i = 0; i < infantryGroups.size(); ++i) {
            const auto& infantry = infantryGroups[i];
            val infObj = val::object();
            
            infObj.set("id", infantry.getId());
            infObj.set("posX", infantry.getPosition().x);
            infObj.set("posY", infantry.getPosition().y);
            infObj.set("count", infantry.getCount());
            infObj.set("hp", infantry.getHp());
            infObj.set("maxHp", infantry.getMaxHp());
            
            infantryArray.set(i, infObj);
        }
        result.set("infantry", infantryArray);
        
        // Long range unit
        const auto& lr = player.getLongRangeUnit();
        val lrObj = val::object();
        
        lrObj.set("id", lr.getId());
        lrObj.set("posX", lr.getPosition().x);
        lrObj.set("posY", lr.getPosition().y);
        lrObj.set("count", lr.getCount());
        lrObj.set("hp", lr.getHp());
        lrObj.set("maxHp", lr.getMaxHp());
        
        result.set("longRange", lrObj);
        
        return result;
    }
    
    val getGameLog() const {
        const auto& gameLog = m_gameState->getGameLog();
        val result = val::array();
        
        for (size_t i = 0; i < gameLog.size(); ++i) {
            result.set(i, gameLog[i]);
        }
        
        return result;
    }
};

// Helper function for Position struct
val positionToJS(const Position& pos) {
    val result = val::object();
    result.set("x", pos.x);
    result.set("y", pos.y);
    return result;
}

Position positionFromJS(const val& obj) {
    int x = obj["x"].as<int>();
    int y = obj["y"].as<int>();
    return Position(x, y);
}

// Binding code
EMSCRIPTEN_BINDINGS(noise_before_defeat) {
    class_<GameStateWrapper>("GameState")
        .constructor<>()
        .function("initializeGame", &GameStateWrapper::initializeGame)
        .function("submitAction", &GameStateWrapper::submitAction)
        .function("endTurn", &GameStateWrapper::endTurn)
        .function("isGameOver", &GameStateWrapper::isGameOver)
        .function("getWinner", &GameStateWrapper::getWinner)
        .function("getCurrentTurn", &GameStateWrapper::getCurrentTurn)
        .function("getGamePhase", &GameStateWrapper::getGamePhase)
        .function("getGameState", &GameStateWrapper::getGameState)
        .function("loadGameState", &GameStateWrapper::loadGameState)
        .function("getPlayerInfo", &GameStateWrapper::getPlayerInfo)
        .function("getGameLog", &GameStateWrapper::getGameLog);
        
    value_object<Position>("Position")
        .field("x", &Position::x)
        .field("y", &Position::y);
        
    register_vector<std::string>("VectorString");
    
    function("positionToJS", &positionToJS);
    function("positionFromJS", &positionFromJS);
}
