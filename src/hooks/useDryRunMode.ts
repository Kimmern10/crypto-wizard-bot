
import { useState } from 'react';
import { toast } from 'sonner';

export const useDryRunMode = () => {
  const [dryRunMode, setDryRunMode] = useState(false);

  const toggleDryRunMode = () => {
    setDryRunMode(prev => {
      const newMode = !prev;
      toast.info(newMode ? 'Switched to Dry Run mode' : 'Switched to Real Trading mode', {
        description: newMode 
          ? 'Orders will be simulated and no real trades will be executed' 
          : 'Orders will be executed on the exchange'
      });
      return newMode;
    });
  };

  return {
    dryRunMode,
    toggleDryRunMode
  };
};
