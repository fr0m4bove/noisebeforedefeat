import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NetworkSphere from './NetworkSphere';
import './Learn.css';

function Learn() {
  const [selectedPuzzle, setSelectedPuzzle] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  // Mock puzzles data
  const puzzles = [
    {
      id: 'p1',
      title: 'Defensive Basics',
      difficulty: 'Beginner',
      description: 'Learn how to effectively protect your nodes from incoming attacks.'
    },
    {
      id: 'p2',
      title: 'Strategic Deception',
      difficulty: 'Intermediate',
      description: 'Master the art of misdirection to lure your opponent into a false sense of security.'
    },
    {
      id: 'p3',
      title: 'Advanced Timing',
      difficulty: 'Advanced',
      description: 'Perfect the timing of your attacks and defenses for maximum effectiveness.'
    },
    {
      id: 'p4',
      title: 'Multi-Node Strategy',
      difficulty: 'Expert',
      description: 'Coordinate complex strategies involving multiple nodes simultaneously.'
    },
    {
      id: 'p5',
      title: 'Resource Management',
      difficulty: 'Intermediate',
      description: 'Optimize your Intel Points usage to gain a strategic advantage.'
    },
    {
      id: 'p6',
      title: 'Agent Deployment',
      difficulty: 'Beginner',
      description: 'Learn the fundamentals of agent placement and usage.'
    }
  ];
  
  // Group puzzles by difficulty
  const puzzlesByDifficulty = puzzles.reduce((groups, puzzle) => {
    if (!groups[puzzle.difficulty]) {
      groups[puzzle.difficulty] = [];
    }
    groups[puzzle.difficulty].push(puzzle);
    return groups;
  }, {});
  
  // Order of difficulty levels
  const difficultyOrder = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
  
  const startPuzzle = (puzzle) => {
    setSelectedPuzzle(puzzle);
    setLoading(true);
    
    // Simulate loading, then navigate to the puzzle
    setTimeout(() => {
      navigate(`/learn/${puzzle.id}`);
    }, 2000);
  };
  
  if (loading) {
    return (
      <div className="learn-loading">
        <NetworkSphere />
        <p>Loading puzzle: {selectedPuzzle.title}...</p>
      </div>
    );
  }
  
  return (
    <div className="learn-container">
      <div className="learn-header">
        <h1>Learn Noise Before Defeat</h1>
        <p>Master the game through tactical puzzles and guided scenarios</p>
      </div>
      
      <div className="learn-content">
        {difficultyOrder.map(difficulty => (
          puzzlesByDifficulty[difficulty] && (
            <div className="difficulty-section" key={difficulty}>
              <h2 className="difficulty-title">{difficulty}</h2>
              <div className="puzzles-grid">
                {puzzlesByDifficulty[difficulty].map(puzzle => (
                  <div 
                    className="puzzle-card" 
                    key={puzzle.id}
                    onClick={() => startPuzzle(puzzle)}
                  >
                    <div className={`difficulty-indicator ${difficulty.toLowerCase()}`}></div>
                    <h3>{puzzle.title}</h3>
                    <p>{puzzle.description}</p>
                    <button className="start-puzzle-btn">Start Puzzle</button>
                  </div>
                ))}
              </div>
            </div>
          )
        ))}
      </div>
    </div>
  );
}

export default Learn;
