
import React from 'react';
import { Button } from "@/components/ui/button";
import { useTradingContext } from '@/hooks/useTradingContext';
import { Settings, Moon, Sun, ChevronDown } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface HeaderProps {
  toggleTheme: () => void;
  isDarkMode: boolean;
}

const Header: React.FC<HeaderProps> = ({ toggleTheme, isDarkMode }) => {
  const { showApiKeyModal } = useTradingContext();

  return (
    <header className="w-full py-4 px-8 flex items-center justify-between border-b border-border/50 glass-panel animate-fade-in">
      <div className="flex items-center space-x-2">
        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-kraken-blue to-kraken-purple flex items-center justify-center">
          <span className="text-white font-semibold text-sm">K</span>
        </div>
        <h1 className="text-xl font-medium">Kraken Trading Bot</h1>
      </div>
      
      <div className="flex items-center space-x-3">
        <Button 
          variant="outline" 
          onClick={() => showApiKeyModal()} 
          className="text-sm font-medium"
        >
          API Keys
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={toggleTheme} className="flex items-center gap-2">
              {isDarkMode ? (
                <>
                  <Sun className="h-4 w-4" />
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="h-4 w-4" />
                  <span>Dark Mode</span>
                </>
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default Header;
