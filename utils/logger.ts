import { LogEntry, LogLevel } from "../types";

type Listener = (entry: LogEntry) => void;

class Logger {
  private listeners: Listener[] = [];

  subscribe(listener: Listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private emit(level: LogLevel, message: string, details?: any) {
    const entry: LogEntry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      level,
      message,
      details: details ? JSON.parse(JSON.stringify(details)) : undefined // Snapshot details
    };
    
    // Broadcast to listeners
    this.listeners.forEach(l => l(entry));
    
    // Fallback to console for debugging
    const style = level === 'error' ? 'color: red' : level === 'success' ? 'color: green' : 'color: blue';
    console.log(`%c[${level.toUpperCase()}] ${message}`, style, details || '');
  }

  info(msg: string, details?: any) { this.emit('info', msg, details); }
  success(msg: string, details?: any) { this.emit('success', msg, details); }
  warn(msg: string, details?: any) { this.emit('warn', msg, details); }
  error(msg: string, details?: any) { this.emit('error', msg, details); }
}

export const logger = new Logger();