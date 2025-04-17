#include "LongRangeUnit.h"
#include <algorithm>
#include <cmath>

LongRangeUnit::LongRangeUnit()
    : m_id("")
    , m_position(0, 0)
    , m_count(0)
    , m_hp(0)
    , m_maxHp(0)
{
}

LongRangeUnit::LongRangeUnit(const Position& position, int count, const std::string& id)
    : m_id(id)
    , m_position(position)
    , m_count(count)
    , m_hp(count * 2)  // Each long range unit has 2 HP
    , m_maxHp(count * 2)
{
}

void LongRangeUnit::damage(int amount) {
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

void LongRangeUnit::heal(int amount) {
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

LongRangeUnit LongRangeUnit::split(int countToSplit) {
    // Ensure we're not splitting more than we have
    countToSplit = std::min(countToSplit, m_count - 1);
    
    // Ensure at least one unit remains
    if (countToSplit <= 0 || m_count <= 1) {
        return LongRangeUnit();
    }
    
    // Calculate HP for the split group
    int hpPerUnit = 2;
    int splitHp = countToSplit * hpPerUnit;
    
    // Create the new group
    std::string newId = m_id + "-split";
    LongRangeUnit newGroup(m_position, countToSplit, newId);
    newGroup.setHp(splitHp);
    
    // Update this group
    m_count -= countToSplit;
    m_hp -= splitHp;
    m_maxHp = m_count * hpPerUnit;
    
    return newGroup;
}

int LongRangeUnit::calculateAttackDamage(const std::string& targetType) const {
    // Long range damage calculation based on group size
    if (targetType == "infantry") {
        return m_count * 2; // 2 damage per piece in group
    } 
    else if (targetType == "core") {
        return m_count >= 2 ? 35 : 1; // 35 damage if 2+ pieces, otherwise 1
    } 
    else {
        return m_count >= 2 ? 5 : 1; // 5 damage if 2+ pieces, otherwise 1
    }
}

bool LongRangeUnit::canAttack(const Position& targetPosition) const {
    // Long range can attack up to 3 squares away (Manhattan distance)
    int dx = std::abs(m_position.x - targetPosition.x);
    int dy = std::abs(m_position.y - targetPosition.y);
    return dx + dy <= 3 && !(dx == 0 && dy == 0);
}
