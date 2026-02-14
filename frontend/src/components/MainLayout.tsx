import type { ReactNode } from 'react';
import { Header } from './Header';
import { StepIndicator } from './StepIndicator';
import { LoadingOverlay } from './LoadingOverlay';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <StepIndicator />
      <main className="flex-1 container mx-auto px-4 py-6">
        {children}
      </main>
      <footer className="border-t bg-white py-3">
        <div className="container mx-auto px-4 text-center text-sm text-gray-500">
          Infograph2Data — Hackathon Project
        </div>
      </footer>
      <LoadingOverlay />
    </div>
  );
}
