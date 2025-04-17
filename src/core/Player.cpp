#include "Player.h"
#include <chrono>

Player::Player(int id, const std::string& name)
    : m_id(id)
    , m_name(name)
    , m_intelPoints(100)
    , m_longRangeUnit(Position(0, 0), 0, "")
{
}

Player::~Player() {
}

void Player::initializeNodes(const Position& corePos, const Position& commsPos, const Position& rdPos) {
    // Create Core node
    m_nodes[NodeType::CORE] = Node(NodeType::CORE, corePos, 50, 50);
    
    // Create Comms node
    m_nodes[NodeType::COMMS] = Node(NodeType::COMMS, commsPos, 50, 50);
    
    // Create R&D node
    m_nodes[NodeType::RD] = Node(NodeType::RD, rdPos, 50, 50);
}

void Player::addNode(const std::string& typeStr, const Position& pos, int hp, int maxHp, bool defended) {
    NodeType type;
    
    if (typeStr == "core") {
        type = NodeType::CORE;
    } else if (typeStr == "comms") {
        type = NodeType::COMMS;
    } else if (typeStr == "rd") {
        type = NodeType::RD;
    } else {
        return; // Invalid node type
    }
    
    Node node(type, pos, hp, maxHp);
    if (defended) {
        node.setDefended(true);
    }
    
    m_nodes[type] = node;
}

void Player::damageNode(NodeType type, int amount) {
    auto it = m_nodes.find(type);
    if (it != m_nodes.end()) {
        it->second.damage(amount);
    }
}

void Player::healNode(NodeType type, int amount) {
    auto it = m_nodes.find(type);
    if (it != m_nodes.end()) {
        it->second.heal(amount);
    }
}

void Player::defendNode(NodeType type) {
    auto it = m_nodes.find(type);
    if (it != m_nodes.end()) {
        it->second.setDefended(true);
    }
}

void Player::addInfantryGroup(const Position& pos, int count, const std::string& id) {
    std::string unitId = id.empty() ? generateUnitId("inf") : id;
    InfantryGroup infantry(pos, count, unitId);
    m_infantryGroups.push_back(infantry);
}

void Player::updateInfantryStats(const std::string& id, int hp, int maxHp) {
    for (auto& infantry : m_infantryGroups) {
        if (infantry.getId() == id) {
            infantry.setHp(hp);
            infantry.setMaxHp(maxHp);
            break;
        }
    }
}

void Player::setLongRangeUnit(const Position& pos, int count, const std::string& id) {
    std::string unitId = id.empty() ? generateUnitId("lr") : id;
    m_longRangeUnit = LongRangeUnit(pos, count, unitId);
}

void Player::updateLongRangeStats(int hp, int maxHp) {
    m_longRangeUnit.setHp(hp);
    m_longRangeUnit.setMaxHp(maxHp);
}

void Player::addIntelPoints(int amount) {
    m_intelPoints += amount;
}

void Player::spendIntelPoints(int amount) {
    if (m_intelPoints >= amount) {
        m_intelPoints -= amount;
    }
}

bool Player::isCoreAlive() const {
    auto it = m_nodes.find(NodeType::CORE);
    if (it != m_nodes.end()) {
        return it->second.getHp() > 0;
    }
    return false;
}

bool Player::isCommsAlive() const {
    auto it = m_nodes.find(NodeType::COMMS);
    if (it != m_nodes.end()) {
        return it->second.getHp() > 0;
    }
    return false;
}

bool Player::isRDLabAlive() const {
    auto it = m_nodes.find(NodeType::RD);
    if (it != m_nodes.end()) {
        return it->second.getHp() > 0;
    }
    return false;
}

std::string Player::generateUnitId(const std::string& prefix) const {
    auto now = std::chrono::system_clock::now();
    auto millis = std::chrono::duration_cast<std::chrono::milliseconds>(now.time_since_epoch()).count();
    return "p" + std::to_string(m_id) + "-" + prefix + "-" + std::to_string(millis);
}
