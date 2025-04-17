#include "Node.h"

Node::Node()
    : m_type(NodeType::CORE)
    , m_position(0, 0)
    , m_hp(0)
    , m_maxHp(0)
    , m_defended(false)
{
}

Node::Node(NodeType type, const Position& position, int hp, int maxHp)
    : m_type(type)
    , m_position(position)
    , m_hp(hp)
    , m_maxHp(maxHp)
    , m_defended(false)
{
}

std::string Node::getTypeName() const {
    switch (m_type) {
        case NodeType::CORE:
            return "core";
        case NodeType::COMMS:
            return "comms";
        case NodeType::RD:
            return "rd";
        default:
            return "unknown";
    }
}

void Node::damage(int amount) {
    // If node is defended, reduce damage by 50%
    if (m_defended) {
        amount = amount / 2;
    }
    
    if (amount <= 0) {
        return;
    }
    
    // Apply damage
    m_hp -= amount;
    
    // Ensure HP doesn't go below 0
    if (m_hp < 0) {
        m_hp = 0;
    }
}

void Node::heal(int amount) {
    if (amount <= 0) {
        return;
    }
    
    // Apply healing
    m_hp += amount;
    
    // Ensure HP doesn't exceed max HP
    if (m_hp > m_maxHp) {
        m_hp = m_maxHp;
    }
}
