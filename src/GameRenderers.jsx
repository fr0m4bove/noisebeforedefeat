// GameRenderers.jsx
// Functions for rendering game elements

// Render the game board grid and cells
export const renderBoard = (
  GRID_SIZE, 
  CELL_SIZE, 
  LIGHT_CELL_COLOR, 
  DARK_CELL_COLOR, 
  CENTER_CELL_COLOR, 
  HIGHLIGHT_COLOR,
  gameState,
  handleCellClick,
  isValidPosition,
  gridToSvg,
  gridToChessNotation
) => {
  const cells = [];
  
  // Render the cells
  for (let x = -GRID_SIZE; x <= GRID_SIZE; x++) {
    for (let y = -GRID_SIZE; y <= GRID_SIZE; y++) {
      // Check if position is valid
      if (!isValidPosition(x, y)) continue;
      
      const { x: svgX, y: svgY } = gridToSvg(x, y);
      
      // Determine cell color
      let fillColor = (x + y) % 2 === 0 ? LIGHT_CELL_COLOR : DARK_CELL_COLOR;
      
      // Center square has special color
      if (x === 0 && y === 0) {
        fillColor = CENTER_CELL_COLOR;
      }
      
      // Check if this is a valid move for the selected piece
      const isValidMove = gameState.validMoves.some(
        move => move.x === x && move.y === y
      );
      
      cells.push(
        <rect
          key={`cell-${x}-${y}`}
          x={svgX - CELL_SIZE / 2}
          y={svgY - CELL_SIZE / 2}
          width={CELL_SIZE}
          height={CELL_SIZE}
          fill={fillColor}
          stroke="#333333"
          strokeWidth={0.5}
          onClick={() => handleCellClick(x, y)}
          style={{ cursor: 'pointer' }}
        />
      );
      
      // Add highlight for valid moves
      if (isValidMove) {
        cells.push(
          <rect
            key={`highlight-${x}-${y}`}
            x={svgX - CELL_SIZE / 2}
            y={svgY - CELL_SIZE / 2}
            width={CELL_SIZE}
            height={CELL_SIZE}
            fill={HIGHLIGHT_COLOR}
            onClick={() => handleCellClick(x, y)}
            style={{ cursor: 'pointer' }}
            className="valid-move-indicator"
          />
        );
      }
      
      // Add chess notation
      const { file, rank } = gridToChessNotation(x, y);
      if (x === -GRID_SIZE) {
        cells.push(
          <text
            key={`rank-${y}`}
            x={svgX - CELL_SIZE * 0.75}
            y={svgY + CELL_SIZE * 0.15}
            fontSize={CELL_SIZE * 0.3}
            textAnchor="middle"
            fill="#333333"
          >
            {rank}
          </text>
        );
      }
      if (y === GRID_SIZE) {
        cells.push(
          <text
            key={`file-${x}`}
            x={svgX}
            y={svgY + CELL_SIZE * 0.75}
            fontSize={CELL_SIZE * 0.3}
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
export const renderInfantry = (unit, playerId, gameState, animations, CELL_SIZE, handleCellClick) => {
  const { x, y } = gridToSvg(unit.position.x, unit.position.y);
  const animation = animations[`move-${unit.id}`] || animations[`attack-${unit.id}`];
  const isSelected = gameState.selectedPiece?.id === unit.id;
  const isAttackSource = gameState.attackSource?.id === unit.id;
  const isSurroundAttacker = gameState.surroundAttackSources.some(
    source => source.id === unit.id
  );
  
  // Highlight if selected or part of attack
  const highlightStroke = isSelected || isAttackSource || isSurroundAttacker
    ? "#FFFF00" // Yellow highlight
    : playerId === 'p1' ? "#0066CC" : "#CC0000";
  
  const highlightWidth = isSelected || isAttackSource || isSurroundAttacker ? 3 : 1;
  
  // Get health percentage for the color
  const healthPercentage = (unit.hp / unit.maxHp) * 100;
  const healthColor = healthPercentage > 50 ? "#00CC00" : 
                     healthPercentage > 25 ? "#FFCC00" : "#CC0000";
  
  return (
    <g 
      key={unit.id} 
      transform={`translate(${x}, ${y})`}
      onClick={() => handleCellClick(unit.position.x, unit.position.y)}
      style={{ cursor: 'pointer' }}
      className={animation ? 'attack-animation' : ''}
    >
      <circle 
        r={CELL_SIZE * 0.4} 
        fill={playerId === 'p1' ? "#72B4E0" : "#FF7777"}
        stroke={highlightStroke}
        strokeWidth={highlightWidth}
      />
      <text 
        textAnchor="middle" 
        dy="0.3em" 
        fill={playerId === 'p1' ? "#FFFFFF" : "#FFFFFF"}
        fontWeight="bold"
        fontSize={CELL_SIZE * 0.3}
      >
        {unit.count}
      </text>
      {/* Health bar */}
      <rect 
        x={-CELL_SIZE * 0.4} 
        y={CELL_SIZE * 0.25} 
        width={CELL_SIZE * 0.8} 
        height={CELL_SIZE * 0.1} 
        fill="#333333"
        rx={2}
        ry={2}
      />
      <rect 
        x={-CELL_SIZE * 0.4} 
        y={CELL_SIZE * 0.25} 
        width={CELL_SIZE * 0.8 * (unit.hp / unit.maxHp)} 
        height={CELL_SIZE * 0.1} 
        fill={healthColor}
        rx={2}
        ry={2}
      />
    </g>
  );
};

// Render long range unit
export const renderLongRange = (unit, playerId, gameState, animations, CELL_SIZE, handleCellClick) => {
  const { x, y } = gridToSvg(unit.position.x, unit.position.y);
  const animation = animations[`move-${playerId}-longrange`] || animations[`attack-${playerId}-longrange`];
  const isSelected = gameState.selectedPiece?.type === 'longrange' && gameState.selectedPiece?.id === `${playerId}-longrange`;
  const isAttackSource = gameState.attackSource?.type === 'longrange' && gameState.attackSource?.id === `${playerId}-longrange`;
  const isSurroundAttacker = gameState.surroundAttackSources.some(
    source => source.type === 'longrange' && source.id === `${playerId}-longrange`
  );
  
  // Highlight if selected or part of attack
  const highlightStroke = isSelected || isAttackSource || isSurroundAttacker
    ? "#FFFF00" // Yellow highlight
    : playerId === 'p1' ? "#0066CC" : "#CC0000";
  
  const highlightWidth = isSelected || isAttackSource || isSurroundAttacker ? 3 : 1;
  
// Get health percentage for the color
  const healthPercentage = (unit.hp / unit.maxHp) * 100;
  const healthColor = healthPercentage > 50 ? "#00CC00" : 
                     healthPercentage > 25 ? "#FFCC00" : "#CC0000";
  
  return (
    <g 
      key={`${playerId}-longrange`} 
      transform={`translate(${x}, ${y})`}
      onClick={() => handleCellClick(unit.position.x, unit.position.y)}
      style={{ cursor: 'pointer' }}
      className={animation ? 'attack-animation' : ''}
    >
      <rect 
        x={-CELL_SIZE * 0.35} 
        y={-CELL_SIZE * 0.25} 
        width={CELL_SIZE * 0.7} 
        height={CELL_SIZE * 0.5}
        fill={playerId === 'p1' ? "#3399FF" : "#FF3333"}
        stroke={highlightStroke}
        strokeWidth={highlightWidth}
        rx={3}
        ry={3}
      />
      <text 
        textAnchor="middle" 
        dy="0.1em" 
        fill={playerId === 'p1' ? "#FFFFFF" : "#FFFFFF"}
        fontWeight="bold"
        fontSize={CELL_SIZE * 0.3}
      >
        {unit.count}
      </text>
      {/* Health bar */}
      <rect 
        x={-CELL_SIZE * 0.35} 
        y={CELL_SIZE * 0.15} 
        width={CELL_SIZE * 0.7} 
        height={CELL_SIZE * 0.1} 
        fill="#333333"
        rx={2}
        ry={2}
      />
      <rect 
        x={-CELL_SIZE * 0.35} 
        y={CELL_SIZE * 0.15} 
        width={CELL_SIZE * 0.7 * (unit.hp / unit.maxHp)} 
        height={CELL_SIZE * 0.1} 
        fill={healthColor}
        rx={2}
        ry={2}
      />
    </g>
  );
};

// Render node
export const renderNode = (node, nodeType, playerId, animations, CELL_SIZE, handleCellClick) => {
  const { x, y } = gridToSvg(node.position.x, node.position.y);
  const animation = animations[`attack-${playerId}-${nodeType}`] || animations[`hack-${playerId}-${nodeType}`];
  
  // Different shapes for different node types
  let nodeShape;
  if (nodeType === 'core') {
    // Core node - hexagon
    nodeShape = (
      <polygon 
        points={`0,${-CELL_SIZE * 0.4} ${CELL_SIZE * 0.35},${-CELL_SIZE * 0.2} ${CELL_SIZE * 0.35},${CELL_SIZE * 0.2} 0,${CELL_SIZE * 0.4} ${-CELL_SIZE * 0.35},${CELL_SIZE * 0.2} ${-CELL_SIZE * 0.35},${-CELL_SIZE * 0.2}`}
        fill={playerId === 'p1' ? "#0033CC" : "#CC0000"}
        stroke="#000000"
        strokeWidth={1}
      />
    );
  } else if (nodeType === 'comms') {
    // Comms node - diamond
    nodeShape = (
      <polygon 
        points={`0,${-CELL_SIZE * 0.4} ${CELL_SIZE * 0.4},0 0,${CELL_SIZE * 0.4} ${-CELL_SIZE * 0.4},0`}
        fill={playerId === 'p1' ? "#3366CC" : "#CC3333"}
        stroke="#000000"
        strokeWidth={1}
      />
    );
  } else if (nodeType === 'rd') {
    // R&D node - triangle
    nodeShape = (
      <polygon 
        points={`0,${-CELL_SIZE * 0.4} ${CELL_SIZE * 0.4},${CELL_SIZE * 0.3} ${-CELL_SIZE * 0.4},${CELL_SIZE * 0.3}`}
        fill={playerId === 'p1' ? "#6699CC" : "#CC6666"}
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
      onClick={() => handleCellClick(node.position.x, node.position.y)}
      style={{ cursor: 'pointer' }}
      className={animation ? (animation.effect === 'hack' ? 'hack-animation' : 'attack-animation') : ''}
    >
      {nodeShape}
      {/* Health bar */}
      <rect 
        x={-CELL_SIZE * 0.4} 
        y={CELL_SIZE * 0.25} 
        width={CELL_SIZE * 0.8} 
        height={CELL_SIZE * 0.1} 
        fill="#333333"
        rx={2}
        ry={2}
      />
      <rect 
        x={-CELL_SIZE * 0.4} 
        y={CELL_SIZE * 0.25} 
        width={CELL_SIZE * 0.8 * (node.hp / node.maxHp)} 
        height={CELL_SIZE * 0.1} 
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
        fontSize={CELL_SIZE * 0.25}
      >
        {nodeType === 'core' ? 'C' : nodeType === 'comms' ? 'CO' : 'R&D'}
      </text>
    </g>
  );
};

// Helper function to render a grid coordinate label
export const renderCoordinateLabel = (x, y, label, CELL_SIZE) => {
  const { x: svgX, y: svgY } = gridToSvg(x, y);
  return (
    <text
      key={`label-${x}-${y}`}
      x={svgX}
      y={svgY}
      fontSize={CELL_SIZE * 0.3}
      textAnchor="middle"
      fill="#333"
    >
      {label}
    </text>
  );
};

// Helper function for gridToSvg used in renderers
const gridToSvg = (x, y) => {
  const GRID_SIZE = 8;
  const CELL_SIZE = 50;
  const svgX = (GRID_SIZE / 2 * CELL_SIZE) + (x * CELL_SIZE);
  const svgY = (GRID_SIZE / 2 * CELL_SIZE) + (y * CELL_SIZE);
  return { x: svgX, y: svgY };
};

export default {
  renderBoard,
  renderInfantry,
  renderLongRange,
  renderNode,
  renderCoordinateLabel
};