// GameUtilities.jsx
// Helper functions for game mechanics

// Calculate damage based on unit type and count
export const calculateDamage = (attacker, target) => {
  const { type, count } = attacker;
  
  if (type === 'infantry') {
    // Infantry damage calculation
    if (target.type === 'infantry') {
      return Math.min(15, count / 3); // Base infantry damage
    } else if (target.type === 'core') {
      return Math.min(20, count / 2);
    } else {
      return Math.min(10, count / 4);
    }
  } else if (type === 'longrange') {
    // Long range damage calculation based on group size
    if (target.type === 'infantry') {
      return count * 2; // 2 damage per piece in group
    } else if (target.type === 'core') {
      return count >= 2 ? 35 : 1; // 35 damage if 2+ pieces, otherwise 1
    } else {
      return count >= 2 ? 5 : 1; // 5 damage if 2+ pieces, otherwise 1
    }
  }
  
  return 0;
};

// Check if a position is the center square
export const isCenterSquare = (position) => {
  return position.x === 0 && position.y === 0;
};

// Check if a target is within attack range
export const isInAttackRange = (source, target, attackerType) => {
  const dx = Math.abs(source.x - target.x);
  const dy = Math.abs(source.y - target.y);
  
  if (attackerType === 'infantry') {
    // Infantry can attack adjacent squares (including diagonals)
    return dx <= 1 && dy <= 1 && !(dx === 0 && dy === 0);
  } else if (attackerType === 'longrange') {
    // Long range can attack up to 3 squares away
    return dx + dy <= 3 && !(dx === 0 && dy === 0);
  }
  
  return false;
};

// Check if a position is within grid bounds
export const isValidPosition = (x, y) => {
  return Math.abs(x) + Math.abs(y) <= 8; // Using GRID_SIZE (8) as constant
};

// Get valid adjacent moves for a position
export const getValidMoves = (position, gameState, isCellOccupied, isValidPosition) => {
  const { x, y } = position;
  const directions = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
    { x: 1, y: 1 },  // Diagonal moves
    { x: 1, y: -1 },
    { x: -1, y: 1 },
    { x: -1, y: -1 }
  ];
  
  return directions
    .map(dir => ({ x: x + dir.x, y: y + dir.y }))
    .filter(pos => isValidPosition(pos.x, pos.y) && !isCellOccupied(pos.x, pos.y));
};

// Grid to SVG coordinate conversion - WITH VIEWBOX ADJUSTMENT
// This matches your current viewBox values
export const gridToSvg = (x, y) => {
  const GRID_SIZE = 8;
  const CELL_SIZE = 50;
  
  // Use your original calculation but with consistent offset values
  const svgX = (GRID_SIZE / 2 * CELL_SIZE) + (x * CELL_SIZE);
  const svgY = (GRID_SIZE / 2 * CELL_SIZE) + (y * CELL_SIZE);
  
  return { x: svgX, y: svgY };
};

// Convert grid coordinates to chess notation
export const gridToChessNotation = (x, y) => {
  const GRID_SIZE = 8;
  // Convert x to letter (a-i)
  const file = String.fromCharCode(97 + (x + GRID_SIZE / 2));
  // Convert y to number (1-9)
  const rank = GRID_SIZE - y + 1;
  return { file, rank };
};

// Calculate the center of a grid cell in SVG coordinates
export const getCellCenter = (x, y) => {
  const { x: svgX, y: svgY } = gridToSvg(x, y);
  return { x: svgX, y: svgY };
};

// Check if two positions are adjacent (including diagonals)
export const arePositionsAdjacent = (pos1, pos2) => {
  const dx = Math.abs(pos1.x - pos2.x);
  const dy = Math.abs(pos1.y - pos2.y);
  return dx <= 1 && dy <= 1 && !(dx === 0 && dy === 0);
};

// Calculate Manhattan distance between two positions
export const getManhattanDistance = (pos1, pos2) => {
  return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
};

// Format a timestamp for display
export const formatTime = (timestamp) => {
  if (!timestamp) return '';
  
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Calculate health percentage
export const getHealthPercentage = (current, max) => {
  return (current / max) * 100;
};

// Determine health color based on percentage
export const getHealthColor = (percentage) => {
  if (percentage > 50) return "#00CC00"; // Green
  if (percentage > 25) return "#FFCC00"; // Yellow
  return "#CC0000"; // Red
};

export default {
  calculateDamage,
  isCenterSquare,
  isInAttackRange,
  isValidPosition,
  getValidMoves,
  gridToSvg,
  gridToChessNotation,
  getCellCenter,
  arePositionsAdjacent,
  getManhattanDistance,
  formatTime,
  getHealthPercentage,
  getHealthColor
};
