import * as winston from 'winston';
import { TransformableInfo } from 'logform';
import TransportStream from 'winston-transport';
const MESSAGE = Symbol.for('message');

export const WINSTON_DEFAULT_LOG_FORMAT = winston.format.printf(
  ({ level, message, label, timestamp }) => {
    return `${timestamp} [${label}] ${level}: ${message}`;
  }
);

export function constructDefaultLogger(): winston.Logger {
  return winston.createLogger({
    format: winston.format.combine(
      winston.format.label({ label: 'Applause Tests' }),
      winston.format.timestamp(),
      winston.format.splat(),
      WINSTON_DEFAULT_LOG_FORMAT
    ),
    transports: [
      new winston.transports.File({ filename: 'error.log', level: 'error' }),
      new winston.transports.File({ filename: 'combined.log' }),
      new ApplauseTransport(),
      new winston.transports.Console({
        level: 'info',
        format: winston.format.combine(
          winston.format.colorize(),
          WINSTON_DEFAULT_LOG_FORMAT
        ),
      }),
    ],
  });
}

/**
 * A simple Class for storing and retrieving log messages.
 */
export class LoggingContainer {
  private logs: string[] = [];

  /**
   * Retrieves all logs stored in the container.
   *
   * @returns An array of log messages.
   */
  public getLogs(): string[] {
    return this.logs;
  }

  /**
   * Retrieves and clears all logs stored in the container.
   *
   * @returns An array of log messages.
   */
  public drainLogs(): string[] {
    const logs = this.logs;
    this.clearLogs();
    return logs;
  }

  /**
   * Clears all logs stored in the container.
   */
  public clearLogs(): void {
    this.logs = [];
  }

  /**
   * Adds a log message to the container.
   *
   * @param log - The log message to add.
   */
  public addLog(log: string): void {
    this.logs.push(log);
  }
}

// Create a new Shared LoggingContainer to store logs
export const APPLAUSE_LOG_RECORDS: LoggingContainer = new LoggingContainer();

/**
 * A Custom Winston Transport that sends logs to the Applause LoggingContainer
 */
export class ApplauseTransport extends TransportStream {
  constructor(opts?: TransportStream.TransportStreamOptions) {
    super(opts);
  }

  log(info: TransformableInfo, callback: () => void): void {
    setImmediate(() => {
      this.emit('logged', info);
    });

    this.format?.transform(info);
    APPLAUSE_LOG_RECORDS.addLog(
      (info[MESSAGE] as string | undefined) ?? (info.message as string)
    );

    // Continue to the next transport
    callback();
  }
}
