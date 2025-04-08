// CombatHandlers.jsx
// Functions for handling attacks and combat

import { getDatabase, ref, update } from 'firebase/database';

// Handle an attack from one unit to another
export const handleAttack = (attackerPiece, targetPosition, gameState, setGameState, setAnimations, calculateDamage, isInAttackRange, isCenterSquare) => {
  const playerId = gameState.activePlayer;
  const opponentId = playerId === 'p1' ? 'p2' : 'p1';
  
  // Get the attacking unit
  let attacker = null;
  let attackerType = '';
  
  if (attackerPiece.type === 'infantry') {
    attacker = gameState.players[playerId].infantry.find(i => i.id === attackerPiece.id);
    attackerType = 'infantry';
  } else if (attackerPiece.type === 'longrange') {
    attacker = gameState.players[playerId].longRange;
    attackerType = 'longrange';
  }
  
  if (!attacker) return;
  
  // Find target (could be infantry, longrange, or node)
  let target = null;
  let targetType = '';
  let targetId = '';
  
  // Check if target is opponent's infantry
  const targetInfantry = gameState.players[opponentId].infantry.find(
    i => i.position.x === targetPosition.x && i.position.y === targetPosition.y
  );
  
  if (targetInfantry) {
    target = targetInfantry;
    targetType = 'infantry';
    targetId = targetInfantry.id;
  } else {
    // Check if target is opponent's long range
    const targetLR = gameState.players[opponentId].longRange;
    if (targetLR.position.x === targetPosition.x && targetLR.position.y === targetPosition.y) {
      target = targetLR;
      targetType = 'longrange';
      targetId = `${opponentId}-longrange`;
    } else {
      // Check if target is a node
      for (const nodeType in gameState.players[opponentId].nodes) {
        const node = gameState.players[opponentId].nodes[nodeType];
        if (node.position.x === targetPosition.x && node.position.y === targetPosition.y) {
          target = node;
          targetType = nodeType;
          targetId = `${opponentId}-${nodeType}`;
        }
      }
    }
  }
  
  if (!target) return;
  
  // Check if target is in range
  const inRange = isInAttackRange(
    attacker.position,
    targetPosition,
    attackerType
  );
  
  if (!inRange) {
    setGameState(prev => ({
      ...prev,
      gameLog: [
        ...prev.gameLog,
        `Attack failed: Target out of range`
      ]
    }));
    return;
  }
  
  // Cannot attack from center square
  if (isCenterSquare(attacker.position)) {
    setGameState(prev => ({
      ...prev,
      gameLog: [
        ...prev.gameLog,
        `Units on the center square cannot attack`
      ]
    }));
    return;
  }
  
  // Calculate damage
  const damage = calculateDamage(
    { 
      type: attackerType, 
      count: attackerType === 'infantry' ? attacker.count : attacker.count 
    },
    { 
      type: targetType 
    }
  );
  
  // Apply damage
  setGameState(prev => {
    let updatedState = { ...prev };
    
    // Animation effect for attacked unit
    setAnimations(anims => ({
      ...anims,
      [`attack-${targetId}`]: {
        effect: 'attack',
        duration: 500
      }
    }));
    
    // Apply damage based on target type
    if (targetType === 'infantry') {
      // Update infantry HP
      updatedState.players[opponentId].infantry = prev.players[opponentId].infantry.map(inf => {
        if (inf.id === target.id) {
          const newHp = Math.max(0, inf.hp - damage);
          // If HP is 0, remove the unit
          if (newHp === 0) {
            return null;
          }
          return {
            ...inf,
            hp: newHp
          };
        }
        return inf;
      }).filter(Boolean); // Remove null entries (destroyed units)
    } else if (targetType === 'longrange') {
      // Update long range HP
      const newHp = Math.max(0, target.hp - damage);
      updatedState.players[opponentId].longRange = {
        ...target,
        hp: newHp
      };
    } else {
      // Update node HP
      const newHp = Math.max(0, target.hp - damage);
      updatedState.players[opponentId].nodes = {
        ...prev.players[opponentId].nodes,
        [targetType]: {
          ...prev.players[opponentId].nodes[targetType],
          hp: newHp
        }
      };
      
      // Check if core is destroyed - game over
      if (targetType === 'core' && newHp === 0) {
        updatedState.phase = 'gameOver';
        updatedState.winner = playerId;
      }
    }
    
    // Add to game log
    updatedState.gameLog.push(
      `${updatedState.players[playerId].username} attacked ${updatedState.players[opponentId].username}'s ${targetType} for ${damage} damage`
    );
    
    // Increment move counter and reset selection
    updatedState.currentTurnMoves = prev.currentTurnMoves + 1;
    updatedState.selectedPiece = null;
    updatedState.attackSource = null;
    updatedState.validMoves = [];
    updatedState.selectedAction = null;
    
    // If this is a multiplayer game, update Firebase
    if (updatedState.gameId) {
      const db = getDatabase();
      const gameStateRef = ref(db, `games/${updatedState.gameId}/state`);
      update(gameStateRef, {
        ...updatedState,
        lastUpdateTime: new Date().getTime()
      });
    }
    
    return updatedState;
  });
};

