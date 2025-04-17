import React from 'react';
import './NoiseBeforeDefeat.css';

const InfoPanel = ({ players, activePlayerId }) => {
  if (!players || players.length < 2) {
    return <div className="player-info">Loading player data...</div>;
  }
  
  // Render player info section
  const renderPlayerInfo = (player, playerId) => {
    const isActivePlayer = activePlayerId === playerId;
    
    return (
      <div className={`player ${playerId === 0 ? 'p1' : 'p2'} ${isActivePlayer ? 'active' : ''}`}>
        <h3>{player.name} {isActivePlayer && '(Active)'}</h3>
        <div className="player-stats">
          <div>Intel Points: {player.intelPoints}</div>
          <div>ELO: {player.elo || 500}</div>
        </div>
        <div className="node-status">
          {player.nodes && Object.entries(player.nodes).map(([nodeType, node]) => (
            <div key={nodeType} className="node-health">
              {nodeType.toUpperCase()}: {Math.max(0, node.hp)}/{node.maxHp}
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  return (
    <div className="player-info">
      {renderPlayerInfo(players[0], 0)}
      {renderPlayerInfo(players[1], 1)}
    </div>
  );
};

export default InfoPanel;
