export type LogLevel = 'info' | 'success' | 'warning' | 'error';

export interface LogDetail {
  readonly label: string;
  readonly data: unknown;
}

export interface LogEntry {
  readonly id: string;
  readonly timestamp: Date;
  readonly level: LogLevel;
  readonly message: string;
  readonly detail?: LogDetail;
}