// Handle a hack attack against an opponent's node
export const handleHack = (targetPosition, gameState, setGameState, setAnimations, HACK_COST) => {
  const playerId = gameState.activePlayer;
  const opponentId = playerId === 'p1' ? 'p2' : 'p1';
  
  // Check if player has enough IP
  if (gameState.players[playerId].intelPoints < HACK_COST) {
    setGameState(prev => ({
      ...prev,
      gameLog: [
        ...prev.gameLog,
        `Hack failed: Not enough Intel Points (${prev.players[playerId].intelPoints}/${HACK_COST})`
      ],
      selectedAction: null
    }));
    return;
  }
  
  // Find which node was targeted
  let targetNodeType = null;
  for (const nodeType in gameState.players[opponentId].nodes) {
    const node = gameState.players[opponentId].nodes[nodeType];
    if (node.position.x === targetPosition.x && node.position.y === targetPosition.y) {
      targetNodeType = nodeType;
      break;
    }
  }
  
  if (!targetNodeType) return;
  
  // Execute the hack
  setGameState(prev => {
    // Create a new state
    let newState = { ...prev };
    
    // Animation effect for hacked nodes
    setAnimations(anims => ({
      ...anims,
      [`hack-${opponentId}-${targetNodeType}`]: {
        effect: 'hack',
        duration: 1000
      }
    }));
    
    // Deduct IP cost
    newState.players[playerId].intelPoints -= HACK_COST;
    
    // Apply hack effects
    if (targetNodeType === 'comms') {
      // Comms node is completely disabled
      newState.players[opponentId].nodes.comms.hp = 0;
    } else {
      // Other nodes take damage
      const damage = 15;
      const node = newState.players[opponentId].nodes[targetNodeType];
      node.hp = Math.max(0, node.hp - damage);
      
      // Check for game over condition
      if (targetNodeType === 'core' && node.hp === 0) {
        newState.phase = 'gameOver';
        newState.winner = playerId;
      }
    }
    
    // Add to game log
    newState.gameLog.push(
      `${newState.players[playerId].username} hacked ${newState.players[opponentId].username}'s ${targetNodeType} node`
    );
    
    // Increment move counter and reset selection
    newState.currentTurnMoves = prev.currentTurnMoves + 1;
    newState.selectedAction = null;
    
    // If this is a multiplayer game, update Firebase
    if (newState.gameId) {
      const db = getDatabase();
      const gameStateRef = ref(db, `games/${newState.gameId}/state`);
      update(gameStateRef, {
        ...newState,
        lastUpdateTime: new Date().getTime()
      });
    }
    
    return newState;
  });
};

// Find units that can attack a target in a surround attack
export const findSurroundingAttackers = (targetPosition, targetType, gameState, isInAttackRange, isCenterSquare) => {
  const playerId = gameState.activePlayer;
  const attackers = [];
  
  // Check infantry
  for (const infantry of gameState.players[playerId].infantry) {
    // Cannot attack from center square
    if (isCenterSquare(infantry.position)) continue;
    
    // Check if in range
    if (isInAttackRange(infantry.position, targetPosition, 'infantry')) {
      attackers.push({
        type: 'infantry',
        id: infantry.id,
        position: infantry.position
      });
    }
  }
  
  // Check long range
  const longRange = gameState.players[playerId].longRange;
  if (!isCenterSquare(longRange.position) && 
      isInAttackRange(longRange.position, targetPosition, 'longrange')) {
    attackers.push({
      type: 'longrange',
      id: `${playerId}-longrange`,
      position: longRange.position
    });
  }
  
  return attackers;
};

