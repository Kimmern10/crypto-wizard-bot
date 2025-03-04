
import React, { useState, useEffect } from 'react';
import { TradingProvider } from '@/hooks/useTradingContext';
import Header from '@/components/Header';
import Dashboard from '@/components/Dashboard';
import StrategyPanel from '@/components/StrategyPanel';
import ApiKeyModal from '@/components/ApiKeyModal';
import TradeHistory from '@/components/TradeHistory';
import RiskManagement from '@/components/RiskManagement';

const Index = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Initialize theme from local storage or system preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Toggle theme function
  const toggleTheme = () => {
    setIsDarkMode(prevMode => {
      const newMode = !prevMode;
      
      if (newMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
      
      return newMode;
    });
  };

  return (
    <TradingProvider>
      <div className="min-h-screen bg-background transition-colors duration-300">
        <Header toggleTheme={toggleTheme} isDarkMode={isDarkMode} />
        
        <main className="container mx-auto py-6 px-4 md:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Dashboard />
              <TradeHistory />
            </div>
            
            <div className="space-y-6">
              <StrategyPanel />
              <RiskManagement />
            </div>
          </div>
        </main>
        
        <ApiKeyModal />
      </div>
    </TradingProvider>
  );
};

export default Index;
