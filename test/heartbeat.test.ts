import { AutoApi } from '../src/auto-api.ts';
import {
  TestResultProviderInfo,
  TestRunCreateResponseDto,
} from '../src/dto.ts';
import { TestRunHeartbeatService } from '../src/heartbeat.ts';

jest.useFakeTimers();
jest.mock('../src/auto-api.ts', () => {
  return {
    AutoApi: jest.fn().mockImplementation(() => {
      return {
        startTestRun: function (): Promise<{ data: TestRunCreateResponseDto }> {
          return Promise.resolve({
            data: { runId: 0 },
            status: 200,
            statusText: 'Ok',
          });
        },
        endTestRun: function (): Promise<void> {
          return Promise.resolve();
        },
        startTestCase: function (): Promise<void> {
          return Promise.resolve();
        },
        submitTestCaseResult: function (): Promise<void> {
          return Promise.resolve();
        },
        getProviderSessionLinks: function (): Promise<
          TestResultProviderInfo[]
        > {
          return Promise.resolve([]);
        },
        sendSdkHeartbeat: function (): Promise<void> {
          return Promise.resolve();
        },
      };
    }),
  };
});

async function waitForNextHeartbeat() {
  jest.advanceTimersByTime(5000);
  await Promise.resolve();
}
const autoApi = new AutoApi({
  clientConfig: { apiKey: 'apiKey', baseUrl: 'http://localhost' },
  productId: 1,
});
const heartbeatCommandSpy = jest.spyOn(autoApi, 'sendSdkHeartbeat');

describe('test run heartbeat', () => {
  let heartbeat: TestRunHeartbeatService;
  beforeEach(() => {
    heartbeat = new TestRunHeartbeatService(0, autoApi);
    jest.resetAllMocks();
  });

  it('should start and stop', async () => {
    expect(heartbeatCommandSpy).toHaveBeenCalledTimes(0);
    await heartbeat.start();
    const heartbeatEnd = heartbeat.end();
    await waitForNextHeartbeat();
    await heartbeatEnd;
    expect(heartbeatCommandSpy).toHaveBeenCalledTimes(1);
  });

  it('should call the heartbeat command while running', async () => {
    try {
      console.log('Starting');
      expect(heartbeat.isEnabled()).toBeFalsy();
      await heartbeat.start();
      console.log('Started');
      expect(heartbeat.isEnabled()).toBeTruthy();
      expect(heartbeatCommandSpy).toHaveBeenCalledTimes(0);
      console.log('Running pending timers');
      await waitForNextHeartbeat();
      console.log('Pending timers run');
      expect(heartbeatCommandSpy).toHaveBeenCalledTimes(1);
      console.log('Running pending timers');
      await waitForNextHeartbeat();
      console.log('Pending timers run');
      expect(heartbeatCommandSpy).toHaveBeenCalledTimes(2);
      console.log('Ending heartbeat');

      // start the heartbeat end, this will wait for the heartbeat to be called one more time
      const heartbeatEndProcess = heartbeat.end();
      expect(heartbeatCommandSpy).toHaveBeenCalledTimes(2);
      await waitForNextHeartbeat();
      expect(heartbeatCommandSpy).toHaveBeenCalledTimes(3);
      await heartbeatEndProcess;
      expect(heartbeatCommandSpy).toHaveBeenCalledTimes(3);
      await waitForNextHeartbeat();
      expect(heartbeatCommandSpy).toHaveBeenCalledTimes(3);
    } finally {
      await heartbeat.end();
    }
  }, 100000);
});
