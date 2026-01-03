'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { RefreshCw, TrendingUp, AlertCircle, ChevronRight } from 'lucide-react';
import { useTelegram } from '@/hooks/useTelegram';
import type { ArbitrageOpportunity } from '@polyarbitrage/types';

interface ArbitrageScannerProps {
  compact?: boolean;
}

// Datos de ejemplo - en producción vendrían del backend via WebSocket
const mockOpportunities: ArbitrageOpportunity[] = [
  {
    id: 'arb_001',
    marketId: 'market_123',
    marketQuestion: '¿Ganará el candidato A las elecciones de 2024?',
    type: 'BUY_BOTH',
    yesPrice: 0.42,
    noPrice: 0.55,
    totalPrice: 0.97,
    profitPercentage: 3.09,
    profitAbsolute: 0.03,
    maxInvestment: 100,
    estimatedProfit: 3.09,
    timestamp: Date.now(),
    expiresAt: Date.now() + 30000,
    confidence: 'HIGH',
  },
  {
    id: 'arb_002',
    marketId: 'market_456',
    marketQuestion: '¿Subirá BTC a $100k antes de marzo?',
    type: 'BUY_BOTH',
    yesPrice: 0.38,
    noPrice: 0.60,
    totalPrice: 0.98,
    profitPercentage: 2.04,
    profitAbsolute: 0.02,
    maxInvestment: 100,
    estimatedProfit: 2.04,
    timestamp: Date.now(),
    expiresAt: Date.now() + 25000,
    confidence: 'MEDIUM',
  },
];

export function ArbitrageScanner({ compact = false }: ArbitrageScannerProps) {
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>(mockOpportunities);
  const [isScanning, setIsScanning] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const { hapticNotification, hapticImpact } = useTelegram();

  const handleRefresh = async () => {
    setIsScanning(true);
    hapticImpact('medium');
    
    // Simular escaneo
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setLastUpdate(new Date());
    setIsScanning(false);
    hapticNotification('success');
  };

  const displayedOpportunities = compact 
    ? opportunities.slice(0, 2) 
    : opportunities;

  return (
    <Card animated>
      <CardHeader
        title="Scanner de Arbitraje"
        subtitle={`Actualizado: ${lastUpdate.toLocaleTimeString()}`}
        action={
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            isLoading={isScanning}
          >
            <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
          </Button>
        }
      />
      <CardContent>
        {displayedOpportunities.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-telegram-hint mx-auto mb-3" />
            <p className="text-telegram-hint">
              No hay oportunidades de arbitraje en este momento
            </p>
            <p className="text-xs text-telegram-hint/60 mt-1">
              El scanner se actualiza automáticamente
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {displayedOpportunities.map((opp, index) => (
                <OpportunityCard
                  key={opp.id}
                  opportunity={opp}
                  index={index}
                />
              ))}
            </AnimatePresence>

            {compact && opportunities.length > 2 && (
              <Button variant="ghost" className="w-full" size="sm">
                Ver todas ({opportunities.length})
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface OpportunityCardProps {
  opportunity: ArbitrageOpportunity;
  index: number;
}

function OpportunityCard({ opportunity, index }: OpportunityCardProps) {
  const [timeLeft, setTimeLeft] = useState(0);
  const { hapticImpact } = useTelegram();

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = opportunity.expiresAt - Date.now();
      setTimeLeft(Math.max(0, remaining));
    }, 1000);

    return () => clearInterval(interval);
  }, [opportunity.expiresAt]);

  const confidenceVariant = {
    HIGH: 'success' as const,
    MEDIUM: 'warning' as const,
    LOW: 'error' as const,
  }[opportunity.confidence];

  const handleExecute = () => {
    hapticImpact('heavy');
    // Aquí iría la lógica de ejecución
    console.log('Ejecutando arbitraje:', opportunity.id);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.05 }}
      className="bg-telegram-bg rounded-lg p-3 border border-primary-600/20"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-telegram-text font-medium line-clamp-2">
            {opportunity.marketQuestion}
          </p>
        </div>
        <Badge variant={confidenceVariant} className="ml-2 flex-shrink-0">
          {opportunity.confidence}
        </Badge>
      </div>

      {/* Prices */}
      <div className="grid grid-cols-3 gap-2 mb-3 text-center">
        <div>
          <p className="text-xs text-telegram-hint">YES</p>
          <p className="text-sm font-mono text-telegram-text">
            {opportunity.yesPrice.toFixed(4)}
          </p>
        </div>
        <div>
          <p className="text-xs text-telegram-hint">NO</p>
          <p className="text-sm font-mono text-telegram-text">
            {opportunity.noPrice.toFixed(4)}
          </p>
        </div>
        <div>
          <p className="text-xs text-telegram-hint">Total</p>
          <p className="text-sm font-mono text-profit font-bold">
            {opportunity.totalPrice.toFixed(4)}
          </p>
        </div>
      </div>

      {/* Profit & Action */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-telegram-hint">Beneficio estimado</p>
          <p className="text-lg font-bold text-profit">
            +{opportunity.profitPercentage.toFixed(2)}%
          </p>
          <p className="text-xs text-telegram-hint">
            ≈ ${opportunity.estimatedProfit.toFixed(2)} por $100
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-telegram-hint mb-1">
            Expira en {Math.floor(timeLeft / 1000)}s
          </p>
          <Button
            size="sm"
            onClick={handleExecute}
            leftIcon={<TrendingUp className="w-4 h-4" />}
          >
            Ejecutar
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
