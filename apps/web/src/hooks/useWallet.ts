'use client';

import { useAccount, useBalance, useChainId, useSwitchChain } from 'wagmi';
import { polygon, polygonAmoy } from 'wagmi/chains';
import { formatUnits } from 'viem';
import { SUPPORTED_TOKENS } from '@/lib/wagmi';

export function useWallet() {
  const { address, isConnected, isConnecting, isDisconnected, connector } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  // Balance de MATIC
  const { data: maticBalance, isLoading: isLoadingMatic } = useBalance({
    address,
  });

  // Balance de USDC
  const usdcAddress = chainId === polygon.id 
    ? SUPPORTED_TOKENS.USDC[polygon.id] 
    : SUPPORTED_TOKENS.USDC[polygonAmoy.id];

  const { data: usdcBalance, isLoading: isLoadingUsdc } = useBalance({
    address,
    token: usdcAddress as `0x${string}`,
  });

  // Verificar si está en la red correcta
  const isCorrectNetwork = chainId === polygon.id || chainId === polygonAmoy.id;

  // Cambiar a Polygon
  const switchToPolygon = async () => {
    try {
      await switchChain({ chainId: polygon.id });
      return true;
    } catch (error) {
      console.error('Error switching to Polygon:', error);
      return false;
    }
  };

  // Formatear balances
  const formattedMaticBalance = maticBalance 
    ? parseFloat(formatUnits(maticBalance.value, 18)).toFixed(4)
    : '0.0000';

  const formattedUsdcBalance = usdcBalance
    ? parseFloat(formatUnits(usdcBalance.value, 6)).toFixed(2)
    : '0.00';

  return {
    address,
    isConnected,
    isConnecting,
    isDisconnected,
    connector,
    chainId,
    isCorrectNetwork,
    switchToPolygon,
    balances: {
      matic: {
        raw: maticBalance?.value || BigInt(0),
        formatted: formattedMaticBalance,
        isLoading: isLoadingMatic,
      },
      usdc: {
        raw: usdcBalance?.value || BigInt(0),
        formatted: formattedUsdcBalance,
        isLoading: isLoadingUsdc,
      },
    },
    networkName: chainId === polygon.id ? 'Polygon' : chainId === polygonAmoy.id ? 'Polygon Amoy' : 'Unknown',
  };
}
