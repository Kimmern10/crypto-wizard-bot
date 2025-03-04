
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Terminal, Download, Trash2 } from 'lucide-react';

interface LogEntry {
  timestamp: string;
  level: 'info' | 'error' | 'warning' | 'success';
  message: string;
}

const LogViewer: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  // Intercept console logs
  useEffect(() => {
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    
    // Override console methods
    console.log = (...args) => {
      originalConsoleLog(...args);
      addLogEntry('info', args.map(arg => formatLogArgument(arg)).join(' '));
    };
    
    console.error = (...args) => {
      originalConsoleError(...args);
      addLogEntry('error', args.map(arg => formatLogArgument(arg)).join(' '));
    };
    
    console.warn = (...args) => {
      originalConsoleWarn(...args);
      addLogEntry('warning', args.map(arg => formatLogArgument(arg)).join(' '));
    };
    
    // Add initial log entry
    addLogEntry('info', 'Log viewer initialized');
    
    // Restore original console methods on cleanup
    return () => {
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
    };
  }, []);
  
  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);
  
  const formatLogArgument = (arg: any): string => {
    if (typeof arg === 'object') {
      try {
        return JSON.stringify(arg, null, 2);
      } catch (err) {
        return String(arg);
      }
    }
    return String(arg);
  };
  
  const addLogEntry = (level: LogEntry['level'], message: string) => {
    const timestamp = new Date().toISOString();
    setLogs(prevLogs => [...prevLogs, { timestamp, level, message }]);
  };
  
  const clearLogs = () => {
    setLogs([]);
    addLogEntry('info', 'Logs cleared');
  };
  
  const downloadLogs = () => {
    const logText = logs.map(log => `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}`).join('\n');
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trading-bot-logs-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'info': return 'text-blue-500';
      case 'error': return 'text-red-500';
      case 'warning': return 'text-amber-500';
      case 'success': return 'text-green-500';
      default: return '';
    }
  };
  
  const formatTimestamp = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  };
  
  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Terminal className="h-4 w-4" />
          System Logs
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7" 
            onClick={clearLogs}
            title="Clear logs"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7" 
            onClick={downloadLogs}
            title="Download logs"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea 
          className="h-[300px] rounded-md border border-muted/30 bg-muted/10 p-2 font-mono text-xs"
          ref={scrollAreaRef}
        >
          {logs.map((log, index) => (
            <div key={index} className="py-1 border-b border-muted/20 last:border-0">
              <span className="text-muted-foreground mr-2">[{formatTimestamp(log.timestamp)}]</span>
              <span className={`font-semibold ${getLevelColor(log.level)} mr-2`}>[{log.level.toUpperCase()}]</span>
              <span>{log.message}</span>
            </div>
          ))}
          {logs.length === 0 && (
            <div className="py-2 text-center text-muted-foreground">No logs yet</div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default LogViewer;
