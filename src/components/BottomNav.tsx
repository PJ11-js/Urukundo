import React from 'react';
import { AppScreen } from '../types';

interface Props {
  currentScreen: AppScreen;
  onNavigate: (screen: AppScreen) => void;
}

const BottomNav: React.FC<Props> = ({ currentScreen, onNavigate }) => {
  return (
    <nav className="flex justify-around items-center py-4 bg-white border-t border-gray-100 z-10 shadow-[0_-5px_15px_rgba(0,0,0,0.02)]">
      <button
        onClick={() => onNavigate(AppScreen.DISCOVERY)}
        className={`text-2xl transition-all ${currentScreen === AppScreen.DISCOVERY ? 'text-red-500 scale-110' : 'text-gray-300 hover:text-gray-400'}`}
      >
        <i className="fa-solid fa-fire"></i>
      </button>
      <button
        onClick={() => onNavigate(AppScreen.MESSAGES)}
        className={`text-2xl transition-all ${currentScreen === AppScreen.MESSAGES ? 'text-red-500 scale-110' : 'text-gray-300 hover:text-gray-400'}`}
      >
        <i className="fa-solid fa-message"></i>
      </button>
      <button
        onClick={() => onNavigate(AppScreen.PROFILE)}
        className={`text-2xl transition-all ${currentScreen === AppScreen.PROFILE ? 'text-red-500 scale-110' : 'text-gray-300 hover:text-gray-400'}`}
      >
        <i className="fa-solid fa-user"></i>
      </button>
    </nav>
  );
};

export default BottomNav;
