import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { polygon, polygonAmoy } from 'wagmi/chains';

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '';

export const wagmiConfig = getDefaultConfig({
  appName: 'PolyArbitrage Bot',
  projectId,
  chains: [polygon, polygonAmoy],
  ssr: true,
});

// Configuración de tokens soportados
export const SUPPORTED_TOKENS = {
  USDC: {
    [polygon.id]: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    [polygonAmoy.id]: '0x0FA8781a83E46826621b3BC094Ea2A0212e71B23',
  },
} as const;
