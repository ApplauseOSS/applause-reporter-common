import { AutoApi } from './auto-api.ts';

export class TestRunHeartbeatService {
  private enabled = false;
  private nextHeartbeat?: Promise<void>;

  constructor(
    readonly testRunId: number,
    readonly autoApi: AutoApi
  ) {}

  async start(): Promise<void> {
    // End the current heartbeat if it has started
    await this.end();

    // Set up va new interval
    this.enabled = true;
    this.scheduleNextHeartbeat();
  }

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
    console.log('Sending heartbeat');
    await this.autoApi.sendSdkHeartbeat(this.testRunId);
    console.log('Heartbeat sent');
    this.scheduleNextHeartbeat();
  }

  async end(): Promise<void> {
    if (this.nextHeartbeat !== undefined) {
      this.enabled = false;
      console.debug('Ending Applause SDK Heartbeat');
      await this.nextHeartbeat;
      console.debug('Applause SDK Heartbeat Ended Successfully');
    }
    this.nextHeartbeat = undefined;
  }
}
