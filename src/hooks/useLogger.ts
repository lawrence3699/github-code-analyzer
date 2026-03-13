'use client';

import { useState, useCallback, useMemo } from 'react';
import type { LogEntry, LogLevel, LogDetail } from '../types/log';

interface UseLoggerReturn {
  readonly logs: readonly LogEntry[];
  readonly addLog: (level: LogLevel, message: string, detail?: LogDetail) => void;
  readonly clearLogs: () => void;
}

let logCounter = 0;

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  logCounter += 1;
  return `log-${logCounter}-${Date.now()}`;
}

export function useLogger(): UseLoggerReturn {
  const [logs, setLogs] = useState<readonly LogEntry[]>([]);

  const addLog = useCallback(
    (level: LogLevel, message: string, detail?: LogDetail): void => {
      const entry: LogEntry = {
        id: generateId(),
        timestamp: new Date(),
        level,
        message,
        detail,
      };
      setLogs((prev) => [...prev, entry]);
    },
    [],
  );

  const clearLogs = useCallback((): void => {
    setLogs([]);
  }, []);

  return useMemo(
    () => ({ logs, addLog, clearLogs }),
    [logs, addLog, clearLogs],
  );
}
