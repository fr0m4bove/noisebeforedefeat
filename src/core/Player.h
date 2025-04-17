#pragma once

#include <string>
#include <vector>
#include <map>
#include "Node.h"
#include "InfantryGroup.h"
#include "LongRangeUnit.h"

class Player {
public:
    Player(int id, const std::string& name);
    ~Player();
    
    // Getters
    int getId() const { return m_id; }
    const std::string& getName() const { return m_name; }
    int getIntelPoints() const { return m_intelPoints; }
    const std::map<NodeType, Node>& getNodes() const { return m_nodes; }
    const std::vector<InfantryGroup>& getInfantryGroups() const { return m_infantryGroups; }
    const LongRangeUnit& getLongRangeUnit() const { return m_longRangeUnit; }
    
    // Node management
    void initializeNodes(const Position& corePos, const Position& commsPos, const Position& rdPos);
    void addNode(const std::string& typeStr, const Position& pos, int hp, int maxHp, bool defended);
    void damageNode(NodeType type, int amount);
    void healNode(NodeType type, int amount);
    void defendNode(NodeType type);
    
    // Unit management
    void addInfantryGroup(const Position& pos, int count, const std::string& id = "");
    void updateInfantryStats(const std::string& id, int hp, int maxHp);
    void setLongRangeUnit(const Position& pos, int count, const std::string& id = "");
    void updateLongRangeStats(int hp, int maxHp);
    
    // Resource management
    void addIntelPoints(int amount);
    void spendIntelPoints(int amount);
    void setIntelPoints(int amount) { m_intelPoints = amount; }
    
    // Status checks
    bool isCoreAlive() const;
    bool isCommsAlive() const;
    bool isRDLabAlive() const;
    
private:
    int m_id;
    std::string m_name;
    int m_intelPoints;
    std::map<NodeType, Node> m_nodes;
    std::vector<InfantryGroup> m_infantryGroups;
    LongRangeUnit m_longRangeUnit;
    
    // Generate a new unique ID for units
    std::string generateUnitId(const std::string& prefix) const;
};
