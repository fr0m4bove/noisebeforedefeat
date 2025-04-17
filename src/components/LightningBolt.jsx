// Updated LightningBolt component that will position correctly in the SVG
import React, { useEffect, useState } from 'react';

const LightningBolt = ({ start, end, color1 = "#FF0000", color2 = "#FFFF00", onComplete }) => {
  const [path, setPath] = useState('');
  const [opacity, setOpacity] = useState(1);
  
  // Generate a lightning bolt path between two points
  useEffect(() => {
    // Make sure we have valid start and end points
    if (!start || !end) return;
    
    // Generate jagged path for lightning
    const generateLightningPath = () => {
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // Number of segments (more segments for longer distances)
      const segments = Math.max(5, Math.floor(dist / 30));
      
      // Maximum jitter as a percentage of the distance
      const jitter = 0.2;
      
      let pathData = `M ${start.x} ${start.y}`;
      
      for (let i = 1; i < segments; i++) {
        const fraction = i / segments;
        const pointX = start.x + dx * fraction;
        const pointY = start.y + dy * fraction;
        
        // Add some randomness to the path
        const jitterAmount = jitter * (segments - i) / segments;
        const offsetX = (Math.random() * 2 - 1) * dist * jitterAmount;
        const offsetY = (Math.random() * 2 - 1) * dist * jitterAmount;
        
        pathData += ` L ${pointX + offsetX} ${pointY + offsetY}`;
      }
      
      // End at the target
      pathData += ` L ${end.x} ${end.y}`;
      
      return pathData;
    };
    
    // Generate the lightning path
    setPath(generateLightningPath());
    
    // Set up animation effect
    const duration = 1000; // ms
    const fadeTime = 300; // ms
    let startTime = null;
    
    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      
      if (elapsed < duration) {
        // During the main animation, flicker the lightning
        const flickerOpacity = Math.random() * 0.5 + 0.5;
        setOpacity(flickerOpacity);
        
        requestAnimationFrame(animate);
      } else if (elapsed < duration + fadeTime) {
        // During the fade-out period
        const fadeProgress = (elapsed - duration) / fadeTime;
        setOpacity(1 - fadeProgress);
        
        requestAnimationFrame(animate);
      } else {
        // Animation complete
        setOpacity(0);
        if (onComplete) setTimeout(onComplete, 100);
      }
    };
    
    requestAnimationFrame(animate);
  }, [start, end, onComplete]);
  
  // If no path, don't render
  if (!path) return null;
  
  return (
    <svg 
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1000
      }}
    >
      {/* First stroke - wider for glow effect */}
      <path
        d={path}
        stroke={color2}
        strokeWidth="6"
        fill="none"
        opacity={opacity * 0.5}
      />
      {/* Main stroke */}
      <path
        d={path}
        stroke={color1}
        strokeWidth="2"
        fill="none"
        opacity={opacity}
      />
    </svg>
  );
};

export default LightningBolt;
