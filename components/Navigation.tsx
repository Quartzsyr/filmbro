import React from 'react';
import { View } from '../types';

interface NavigationProps {
  currentView: View;
  onChangeView: (view: View) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentView, onChangeView }) => {
  const navItemClass = (isActive: boolean) => 
    `flex flex-col items-center gap-1 group transition-colors ${isActive ? 'text-primary' : 'text-muted hover:text-white'}`;

  const iconClass = (filled: boolean) => 
    `material-symbols-outlined text-[26px] ${filled ? 'font-variation-settings-"FILL"1' : 'font-light'}`;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#0f0f0f]/90 backdrop-blur-xl border-t border-white/5 px-6 py-4 pb-6 flex justify-between items-end z-50">
      
      {/* Home / Dashboard */}
      <button 
        onClick={() => onChangeView(View.DASHBOARD)}
        className={navItemClass(currentView === View.DASHBOARD)}
      >
        <span className={iconClass(currentView === View.DASHBOARD)}>home_app_logo</span>
        <span className="text-[10px] font-bold uppercase tracking-wider">暗房</span>
      </button>

      {/* Library */}
      <button 
        onClick={() => onChangeView(View.LIBRARY)}
        className={navItemClass(currentView === View.LIBRARY || currentView === View.ROLL_DETAIL)}
      >
        <span className={iconClass(currentView === View.LIBRARY)}>grid_view</span>
        <span className="text-[10px] font-bold uppercase tracking-wider">图库</span>
      </button>

      {/* Spacer for FAB */}
      <div className="w-12"></div>

      {/* Scanner (FAB) */}
      <button 
        onClick={() => onChangeView(View.SCANNER)}
        className="absolute -top-6 left-1/2 -translate-x-1/2 size-16 rounded-full bg-primary text-white shadow-[0_4px_20px_rgba(166,23,39,0.5)] flex items-center justify-center border-[6px] border-background-dark hover:scale-105 active:scale-95 transition-transform group"
      >
        <span className="material-symbols-outlined text-[32px] group-hover:rotate-90 transition-transform duration-300">shutter_speed</span>
      </button>

      {/* Data / Stats */}
      <button 
        onClick={() => onChangeView(View.STATS)}
        className={navItemClass(currentView === View.STATS)}
      >
        <span className={iconClass(currentView === View.STATS)}>analytics</span>
        <span className="text-[10px] font-bold uppercase tracking-wider">数据</span>
      </button>

      {/* Profile */}
      <button 
        onClick={() => onChangeView(View.PROFILE)}
        className={navItemClass(currentView === View.PROFILE)}
      >
        <span className={iconClass(currentView === View.PROFILE)}>person</span>
        <span className="text-[10px] font-bold uppercase tracking-wider">我的</span>
      </button>

    </nav>
  );
};