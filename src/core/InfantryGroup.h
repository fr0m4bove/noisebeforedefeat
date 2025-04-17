#pragma once

#include "Position.h"
#include <string>

class InfantryGroup {
public:
    InfantryGroup();
    InfantryGroup(const Position& position, int count, const std::string& id);
    
    // Getters
    const std::string& getId() const { return m_id; }
    const Position& getPosition() const { return m_position; }
    int getCount() const { return m_count; }
    int getHp() const { return m_hp; }
    int getMaxHp() const { return m_maxHp; }
    
    // Setters
    void setPosition(const Position& position) { m_position = position; }
    void setCount(int count) { m_count = count; }
    void setHp(int hp) { m_hp = (hp > m_maxHp) ? m_maxHp : ((hp < 0) ? 0 : hp); }
    void setMaxHp(int maxHp) { m_maxHp = maxHp; }
    
    // Actions
    void damage(int amount);
    void heal(int amount);
    InfantryGroup split(int countToSplit);
    
    // Combat
    int calculateAttackDamage(const std::string& targetType) const;
    bool canAttack(const Position& targetPosition) const;
    
private:
    std::string m_id;
    Position m_position;
    int m_count;
    int m_hp;
    int m_maxHp;
};
