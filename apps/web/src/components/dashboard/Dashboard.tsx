'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useWallet } from '@/hooks/useWallet';
import { useTelegram } from '@/hooks/useTelegram';
import { WalletCard } from './WalletCard';
import { ArbitrageScanner } from './ArbitrageScanner';
import { QuickStats } from './QuickStats';
import { RecentTrades } from './RecentTrades';
import { Navigation } from './Navigation';
import { Settings, TrendingUp, History, Home } from 'lucide-react';

type Tab = 'home' | 'scanner' | 'history' | 'settings';

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const { address, balances, networkName } = useWallet();
  const { hapticImpact } = useTelegram();

  const handleTabChange = (tab: Tab) => {
    hapticImpact('light');
    setActiveTab(tab);
  };

  return (
    <div className="min-h-screen bg-telegram-bg pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-telegram-bg/95 backdrop-blur-sm border-b border-primary-600/10 safe-top">
        <div className="px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gradient">PolyArbitrage</h1>
            <p className="text-xs text-telegram-hint">{networkName}</p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-telegram-text font-mono">
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="px-4 py-4">
        {activeTab === 'home' && <HomeTab />}
        {activeTab === 'scanner' && <ArbitrageScanner />}
        {activeTab === 'history' && <RecentTrades showFull />}
        {activeTab === 'settings' && <SettingsTab />}
      </main>

      {/* Bottom Navigation */}
      <Navigation activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
}

function HomeTab() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      <WalletCard />
      <QuickStats />
      <ArbitrageScanner compact />
      <RecentTrades />
    </motion.div>
  );
}

function SettingsTab() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      <h2 className="text-xl font-bold text-telegram-text">Configuración</h2>
      {/* Settings content will be added */}
      <p className="text-telegram-hint">Próximamente: configuración de trading, notificaciones y más.</p>
    </motion.div>
  );
}
