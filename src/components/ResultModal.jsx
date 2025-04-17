import React from 'react';
import './NoiseBeforeDefeat.css';

const ResultModal = ({ winner, loser, eloChange, onClose }) => {
  // Generate a performance grade (for demonstration purposes)
  const generateGrade = (isWinner) => {
    if (isWinner) {
      const grades = ['A', 'B', 'C'];
      return grades[Math.floor(Math.random() * grades.length)];
    } else {
      const grades = ['D', 'F'];
      return grades[Math.floor(Math.random() * grades.length)];
    }
  };
  
  const winnerGrade = generateGrade(true);
  const loserGrade = generateGrade(false);
  
  return (
    <div className="result-modal-backdrop">
      <div className="result-modal">
        <h2>Game Over</h2>
        <div className="result-content">
          <div className="winner">
            <h3>{winner} Wins!</h3>
            <div className={`rating-grade rating-${winnerGrade.toLowerCase()}`}>{winnerGrade}</div>
            <div className="elo-change positive">+{eloChange}</div>
            <div className="new-elo">New ELO: {500 + eloChange}</div>
          </div>
          <div className="loser">
            <h3>{loser}</h3>
            <div className={`rating-grade rating-${loserGrade.toLowerCase()}`}>{loserGrade}</div>
            <div className="elo-change negative">-{eloChange}</div>
            <div className="new-elo">New ELO: {Math.max(0, 500 - eloChange)}</div>
          </div>
        </div>
        <div className="result-actions">
          <button className="play-again-button" onClick={() => window.location.reload()}>Play Again</button>
          <button className="close-button" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default ResultModal;
