#pragma once

#include "Position.h"
#include <string>

enum class NodeType {
    CORE,
    COMMS,
    RD
};

class Node {
public:
    Node();
    Node(NodeType type, const Position& position, int hp, int maxHp);
    
    // Getters
    NodeType getType() const { return m_type; }
    std::string getTypeName() const;
    const Position& getPosition() const { return m_position; }
    int getHp() const { return m_hp; }
    int getMaxHp() const { return m_maxHp; }
    bool isDefended() const { return m_defended; }
    
    // Setters
    void setPosition(const Position& position) { m_position = position; }
    void setHp(int hp) { m_hp = (hp > m_maxHp) ? m_maxHp : ((hp < 0) ? 0 : hp); }
    void setMaxHp(int maxHp) { m_maxHp = maxHp; }
    void setDefended(bool defended) { m_defended = defended; }
    
    // Actions
    void damage(int amount);
    void heal(int amount);
    
private:
    NodeType m_type;
    Position m_position;
    int m_hp;
    int m_maxHp;
    bool m_defended;
};
