import type { LogFields, LogLevel, Logger } from '../../../application/ports/out/logger.js';

const ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

type Sink = (line: string) => void;

const stderrSink: Sink = (line) => {
  process.stderr.write(`${line}\n`);
};

/** Logger JSON em stderr. stdout é o canal do protocolo MCP no transporte stdio. */
export class StderrLogger implements Logger {
  constructor(
    private readonly minLevel: LogLevel = 'info',
    private readonly sink: Sink = stderrSink,
    private readonly now: () => Date = () => new Date(),
  ) {}

  debug(message: string, fields?: LogFields): void {
    this.write('debug', message, fields);
  }
  info(message: string, fields?: LogFields): void {
    this.write('info', message, fields);
  }
  warn(message: string, fields?: LogFields): void {
    this.write('warn', message, fields);
  }
  error(message: string, fields?: LogFields): void {
    this.write('error', message, fields);
  }

  private write(level: LogLevel, message: string, fields: LogFields = {}): void {
    if (ORDER[level] < ORDER[this.minLevel]) return;
    this.sink(JSON.stringify({ timestamp: this.now().toISOString(), level, message, ...fields }));
  }
}
