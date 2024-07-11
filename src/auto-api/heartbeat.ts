import winston = require('winston');
import { AutoApi } from './auto-api.ts';
import { constructDefaultLogger } from '../shared/logging.ts';

/**
 * Represents a service for sending heartbeats during a test run.
 */
export class TestRunHeartbeatService {
  private enabled = false;
  private nextHeartbeat?: Promise<void>;
  private readonly logger: winston.Logger;

  /**
   * Creates an instance of TestRunHeartbeatService.
   * @param testRunId - The ID of the test run.
   * @param autoApi - The AutoApi instance used for sending heartbeats.
   */
  constructor(
    readonly testRunId: number,
    readonly autoApi: AutoApi,
    logger?: winston.Logger
  ) {
    this.logger = logger ?? constructDefaultLogger();
  }

  /**
   * Starts sending heartbeats.
   * @returns A promise that resolves when the heartbeats are started.
   */
  async start(): Promise<void> {
    // End the current heartbeat if it has started
    await this.end();

    // Set up a new interval
    this.enabled = true;
    this.scheduleNextHeartbeat();
  }

  /**
   * Checks if the heartbeats are enabled.
   * @returns True if the heartbeats are enabled, false otherwise.
   */
  public isEnabled(): boolean {
    return this.enabled;
  }

  private scheduleNextHeartbeat(): void {
    if (!this.enabled) {
      return;
    }
    this.nextHeartbeat = new Promise(resolve => setTimeout(resolve, 5000)).then(
      () => this.sendHeartbeat()
    );
  }

  private async sendHeartbeat(): Promise<void> {
    this.logger.debug('Sending heartbeat');
    await this.autoApi.sendSdkHeartbeat(this.testRunId);
    this.logger.debug('Heartbeat sent');
    this.scheduleNextHeartbeat();
  }

  /**
   * Ends the heartbeats.
   * @returns A promise that resolves when the heartbeats are ended.
   */
  async end(): Promise<void> {
    if (this.nextHeartbeat !== undefined) {
      this.enabled = false;
      this.logger.debug('Ending Applause SDK Heartbeat');
      await this.nextHeartbeat;
      this.logger.debug('Applause SDK Heartbeat Ended Successfully');
    }
    this.nextHeartbeat = undefined;
  }
}
