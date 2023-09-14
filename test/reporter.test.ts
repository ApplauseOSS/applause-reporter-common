import { ApplauseReporter } from '../src/reporter.ts';
import {
  TestResultProviderInfo,
  TestResultStatus,
  TestRunCreateResponseDto,
} from '../src/dto.ts';

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

jest.mock('../src/heartbeat.ts', () => {
  return {
    TestRunHeartbeatService: jest.fn().mockImplementation(() => {
      return {
        start: function (): Promise<void> {
          return Promise.resolve();
        },
        end: function (): Promise<void> {
          return Promise.resolve();
        },
      };
    }),
  };
});

describe('reporter test', () => {
  let reporter: ApplauseReporter;

  beforeEach(() => {
    reporter = new ApplauseReporter({
      apiKey: 'apiKey',
      baseUrl: 'localhost',
      productId: 1,
    });
  });

  it('should allow for start and stop', async () => {
    reporter.runnerStart();
    await reporter.runnerEnd();
  });

  it('should not allow test case start before runner start', () => {
    try {
      reporter.startTestCase('test-id', 'test-name');
      fail('test case start should not be allowed at this time');
    } catch {
      return;
    }
  });
  it('should not allow test case result submission before runner start', () => {
    try {
      reporter.submitTestCaseResult('test-id', TestResultStatus.PASSED);
      fail('test case submit should not be allowed at this time');
    } catch {
      return;
    }
  });

  it('should not allow runner end before runner start', async () => {
    try {
      await reporter.runnerEnd();
      fail('runner end should not be allowed at this time');
    } catch {
      return;
    }
  }, 10000);
});
