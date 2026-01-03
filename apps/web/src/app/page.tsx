'use client';

import { useEffect, useState } from 'react';
import { useTelegram } from '@/hooks/useTelegram';
import { useWallet } from '@/hooks/useWallet';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { WalletConnect } from '@/components/wallet/WalletConnect';
import { OnboardingScreen } from '@/components/onboarding/OnboardingScreen';
import { LoadingScreen } from '@/components/ui/LoadingScreen';

export default function Home() {
  const { isReady, user, webApp } = useTelegram();
  const { isConnected, address } = useWallet();
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Verificar si el usuario ya completó onboarding
    const hasCompletedOnboarding = localStorage.getItem('onboarding_completed');
    if (hasCompletedOnboarding) {
      setShowOnboarding(false);
    }
    
    // Simular carga inicial
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Configurar Telegram WebApp
    if (webApp) {
      webApp.ready();
      webApp.expand();
      webApp.enableClosingConfirmation();
    }
  }, [webApp]);

  const handleOnboardingComplete = () => {
    localStorage.setItem('onboarding_completed', 'true');
    setShowOnboarding(false);
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (showOnboarding) {
    return <OnboardingScreen onComplete={handleOnboardingComplete} />;
  }

  if (!isConnected) {
    return <WalletConnect />;
  }

  return <Dashboard />;
}
