
import { toast } from 'sonner';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARNING = 2,
  ERROR = 3
}

class Logger {
  private level: LogLevel = LogLevel.INFO;
  private logs: string[] = [];
  private maxLogs: number = 1000;
  private listeners: ((logs: string[]) => void)[] = [];

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  getLevel(): LogLevel {
    return this.level;
  }

  getLogs(): string[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
    this.notifyListeners();
  }

  addListener(listener: (logs: string[]) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.getLogs()));
  }

  private formatLog(level: string, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] ${message}`;
  }

  private addLog(level: string, message: string): void {
    const formattedLog = this.formatLog(level, message);
    this.logs.push(formattedLog);

    // Trim logs if they exceed the maximum
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    this.notifyListeners();
  }

  debug(message: string): void {
    if (this.level <= LogLevel.DEBUG) {
      console.debug(message);
      this.addLog('DEBUG', message);
    }
  }

  info(message: string, showToast: boolean = false): void {
    if (this.level <= LogLevel.INFO) {
      console.info(message);
      this.addLog('INFO', message);
      if (showToast) {
        toast.info(message);
      }
    }
  }

  warning(message: string, showToast: boolean = false): void {
    if (this.level <= LogLevel.WARNING) {
      console.warn(message);
      this.addLog('WARNING', message);
      if (showToast) {
        toast.warning(message);
      }
    }
  }

  error(message: string, error?: any, showToast: boolean = true): void {
    if (this.level <= LogLevel.ERROR) {
      const errorMsg = error ? `${message}: ${error.message || JSON.stringify(error)}` : message;
      console.error(errorMsg);
      this.addLog('ERROR', errorMsg);
      if (showToast) {
        toast.error(errorMsg);
      }
    }
  }

  trade(action: string, pair: string, amount: string, price: string): void {
    const message = `${action.toUpperCase()} ${amount} ${pair} @ ${price}`;
    console.log(`TRADE: ${message}`);
    this.addLog('TRADE', message);
    
    // Always show toast for trades
    if (action.toLowerCase() === 'buy') {
      toast.success(`Bought ${amount} ${pair} at ${price}`);
    } else if (action.toLowerCase() === 'sell') {
      toast.success(`Sold ${amount} ${pair} at ${price}`);
    }
  }
}

export const logger = new Logger();
