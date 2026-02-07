'use client';

import { useState, useEffect } from 'react';

export default function ScrollButtons() {
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      setShowScrollTop(scrollTop > 100);
      setShowScrollBottom(scrollTop + windowHeight < documentHeight - 100);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Check initial state

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToBottom = () => {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
  };

  return (
    <div className="fixed bottom-4 right-4 flex flex-col space-y-2 z-50">
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-full shadow-lg transition-colors"
          aria-label="Scroll to top"
        >
          ↑
        </button>
      )}
      {showScrollBottom && (
        <button
          onClick={scrollToBottom}
          className="bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-full shadow-lg transition-colors"
          aria-label="Scroll to bottom"
        >
          ↓
        </button>
      )}
    </div>
  );
}
