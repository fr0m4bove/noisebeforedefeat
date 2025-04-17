import React, { useRef, useEffect } from 'react';
import './NoiseBeforeDefeat.css';

const GameLog = ({ gameLog }) => {
  // Ref for auto-scrolling
  const logEndRef = useRef(null);
  
  // Auto-scroll to bottom when log updates
  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [gameLog]);
  
  if (!gameLog || gameLog.length === 0) {
    return (
      <div className="chat-box">
        <div className="chat-header">
          <div className="tab-button active">Game Log</div>
        </div>
        <div className="chat-messages">
          <div className="empty-chat">
            Game log will appear here...
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="chat-box">
      <div className="chat-header">
        <div className="tab-button active">Game Log</div>
      </div>
      <div className="chat-messages">
        {gameLog.map((entry, index) => (
          <div key={index} className="log-entry">
            {entry}
          </div>
        ))}
        <div ref={logEndRef} />
      </div>
    </div>
  );
};

export default GameLog;
