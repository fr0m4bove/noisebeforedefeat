import React from 'react';
import './NoiseBeforeDefeat.css';

const ActionPanel = ({ 
  activePlayer, 
  selectedAction, 
  onActionSelect, 
  onReadyClick, 
  disabled 
}) => {
  // Constants
  const HACK_COST = 40;
  
  // Actions and their requirements
  const actions = [
    { id: 'move', label: 'Move', requiredNode: null },
    { id: 'attack', label: 'Attack', requiredNode: 'rd' },
    { id: 'hack', label: 'Hack', requiredNode: 'rd', cost: HACK_COST },
    { id: 'defend', label: 'Defend', requiredNode: null },
    { id: 'spy', label: 'Spy', requiredNode: 'comms' }
  ];
  
  // Check if player has enough Intel Points for an action
  const hasEnoughIP = (action) => {
    if (!activePlayer) return false;
    if (action.cost && activePlayer.intelPoints < action.cost) {
      return false;
    }
    return true;
  };
  
  // Check if required node is alive and functional
  const hasRequiredNode = (action) => {
    if (!activePlayer || !action.requiredNode) return true;
    
    const node = activePlayer.nodes[action.requiredNode];
    return node && node.hp > 0;
  };
  
  // Check if an action is available
  const isActionAvailable = (action) => {
    return hasEnoughIP(action) && hasRequiredNode(action);
  };
  
  return (
    <div className="action-buttons-container">
      <div className="action-buttons">
        {actions.map(action => (
          <button
            key={action.id}
            className={`action-button ${selectedAction === action.id ? 'active' : ''}`}
            onClick={() => onActionSelect(action.id)}
            disabled={disabled || !isActionAvailable(action)}
          >
            {action.label}
            {action.cost && ` (${action.cost} IP)`}
          </button>
        ))}
      </div>
      
      <button
        className="ready-button"
        onClick={onReadyClick}
        disabled={disabled}
      >
        Ready
      </button>
    </div>
  );
};

export default ActionPanel;
