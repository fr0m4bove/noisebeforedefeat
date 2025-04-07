import React, { useEffect, useState } from "react";
import "./Home.css";

const Home = () => {
  const quotes = [
    "In the moment I truly understand my enemy, I also love him -Ender Wiggin",
    "The greatest victory is that which requires no battle.",
    "Never interrupt your enemy when he's making a mistake.",
    "Chaos is order yet undeciphered -Jose Saramago",
    "Its not truth that matters, but victory -Adolf Hitler",
    "The mind is the first battlefield -Anonymous",
    "War is the unfolding of miscalculations -Barbara Tuchman"
  ];

  const [quoteIndex, setQuoteIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    let timeoutId;

    const cycle = () => {
      // First fade out
      setFade(false);
      
      // Wait 1 second for fade-out to complete
      timeoutId = setTimeout(() => {
        // Change quote
        setQuoteIndex((prevIndex) => (prevIndex + 1) % quotes.length);
        // Then fade in
        setFade(true);
        
        // Wait 4 seconds before starting the next cycle
        timeoutId = setTimeout(cycle, 4000);
      }, 1000); // This should match your CSS transition time
    };

    cycle();

    return () => clearTimeout(timeoutId);
  }, [quotes.length]);

  return (
    <div className="home-container">
      <h1 className="title">Noise Before Defeat</h1>
      <div className="quote-container">
        <p className={`quote ${fade ? 'fade-in' : 'fade-out'}`}>
          {quotes[quoteIndex]}
        </p>
      </div>
    </div>
  );
};

export default Home;
