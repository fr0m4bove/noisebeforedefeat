#pragma once

#include <cmath>
#include <string>

struct Position {
    int x;
    int y;
    
    Position() : x(0), y(0) {}
    Position(int _x, int _y) : x(_x), y(_y) {}
    
    bool operator==(const Position& other) const {
        return x == other.x && y == other.y;
    }
    
    bool operator!=(const Position& other) const {
        return !(*this == other);
    }
    
    // Calculate Manhattan distance between two positions
    int manhattanDistance(const Position& other) const {
        return std::abs(x - other.x) + std::abs(y - other.y);
    }
    
    // Calculate Euclidean distance between two positions
    float euclideanDistance(const Position& other) const {
        int dx = x - other.x;
        int dy = y - other.y;
        return std::sqrt(dx*dx + dy*dy);
    }
    
    // Check if position is adjacent (including diagonals)
    bool isAdjacentTo(const Position& other) const {
        int dx = std::abs(x - other.x);
        int dy = std::abs(y - other.y);
        return dx <= 1 && dy <= 1 && !(dx == 0 && dy == 0);
    }
    
    // Convert to string representation (for debugging)
    std::string toString() const {
        return "(" + std::to_string(x) + "," + std::to_string(y) + ")";
    }
    
    // Check if position is within board bounds
    bool isValidPosition(int gridSize) const {
        return std::abs(x) + std::abs(y) <= gridSize;
    }
};
