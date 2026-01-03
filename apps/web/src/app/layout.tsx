import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from '@/components/providers';
import { Toaster } from 'react-hot-toast';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'PolyArbitrage Bot',
  description: 'Arbitraje en Polymarket mediante Telegram con conexión directa de wallets',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#6366f1',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <head>
        <script src="https://telegram.org/js/telegram-web-app.js" />
      </head>
      <body className={`${inter.className} bg-telegram-bg text-telegram-text min-h-screen`}>
        <Providers>
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              className: 'bg-telegram-secondary text-telegram-text',
              duration: 3000,
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
