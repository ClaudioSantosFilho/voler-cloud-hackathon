export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogFields {
  tool?: string;
  durationMs?: number;
  source?: string;
  status?: string;
  requestId?: string;
  [key: string]: unknown;
}

export interface Logger {
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
}
