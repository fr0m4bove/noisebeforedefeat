import React, { useRef } from 'react';
import './NoiseBeforeDefeat.css';

const NoiseBeforeDefeat = () => {
  // Game constants
  const GRID_SIZE = 8;
  const CELL_SIZE = 50;
  
  // Board colors
  const LIGHT_CELL_COLOR = '#A3D3D6'; // Light blue
  const DARK_CELL_COLOR = '#FF9966';  // Dull orange
  const CENTER_CELL_COLOR = '#75BBCB80'; // Semi-transparent blue
  
  const svgRef = useRef(null);

  // Grid to SVG coordinate conversion
  const gridToSvg = (x, y) => {
    const svgX = (GRID_SIZE * CELL_SIZE) + (x * CELL_SIZE);
    const svgY = (GRID_SIZE * CELL_SIZE) + (y * CELL_SIZE);
    return { x: svgX, y: svgY };
  };

  // Check if a position is within grid bounds
  const isValidPosition = (x, y) => {
    return Math.abs(x) + Math.abs(y) <= GRID_SIZE;
  };

  // Generate the grid cells
  const generateGrid = () => {
    const cells = [];
    
    // Create a diamond shape using coordinate limits
    for (let y = -GRID_SIZE; y <= GRID_SIZE; y++) {
      for (let x = -GRID_SIZE; x <= GRID_SIZE; x++) {
        // Diamond shape constraint: |x| + |y| <= GRID_SIZE
        if (isValidPosition(x, y)) {
          const { x: svgX, y: svgY } = gridToSvg(x, y);
          const isCenter = x === 0 && y === 0;
          
          // Determine cell color
          let fillColor;
          if (isCenter) {
            fillColor = CENTER_CELL_COLOR;
          } else {
            fillColor = (x + y) % 2 === 0 ? LIGHT_CELL_COLOR : DARK_CELL_COLOR;
          }
          
          cells.push(
            <rect
              key={`cell-${x},${y}`}
              x={svgX - CELL_SIZE/2}
              y={svgY - CELL_SIZE/2}
              width={CELL_SIZE}
              height={CELL_SIZE}
              fill={fillColor}
              stroke="#333333"
              strokeWidth={0.5}
            />
          );
        }
      }
    }
    
    return cells;
  };

  // Calculate the SVG dimensions
  const svgWidth = (GRID_SIZE * 2 + 1) * CELL_SIZE;
  const svgHeight = (GRID_SIZE * 2 + 1) * CELL_SIZE;

  return (
    <div className="noise-game-container">
        <svg 
          ref={svgRef}
          width={svgWidth} 
          height={svgHeight} 
          className="game-board"
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
	  style={{marginRight: '100px' }} 
        >
          {generateGrid()}
        </svg>
      </div>
    </div>
  );
};

export default NoiseBeforeDefeat;
