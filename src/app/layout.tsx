import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { GameStateProvider } from '@/providers/GameStateProvider';

export const metadata: Metadata = {
  title: 'PokeQuest',
  description: 'Manage tasks, level up, and compete with your rivals!',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <GameStateProvider>
          {children}
          <Toaster />
        </GameStateProvider>
      </body>
    </html>
  );
}
