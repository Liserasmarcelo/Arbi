'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Wallet, Shield, AlertTriangle } from 'lucide-react';
import { useTelegram } from '@/hooks/useTelegram';

export function WalletConnect() {
  const { hapticImpact } = useTelegram();

  return (
    <div className="min-h-screen bg-telegram-bg flex flex-col p-4 safe-top safe-bottom">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8 pt-8"
      >
        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
          <Wallet className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-telegram-text mb-2">
          Conecta tu Wallet
        </h1>
        <p className="text-telegram-hint">
          Para usar PolyArbitrage necesitas conectar una wallet compatible con Polygon
        </p>
      </motion.div>

      {/* Connect Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-6"
      >
        <ConnectButton.Custom>
          {({
            account,
            chain,
            openAccountModal,
            openChainModal,
            openConnectModal,
            mounted,
          }) => {
            const ready = mounted;
            const connected = ready && account && chain;

            return (
              <div
                {...(!ready && {
                  'aria-hidden': true,
                  style: {
                    opacity: 0,
                    pointerEvents: 'none',
                    userSelect: 'none',
                  },
                })}
              >
                {(() => {
                  if (!connected) {
                    return (
                      <Button
                        onClick={() => {
                          hapticImpact('medium');
                          openConnectModal();
                        }}
                        className="w-full"
                        size="lg"
                        leftIcon={<Wallet className="w-5 h-5" />}
                      >
                        Conectar Wallet
                      </Button>
                    );
                  }

                  if (chain.unsupported) {
                    return (
                      <Button
                        onClick={openChainModal}
                        variant="danger"
                        className="w-full"
                        size="lg"
                      >
                        Red no soportada - Cambiar
                      </Button>
                    );
                  }

                  return (
                    <Button
                      onClick={openAccountModal}
                      className="w-full"
                      size="lg"
                    >
                      {account.displayName}
                    </Button>
                  );
                })()}
              </div>
            );
          }}
        </ConnectButton.Custom>
      </motion.div>

      {/* Security info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-3"
      >
        <Card className="flex items-start space-x-3">
          <Shield className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-medium text-telegram-text">Seguridad primero</h3>
            <p className="text-sm text-telegram-hint">
              Nunca almacenamos tu clave privada ni tu frase semilla
            </p>
          </div>
        </Card>

        <Card className="flex items-start space-x-3">
          <Wallet className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-medium text-telegram-text">Tu control total</h3>
            <p className="text-sm text-telegram-hint">
              Todas las transacciones requieren tu firma manual
            </p>
          </div>
        </Card>
      </motion.div>

      {/* Disclaimer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-auto pt-6"
      >
        <Card className="bg-yellow-500/10 border-yellow-500/30">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-yellow-400 text-sm">Disclaimer</h3>
              <p className="text-xs text-telegram-hint mt-1">
                El trading de arbitraje conlleva riesgos. Solo invierte lo que puedas permitirte perder.
                Este servicio no está disponible en jurisdicciones restringidas.
              </p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Supported wallets */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-center mt-4"
      >
        <p className="text-xs text-telegram-hint">
          Wallets soportadas: MetaMask, WalletConnect, Coinbase Wallet
        </p>
      </motion.div>
    </div>
  );
}
