'use client';

import { useWallet } from '@/hooks/useWallet';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useDisconnect } from 'wagmi';
import { Copy, ExternalLink, LogOut } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTelegram } from '@/hooks/useTelegram';

export function WalletCard() {
  const { address, balances, isCorrectNetwork, switchToPolygon, networkName } = useWallet();
  const { disconnect } = useDisconnect();
  const { hapticNotification } = useTelegram();

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      hapticNotification('success');
      toast.success('Dirección copiada');
    }
  };

  const openExplorer = () => {
    if (address) {
      window.open(`https://polygonscan.com/address/${address}`, '_blank');
    }
  };

  const handleDisconnect = () => {
    disconnect();
    toast.success('Wallet desconectada');
  };

  return (
    <Card animated>
      <CardHeader
        title="Mi Wallet"
        subtitle={networkName}
        action={
          <Badge variant={isCorrectNetwork ? 'success' : 'warning'}>
            {isCorrectNetwork ? 'Conectada' : 'Red incorrecta'}
          </Badge>
        }
      />
      
      <CardContent>
        {/* Address */}
        <div className="flex items-center justify-between mb-4">
          <span className="font-mono text-sm text-telegram-hint">
            {address?.slice(0, 10)}...{address?.slice(-8)}
          </span>
          <div className="flex space-x-2">
            <button
              onClick={copyAddress}
              className="p-1.5 hover:bg-telegram-secondary rounded-lg transition-colors"
            >
              <Copy className="w-4 h-4 text-telegram-hint" />
            </button>
            <button
              onClick={openExplorer}
              className="p-1.5 hover:bg-telegram-secondary rounded-lg transition-colors"
            >
              <ExternalLink className="w-4 h-4 text-telegram-hint" />
            </button>
          </div>
        </div>

        {/* Balances */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-telegram-bg rounded-lg p-3">
            <p className="text-xs text-telegram-hint mb-1">USDC</p>
            <p className="text-lg font-bold text-telegram-text">
              ${balances.usdc.isLoading ? '...' : balances.usdc.formatted}
            </p>
          </div>
          <div className="bg-telegram-bg rounded-lg p-3">
            <p className="text-xs text-telegram-hint mb-1">MATIC</p>
            <p className="text-lg font-bold text-telegram-text">
              {balances.matic.isLoading ? '...' : balances.matic.formatted}
            </p>
          </div>
        </div>

        {/* Actions */}
        {!isCorrectNetwork && (
          <Button
            onClick={switchToPolygon}
            variant="secondary"
            className="w-full mb-2"
          >
            Cambiar a Polygon
          </Button>
        )}
        
        <Button
          onClick={handleDisconnect}
          variant="ghost"
          size="sm"
          className="w-full text-telegram-hint"
          leftIcon={<LogOut className="w-4 h-4" />}
        >
          Desconectar Wallet
        </Button>
      </CardContent>
    </Card>
  );
}
