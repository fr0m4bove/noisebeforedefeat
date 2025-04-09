// LightningBolt.jsx
import React, { useEffect, useRef } from 'react';

const LightningBolt = ({ start, end, color1, color2, onComplete }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");

    // Ensure canvas covers the viewport
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const clearCanvas = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);
    };

    // Simple lightning bolt function adapted from the Java snippet
    const strike = (x1, y1, x2, y2, primary, secondary, drawOrbs) => {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const segments = 10;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const segmentLength = distance / segments;
      let prevX = x1;
      let prevY = y1;

      if (drawOrbs) {
        context.strokeStyle = primary;
        context.fillStyle = primary;
        context.lineWidth = 2;
        context.beginPath();
        context.arc(x1, y1, 8 + Math.random() * 4, 0, 2 * Math.PI);
        context.fill();
      }

      for (let i = 0; i <= segments; i++) {
        let t = i / segments;
        let x = x1 + dx * t;
        let y = y1 + dy * t;
        if (i !== 0 && i !== segments) {
          x += (Math.random() * segmentLength) - segmentLength / 2;
          y += (Math.random() * segmentLength) - segmentLength / 2;
        }
        // Draw thicker line in primary color
        context.strokeStyle = primary;
        context.lineWidth = 8;
        context.beginPath();
        context.moveTo(prevX, prevY);
        context.lineTo(x, y);
        context.stroke();

        // Draw thinner line in secondary color on top
        context.strokeStyle = secondary;
        context.lineWidth = 4;
        context.beginPath();
        context.moveTo(prevX, prevY);
        context.lineTo(x, y);
        context.stroke();

        prevX = x;
        prevY = y;
      }

      if (drawOrbs) {
        context.strokeStyle = secondary;
        context.fillStyle = secondary;
        context.lineWidth = 2;
        context.beginPath();
        context.arc(x2, y2, 8 + Math.random() * 4, 0, 2 * Math.PI);
        context.fill();
      }
    };

    let frame = 0;
    const animationInterval = setInterval(() => {
      clearCanvas();
      if (frame < 5) { // Show the bolt for a few frames
        strike(start.x, start.y, end.x, end.y, color1, color2, true);
      } else {
        clearCanvas();
        clearInterval(animationInterval);
        if (onComplete) onComplete();
      }
      frame++;
    }, 50);

    return () => clearInterval(animationInterval);
  }, [start, end, color1, color2, onComplete]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex: 9999
      }}
    />
  );
};

export default LightningBolt;

