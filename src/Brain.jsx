import React from 'react';
import './Brain.css';

const Brain = () => {
  return (
    <div className="brain-maze">
      <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <path 
          d="M100 10 C130 10, 150 30, 150 50 C150 70, 140 80, 130 85 C120 90, 120 100, 130 110 C140 120, 150 130, 150 150 C150 170, 130 190, 100 190 C70 190, 50 170, 50 150 C50 130, 60 120, 70 110 C80 100, 80 90, 70 85 C60 80, 50 70, 50 50 C50 30, 70 10, 100 10"
          fill="none"
          stroke="#E9D8A1"
          strokeWidth="2"
        />
        {/* Internal maze paths */}
        <path 
          d="M80 30 C90 40, 110 40, 120 30"
          fill="none"
          stroke="#E9D8A1"
          strokeWidth="1.5"
        />
        <path 
          d="M70 50 C80 60, 120 60, 130 50"
          fill="none"
          stroke="#E9D8A1"
          strokeWidth="1.5"
        />
        <path 
          d="M60 70 C70 80, 130 80, 140 70"
          fill="none"
          stroke="#E9D8A1"
          strokeWidth="1.5"
        />
        <path 
          d="M70 100 C80 110, 120 110, 130 100"
          fill="none"
          stroke="#E9D8A1"
          strokeWidth="1.5"
        />
        <path 
          d="M60 130 C70 140, 130 140, 140 130"
          fill="none"
          stroke="#E9D8A1"
          strokeWidth="1.5"
        />
        <path 
          d="M70 150 C80 160, 120 160, 130 150"
          fill="none"
          stroke="#E9D8A1"
          strokeWidth="1.5"
        />
        <path 
          d="M80 170 C90 180, 110 180, 120 170"
          fill="none"
          stroke="#E9D8A1"
          strokeWidth="1.5"
        />
        {/* Vertical connectors */}
        <path 
          d="M80 30 L80 170"
          fill="none"
          stroke="#E9D8A1"
          strokeWidth="1.5"
          strokeDasharray="5,5"
        />
        <path 
          d="M120 30 L120 170"
          fill="none"
          stroke="#E9D8A1"
          strokeWidth="1.5"
          strokeDasharray="5,5"
        />
        <path 
          d="M100 10 L100 190"
          fill="none"
          stroke="#E9D8A1"
          strokeWidth="1.5"
          strokeDasharray="5,5"
        />
      </svg>
    </div>
  );
};

export default Brain;
