'use client';

import { Home, TrendingUp, History, Settings } from 'lucide-react';
import { clsx } from 'clsx';

type Tab = 'home' | 'scanner' | 'history' | 'settings';

interface NavigationProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const tabs = [
  { id: 'home' as Tab, label: 'Inicio', icon: Home },
  { id: 'scanner' as Tab, label: 'Scanner', icon: TrendingUp },
  { id: 'history' as Tab, label: 'Historial', icon: History },
  { id: 'settings' as Tab, label: 'Config', icon: Settings },
];

export function Navigation({ activeTab, onTabChange }: NavigationProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-telegram-secondary border-t border-primary-600/10 safe-bottom">
      <div className="flex items-center justify-around py-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={clsx(
                'flex flex-col items-center py-2 px-4 rounded-lg transition-colors',
                isActive
                  ? 'text-primary-500'
                  : 'text-telegram-hint hover:text-telegram-text'
              )}
            >
              <Icon className={clsx('w-6 h-6', isActive && 'scale-110 transition-transform')} />
              <span className="text-xs mt-1">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
