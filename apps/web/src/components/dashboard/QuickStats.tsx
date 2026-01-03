'use client';

import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { TrendingUp, TrendingDown, Activity, Zap } from 'lucide-react';
import { clsx } from 'clsx';

// Datos de ejemplo - en producción vendrían del backend
const mockStats = {
  todayPnL: 12.45,
  todayTrades: 8,
  winRate: 75,
  activeOpportunities: 3,
};

export function QuickStats() {
  const stats = [
    {
      label: 'P&L Hoy',
      value: `$${mockStats.todayPnL.toFixed(2)}`,
      icon: mockStats.todayPnL >= 0 ? TrendingUp : TrendingDown,
      color: mockStats.todayPnL >= 0 ? 'text-profit' : 'text-loss',
      bgColor: mockStats.todayPnL >= 0 ? 'bg-profit/10' : 'bg-loss/10',
    },
    {
      label: 'Trades',
      value: mockStats.todayTrades.toString(),
      icon: Activity,
      color: 'text-blue-400',
      bgColor: 'bg-blue-400/10',
    },
    {
      label: 'Win Rate',
      value: `${mockStats.winRate}%`,
      icon: Zap,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-400/10',
    },
  ];

  return (
    <Card animated>
      <CardHeader title="Estadísticas Rápidas" subtitle="Resumen del día" />
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className={clsx('rounded-lg p-3 text-center', stat.bgColor)}
              >
                <Icon className={clsx('w-5 h-5 mx-auto mb-1', stat.color)} />
                <p className={clsx('text-lg font-bold', stat.color)}>{stat.value}</p>
                <p className="text-xs text-telegram-hint">{stat.label}</p>
              </div>
            );
          })}
        </div>

        {/* Active opportunities indicator */}
        {mockStats.activeOpportunities > 0 && (
          <div className="mt-3 flex items-center justify-center space-x-2 text-primary-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
            </span>
            <span className="text-sm">
              {mockStats.activeOpportunities} oportunidades activas
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
