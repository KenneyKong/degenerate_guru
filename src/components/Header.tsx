import React from 'react';

const Header = () => {
  return (
    <div className="bg-transparent py-4 px-8 w-full flex flex-col items-center">
      <div className="max-w-full mx-auto text-center" style={{ maxWidth: '550px' }}>
        <h1 className="text-4xl font-bold text-white mb-2">DEGENERATE GURU</h1>
        <p className="text-gray-300 text-lg">Your Expert Sports Betting Advisor</p>
        <p className="text-sm text-gray-400 mt-1">*For entertainment purposes only. Bet responsibly.</p>
      </div>
    </div>
  );
};

export default Header;