// Handle multiple surrounding attacks
export const handleSurroundAttack = (gameState, setGameState, setAnimations, calculateDamage) => {
  if (!gameState.surroundAttackMode || 
      !gameState.surroundAttackTarget || 
      gameState.surroundAttackSources.length < 2) {
    return;
  }
  
  const playerId = gameState.activePlayer;
  const opponentId = playerId === 'p1' ? 'p2' : 'p1';
  
  setGameState(prev => {
    let newState = { ...prev };
    let totalDamage = 0;
    
    // Calculate total damage from all sources
    for (const source of prev.surroundAttackSources) {
      let attacker = null;
      if (source.type === 'infantry') {
        attacker = prev.players[playerId].infantry.find(inf => inf.id === source.id);
      } else if (source.type === 'longrange') {
        attacker = prev.players[playerId].longRange;
      }
      
      if (attacker) {
        // Calculate damage for this source
        const damage = calculateDamage(
          { 
            type: source.type, 
            count: source.type === 'infantry' ? attacker.count : attacker.count 
          },
          { 
            type: prev.surroundAttackTarget.type 
          }
        );
        
        totalDamage += damage;
      }
    }
    
    // Apply total damage to the target
    const targetPos = prev.surroundAttackTarget.position;
    let targetUnit = null;
    let targetType = '';
    
    // Find target unit
    if (prev.surroundAttackTarget.type === 'infantry') {
      targetUnit = prev.players[opponentId].infantry.find(
        inf => inf.position.x === targetPos.x && inf.position.y === targetPos.y
      );
      targetType = 'infantry';
    } else if (prev.surroundAttackTarget.type === 'longrange') {
      targetUnit = prev.players[opponentId].longRange;
      targetType = 'longrange';
    } else {
      // Node target
      for (const nodeType in prev.players[opponentId].nodes) {
        const node = prev.players[opponentId].nodes[nodeType];
        if (node.position.x === targetPos.x && node.position.y === targetPos.y) {
          targetUnit = node;
          targetType = nodeType;
          break;
        }
      }
    }
    
    if (!targetUnit) return prev;
    
    // Animation effect for attacked unit
    setAnimations(anims => ({
      ...anims,
      [`surround-attack-${opponentId}-${targetType}`]: {
        effect: 'surround-attack',
        duration: 1000
      }
    }));
    
    // Apply damage
    if (targetType === 'infantry') {
      // Update infantry HP
      newState.players[opponentId].infantry = prev.players[opponentId].infantry.map(inf => {
        if (inf.position.x === targetPos.x && inf.position.y === targetPos.y) {
          const newHp = Math.max(0, inf.hp - totalDamage);
          // If HP is 0, remove the unit
          if (newHp === 0) {
            return null;
          }
          return { ...inf, hp: newHp };
        }
        return inf;
      }).filter(Boolean); // Remove null entries (destroyed units)
    } else if (targetType === 'longrange') {
      // Update long range HP
      const newHp = Math.max(0, targetUnit.hp - totalDamage);
      newState.players[opponentId].longRange = {
        ...targetUnit,
        hp: newHp
      };
    } else {
      // Update node HP
      const newHp = Math.max(0, targetUnit.hp - totalDamage);
      newState.players[opponentId].nodes = {
        ...prev.players[opponentId].nodes,
        [targetType]: {
          ...prev.players[opponentId].nodes[targetType],
          hp: newHp
        }
      };
      
      // Check if core is destroyed - game over
      if (targetType === 'core' && newHp === 0) {
        newState.phase = 'gameOver';
        newState.winner = playerId;
      }
    }
    
    // Add to game log
    newState.gameLog.push(
      `${newState.players[playerId].username} performed a surrounding attack with ${prev.surroundAttackSources.length} units for ${totalDamage} damage`
    );
    
    // Increment move counter and reset selection
    newState.currentTurnMoves = prev.currentTurnMoves + 1;
    newState.selectedAction = null;
    newState.surroundAttackMode = false;
    newState.surroundAttackSources = [];
    newState.surroundAttackTarget = null;
    
    // If this is a multiplayer game, update Firebase
    if (newState.gameId) {
      const db = getDatabase();
      const gameStateRef = ref(db, `games/${newState.gameId}/state`);
      update(gameStateRef, {
        ...newState,
        lastUpdateTime: new Date().getTime()
      });
    }
    
    return newState;
  });
};

// Find valid attack targets
export const findAttackTargets = (position, attackerType, gameState, isValidPosition, isCellOccupied) => {
  const playerId = gameState.activePlayer;
  const opponentId = playerId === 'p1' ? 'p2' : 'p1';
  const targets = [];
  
  // Maximum attack range
  const maxRange = attackerType === 'infantry' ? 1 : 3;
  
  // Check all positions within range
  for (let dx = -maxRange; dx <= maxRange; dx++) {
    for (let dy = -maxRange; dy <= maxRange; dy++) {
      // Skip the source position
      if (dx === 0 && dy === 0) continue;
      
      // For infantry, only allow adjacent (including diagonals)
      if (attackerType === 'infantry' && Math.max(Math.abs(dx), Math.abs(dy)) > 1) continue;
      
      // For long range, limit to Manhattan distance
      if (attackerType === 'longrange' && Math.abs(dx) + Math.abs(dy) > maxRange) continue;
      
      const targetPos = { x: position.x + dx, y: position.y + dy };
      
      // Check if position is valid and contains opponent's unit
      if (isValidPosition(targetPos.x, targetPos.y)) {
        // Check for opponent's infantry
        const hasInfantry = gameState.players[opponentId].infantry.some(inf => 
          inf.position.x === targetPos.x && inf.position.y === targetPos.y);
          
        if (hasInfantry) {
          targets.push(targetPos);
          continue;
        }
        
        // Check for opponent's long range
        const longRange = gameState.players[opponentId].longRange;
        if (longRange.position.x === targetPos.x && longRange.position.y === targetPos.y) {
          targets.push(targetPos);
          continue;
        }
        
        // Check for opponent's nodes
        for (const nodeType in gameState.players[opponentId].nodes) {
          const node = gameState.players[opponentId].nodes[nodeType];
          if (node.position.x === targetPos.x && node.position.y === targetPos.y) {
            targets.push(targetPos);
            break;
          }
        }
      }
    }
  }
  
  return targets;
};

export default {
  handleAttack,
  handleHack,
  handleSurroundAttack,
  findSurroundingAttackers,
  findAttackTargets
};