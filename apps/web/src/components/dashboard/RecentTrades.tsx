'use client';

import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ChevronRight, ExternalLink, CheckCircle, XCircle, Clock } from 'lucide-react';
import type { TradeExecution } from '@polyarbitrage/types';

interface RecentTradesProps {
  showFull?: boolean;
}

// Datos de ejemplo
const mockTrades: TradeExecution[] = [
  {
    id: 'trade_001',
    marketId: 'market_123',
    side: 'BUY',
    outcome: 'YES',
    amount: 50,
    price: 0.42,
    executedPrice: 0.423,
    slippage: 0.007,
    status: 'CONFIRMED',
    txHash: '0x123...abc',
    gasUsed: 150000,
    timestamp: Date.now() - 3600000,
  },
  {
    id: 'trade_002',
    marketId: 'market_123',
    side: 'BUY',
    outcome: 'NO',
    amount: 50,
    price: 0.55,
    executedPrice: 0.552,
    slippage: 0.004,
    status: 'CONFIRMED',
    txHash: '0x456...def',
    gasUsed: 145000,
    timestamp: Date.now() - 3600000,
  },
  {
    id: 'trade_003',
    marketId: 'market_789',
    side: 'BUY',
    outcome: 'YES',
    amount: 25,
    price: 0.65,
    executedPrice: 0.65,
    slippage: 0,
    status: 'FAILED',
    error: 'Insufficient liquidity',
    timestamp: Date.now() - 7200000,
  },
];

export function RecentTrades({ showFull = false }: RecentTradesProps) {
  const displayedTrades = showFull ? mockTrades : mockTrades.slice(0, 3);

  const getStatusIcon = (status: TradeExecution['status']) => {
    switch (status) {
      case 'CONFIRMED':
        return <CheckCircle className="w-4 h-4 text-profit" />;
      case 'FAILED':
        return <XCircle className="w-4 h-4 text-loss" />;
      case 'PENDING':
      case 'SUBMITTED':
        return <Clock className="w-4 h-4 text-yellow-400 animate-pulse" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: TradeExecution['status']) => {
    const variants: Record<TradeExecution['status'], 'success' | 'error' | 'warning' | 'info'> = {
      CONFIRMED: 'success',
      FAILED: 'error',
      PENDING: 'warning',
      SUBMITTED: 'info',
      CANCELLED: 'neutral' as any,
    };
    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    
    if (hours > 0) return `Hace ${hours}h`;
    if (minutes > 0) return `Hace ${minutes}m`;
    return 'Ahora';
  };

  return (
    <Card animated>
      <CardHeader
        title="Trades Recientes"
        subtitle="Últimas operaciones ejecutadas"
        action={
          !showFull && mockTrades.length > 3 && (
            <Button variant="ghost" size="sm">
              Ver todos
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )
        }
      />
      <CardContent>
        {displayedTrades.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-telegram-hint">No hay trades recientes</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedTrades.map((trade) => (
              <div
                key={trade.id}
                className="flex items-center justify-between bg-telegram-bg rounded-lg p-3"
              >
                <div className="flex items-center space-x-3">
                  {getStatusIcon(trade.status)}
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm font-medium ${
                        trade.side === 'BUY' ? 'text-profit' : 'text-loss'
                      }`}>
                        {trade.side}
                      </span>
                      <span className="text-sm text-telegram-text">
                        {trade.outcome}
                      </span>
                      <span className="text-telegram-hint text-xs">
                        @ {trade.executedPrice.toFixed(4)}
                      </span>
                    </div>
                    <p className="text-xs text-telegram-hint">
                      ${trade.amount.toFixed(2)} • {formatTime(trade.timestamp)}
                    </p>
                    {trade.error && (
                      <p className="text-xs text-loss">{trade.error}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {getStatusBadge(trade.status)}
                  {trade.txHash && (
                    <a
                      href={`https://polygonscan.com/tx/${trade.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 hover:bg-telegram-secondary rounded-lg transition-colors"
                    >
                      <ExternalLink className="w-4 h-4 text-telegram-hint" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
