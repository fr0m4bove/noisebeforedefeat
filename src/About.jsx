import React from 'react';
import './About.css';

function About() {
  return (
    <div className="about-container">
      <h1 className="title">About Noise Before Defeat</h1>
      
      <div className="about-content">
        <p className="about-text">
          Noise Before Defeat is a simultaneous turn strategy game that relies heavily on prediction, deception, and timing. 
          It's not about overwhelming power, it's about control, anticipation, and manipulation. Your success depends 
          on your ability to stay unreadable, coax your opponent into vulnerability, and attack only when the balance 
          tilts in your favor.
        </p>
        
        <div className="game-principles">
          <div className="principle">
            <h3>Prediction</h3>
            <p>Anticipate your opponent's moves and counter them before they happen.</p>
          </div>
          
          <div className="principle">
            <h3>Deception</h3>
            <p>Use misdirection and false moves to mask your true strategy.</p>
          </div>
          
          <div className="principle">
            <h3>Timing</h3>
            <p>Strike when your opponent is most vulnerable, not when you're most powerful.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default About;
