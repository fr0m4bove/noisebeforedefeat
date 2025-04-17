import React, { forwardRef } from 'react';
import './NoiseBeforeDefeat.css';

const GameBoard = forwardRef(({
  gridSize,
  cellSize,
  players,
  selectedPosition,
  validMoves,
  onCellClick
}, ref) => {
  // Board colors
  const LIGHT_CELL_COLOR = '#A3D3D6';
  const DARK_CELL_COLOR = '#FF9966';
  const CENTER_CELL_COLOR = '#75BBCB80';
  const HIGHLIGHT_COLOR = 'rgba(150, 150, 150, 0.5)';
  
  // Check if a position is the center square
  const isCenterSquare = (x, y) => {
    return x === 0 && y === 0;
  };
  
  // Check if a position is within grid bounds
  const isValidPosition = (x, y) => {
    return Math.abs(x) + Math.abs(y) <= gridSize;
  };
  
  // Grid to SVG coordinate conversion
  const gridToSvg = (x, y) => {
    const svgX = (gridSize * cellSize) + (x * cellSize);
    const svgY = (gridSize * cellSize) + (y * cellSize);
    return { x: svgX, y: svgY };
  };
  
  // Convert grid coordinates to chess notation
  const gridToChessNotation = (x, y) => {
    const file = String.fromCharCode(97 + (x + gridSize / 2));
    const rank = gridSize - y + 1;
    return { file, rank };
  };
  
  // Render the board cells
  const renderBoard = () => {
    const cells = [];
    
    for (let x = -gridSize; x <= gridSize; x++) {
      for (let y = -gridSize; y <= gridSize; y++) {
        // Check if position is valid
        if (!isValidPosition(x, y)) continue;
        
        const { x: svgX, y: svgY } = gridToSvg(x, y);
        
        // Determine cell color
        let fillColor = (x + y) % 2 === 0 ? LIGHT_CELL_COLOR : DARK_CELL_COLOR;
        
        // Center square has special color
        if (isCenterSquare(x, y)) {
          fillColor = CENTER_CELL_COLOR;
        }
        
        // Check if this is a valid move
        const isValidMove = validMoves.some(move => move.x === x && move.y === y);
        
        // Check if this is the selected position
        const isSelected = selectedPosition && selectedPosition.x === x && selectedPosition.y === y;
        
        cells.push(
          <rect
            key={`cell-${x}-${y}`}
            x={svgX - cellSize / 2}
            y={svgY - cellSize / 2}
            width={cellSize}
            height={cellSize}
            fill={fillColor}
            stroke={isSelected ? "#FFFF00" : "#333333"}
            strokeWidth={isSelected ? 2 : 0.5}
            onClick={() => onCellClick(x, y)}
            style={{ cursor: 'pointer' }}
          />
        );
        
        // Add highlight for valid moves
        if (isValidMove) {
          cells.push(
            <rect
              key={`highlight-${x}-${y}`}
              x={svgX - cellSize / 2}
              y={svgY - cellSize / 2}
              width={cellSize}
              height={cellSize}
              fill={HIGHLIGHT_COLOR}
              onClick={() => onCellClick(x, y)}
              style={{ cursor: 'pointer' }}
              className="valid-move-indicator"
            />
          );
        }
        
        // Add chess notation
        const { file, rank } = gridToChessNotation(x, y);
        if (x === -gridSize) {
          cells.push(
            <text
              key={`rank-${y}`}
              x={svgX - cellSize * 0.75}
              y={svgY + cellSize * 0.15}
              fontSize={cellSize * 0.3}
              textAnchor="middle"
              fill="#333333"
            >
              {rank}
            </text>
          );
        }
        if (y === gridSize) {
          cells.push(
            <text
              key={`file-${x}`}
              x={svgX}
              y={svgY + cellSize * 0.75}
              fontSize={cellSize * 0.3}
              textAnchor="middle"
              fill="#333333"
            >
              {file}
            </text>
          );
        }
      }
    }
    
    return cells;
  };
  
  // Render infantry unit
  const renderInfantry = (unit, playerId) => {
    const { x, y } = gridToSvg(unit.posX, unit.posY);
    
    // Get health percentage for the color
    const healthPercentage = (unit.hp / unit.maxHp) * 100;
    const healthColor = healthPercentage > 50 ? "#00CC00" : 
                       healthPercentage > 25 ? "#FFCC00" : "#CC0000";
    
    return (
      <g 
        key={unit.id} 
        transform={`translate(${x}, ${y})`}
        onClick={() => onCellClick(unit.posX, unit.posY)}
        style={{ cursor: 'pointer' }}
      >
        <circle 
          r={cellSize * 0.4} 
          fill={playerId === 0 ? "#72B4E0" : "#FF7777"}
          stroke="#000000"
          strokeWidth={1}
        />
        <text 
          textAnchor="middle" 
          dy="0.3em" 
          fill="#FFFFFF"
          fontWeight="bold"
          fontSize={cellSize * 0.3}
        >
          {unit.count}
        </text>
        {/* Health bar */}
        <rect 
          x={-cellSize * 0.4} 
          y={cellSize * 0.25} 
          width={cellSize * 0.8} 
          height={cellSize * 0.1} 
          fill="#333333"
          rx={2}
          ry={2}
        />
        <rect 
          x={-cellSize * 0.4} 
          y={cellSize * 0.25} 
          width={cellSize * 0.8 * (unit.hp / unit.maxHp)} 
          height={cellSize * 0.1} 
          fill={healthColor}
          rx={2}
          ry={2}
        />
      </g>
    );
  };
  
  // Render long range unit
  const renderLongRange = (unit, playerId) => {
    const { x, y } = gridToSvg(unit.posX, unit.posY);
    
    // Get health percentage for the color
    const healthPercentage = (unit.hp / unit.maxHp) * 100;
    const healthColor = healthPercentage > 50 ? "#00CC00" : 
                       healthPercentage > 25 ? "#FFCC00" : "#CC0000";
    
    return (
      <g 
        key={unit.id} 
        transform={`translate(${x}, ${y})`}
        onClick={() => onCellClick(unit.posX, unit.posY)}
        style={{ cursor: 'pointer' }}
      >
        <rect 
          x={-cellSize * 0.35} 
          y={-cellSize * 0.25} 
          width={cellSize * 0.7} 
          height={cellSize * 0.5}
          fill={playerId === 0 ? "#3399FF" : "#FF3333"}
          stroke="#000000"
          strokeWidth={1}
          rx={3}
          ry={3}
        />
        <text 
          textAnchor="middle" 
          dy="0.1em" 
          fill="#FFFFFF"
          fontWeight="bold"
          fontSize={cellSize * 0.3}
        >
          {unit.count}
        </text>
        {/* Health bar */}
        <rect 
          x={-cellSize * 0.35} 
          y={cellSize * 0.15} 
          width={cellSize * 0.7} 
          height={cellSize * 0.1} 
          fill="#333333"
          rx={2}
          ry={2}
        />
        <rect 
          x={-cellSize * 0.35} 
          y={cellSize * 0.15} 
          width={cellSize * 0.7 * (unit.hp / unit.maxHp)} 
          height={cellSize * 0.1} 
          fill={healthColor}
          rx={2}
          ry={2}
        />
      </g>
    );
  };
  
  // Render node
  const renderNode = (node, nodeType, playerId) => {
    const { x, y } = gridToSvg(node.posX, node.posY);
    
    // Different shapes for different node types
    let nodeShape;
    if (nodeType === 'core') {
      // Core node - hexagon
      nodeShape = (
        <polygon 
          points={`0,${-cellSize * 0.4} ${cellSize * 0.35},${-cellSize * 0.2} ${cellSize * 0.35},${cellSize * 0.2} 0,${cellSize * 0.4} ${-cellSize * 0.35},${cellSize * 0.2} ${-cellSize * 0.35},${-cellSize * 0.2}`}
          fill={playerId === 0 ? "#0033CC" : "#CC0000"}
          stroke="#000000"
          strokeWidth={1}
        />
      );
    } else if (nodeType === 'comms') {
      // Comms node - diamond
      nodeShape = (
        <polygon 
          points={`0,${-cellSize * 0.4} ${cellSize * 0.4},0 0,${cellSize * 0.4} ${-cellSize * 0.4},0`}
          fill={playerId === 0 ? "#3366CC" : "#CC3333"}
          stroke="#000000"
          strokeWidth={1}
        />
      );
    } else if (nodeType === 'rd') {
      // R&D node - triangle
      nodeShape = (
        <polygon 
          points={`0,${-cellSize * 0.4} ${cellSize * 0.4},${cellSize * 0.3} ${-cellSize * 0.4},${cellSize * 0.3}`}
          fill={playerId === 0 ? "#6699CC" : "#CC6666"}
          stroke="#000000"
          strokeWidth={1}
        />
      );
    }
    
    // Get health percentage for the color
    const healthPercentage = (node.hp / node.maxHp) * 100;
    const healthColor = healthPercentage > 50 ? "#00CC00" : 
                       healthPercentage > 25 ? "#FFCC00" : "#CC0000";
    
    return (
      <g 
        key={`${playerId}-${nodeType}`} 
        transform={`translate(${x}, ${y})`}
        onClick={() => onCellClick(node.posX, node.posY)}
        style={{ cursor: 'pointer' }}
      >
        {nodeShape}
        {/* Health bar */}
        <rect 
          x={-cellSize * 0.4} 
          y={cellSize * 0.25} 
          width={cellSize * 0.8} 
          height={cellSize * 0.1} 
          fill="#333333"
          rx={2}
          ry={2}
        />
        <rect 
          x={-cellSize * 0.4} 
          y={cellSize * 0.25} 
          width={cellSize * 0.8 * (node.hp / node.maxHp)} 
          height={cellSize * 0.1} 
          fill={healthColor}
          rx={2}
          ry={2}
        />
        {/* Node type indicator */}
        <text 
          textAnchor="middle" 
          dy="0.1em" 
          fill="#FFFFFF"
          fontWeight="bold"
          fontSize={cellSize * 0.25}
        >
          {nodeType === 'core' ? 'C' : nodeType === 'comms' ? 'CO' : 'R&D'}
        </text>
      </g>
    );
  };
  
  // Render all game elements
  const renderGameElements = () => {
    const elements = [];
    
    if (!players || players.length < 2) return elements;
    
    // Render player 1 elements
    const player1 = players[0];
    
    // Render infantry
    if (player1.infantry) {
      for (const infantry of player1.infantry) {
        elements.push(renderInfantry(infantry, 0));
      }
    }
    
    // Render long range
    if (player1.longRange) {
      elements.push(renderLongRange(player1.longRange, 0));
    }
    
    // Render nodes
    if (player1.nodes) {
      for (const nodeType in player1.nodes) {
        elements.push(renderNode(player1.nodes[nodeType], nodeType, 0));
      }
    }
    
    // Render player 2 elements
    const player2 = players[1];
    
    // Render infantry
    if (player2.infantry) {
      for (const infantry of player2.infantry) {
        elements.push(renderInfantry(infantry, 1));
      }
    }
    
    // Render long range
    if (player2.longRange) {
      elements.push(renderLongRange(player2.longRange, 1));
    }
    
    // Render nodes
    if (player2.nodes) {
      for (const nodeType in player2.nodes) {
        elements.push(renderNode(player2.nodes[nodeType], nodeType, 1));
      }
    }
    
    return elements;
  };
  
  return (
    <svg
      ref={ref}
      width={gridSize * 2 * cellSize}
      height={gridSize * 2 * cellSize}
      className="game-board"
      viewBox={`0 0 ${gridSize * 2 * cellSize} ${gridSize * 2 * cellSize}`}
      preserveAspectRatio="xMidYMid meet"
    >
      {renderBoard()}
      {renderGameElements()}
    </svg>
  );
});

export default GameBoard;
