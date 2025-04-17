#include "InfantryGroup.h"
#include <algorithm>
#include <cmath>

InfantryGroup::InfantryGroup()
    : m_id("")
    , m_position(0, 0)
    , m_count(0)
    , m_hp(0)
    , m_maxHp(0)
{
}

InfantryGroup::InfantryGroup(const Position& position, int count, const std::string& id)
    : m_id(id)
    , m_position(position)
    , m_count(count)
    , m_hp(count * 2)  // Each infantry unit has 2 HP
    , m_maxHp(count * 2)
{
}

void InfantryGroup::damage(int amount) {
    if (amount <= 0) {
        return;
    }
    
    // Apply damage
    m_hp -= amount;
    
    // Ensure HP doesn't go below 0
    if (m_hp < 0) {
        m_hp = 0;
    }
    
    // Update count based on remaining HP
    m_count = std::ceil(static_cast<float>(m_hp) / 2.0f);
}

void InfantryGroup::heal(int amount) {
    if (amount <= 0) {
        return;
    }
    
    // Apply healing
    m_hp += amount;
    
    // Ensure HP doesn't exceed max HP
    if (m_hp > m_maxHp) {
        m_hp = m_maxHp;
    }
    
    // Update count based on new HP
    m_count = std::ceil(static_cast<float>(m_hp) / 2.0f);
}

InfantryGroup InfantryGroup::split(int countToSplit) {
    // Ensure we're not splitting more than we have
    countToSplit = std::min(countToSplit, m_count - 1);
    
    // Ensure at least one unit remains
    if (countToSplit <= 0 || m_count <= 1) {
        return InfantryGroup();
    }
    
    // Calculate HP for the split group
    int hpPerUnit = 2;
    int splitHp = countToSplit * hpPerUnit;
    
    // Create the new group
    std::string newId = m_id + "-split";
    InfantryGroup newGroup(m_position, countToSplit, newId);
    newGroup.setHp(splitHp);
    
    // Update this group
    m_count -= countToSplit;
    m_hp -= splitHp;
    m_maxHp = m_count * hpPerUnit;
    
    return newGroup;
}

int InfantryGroup::calculateAttackDamage(const std::string& targetType) const {
    // Base infantry damage calculation
    if (targetType == "infantry") {
        return std::min(15, m_count / 3); // Base infantry damage
    } 
    else if (targetType == "core") {
        return std::min(20, m_count / 2);
    } 
    else {
        return std::min(10, m_count / 4);
    }
}

bool InfantryGroup::canAttack(const Position& targetPosition) const {
    // Infantry can attack adjacent squares (including diagonals)
    int dx = std::abs(m_position.x - targetPosition.x);
    int dy = std::abs(m_position.y - targetPosition.y);
    return dx <= 1 && dy <= 1 && !(dx == 0 && dy == 0);
}
