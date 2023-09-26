import { ApplauseReporter, RunReporter } from '../src/reporter.ts';
import {
  CreateTestCaseResultDto,
  CreateTestCaseResultResponseDto,
  TestResultProviderInfo,
  TestResultStatus,
  TestRunCreateResponseDto,
} from '../src/dto.ts';
import { TestRunHeartbeatService } from '../src/heartbeat.ts';
import { AutoApi } from '../src/auto-api.ts';

const mockedAutoApi = {
  startTestRun: function (): Promise<{ data: TestRunCreateResponseDto }> {
    return Promise.resolve({
      data: { runId: 0 },
      status: 200,
      statusText: 'Ok',
    });
  },
  endTestRun: jest.fn(() => {
    return Promise.resolve();
  }),
  startTestCase: jest.fn((req: any) => {
    return Promise.resolve({
      data: {
        testResultId: 1,
      } as CreateTestCaseResultResponseDto,
      status: 200,
      statusTest: 'Ok',
      request: req,
    });
  }),
  submitTestCaseResult: jest.fn(() => {
    return Promise.resolve();
  }),
  getProviderSessionLinks: function (): Promise<TestResultProviderInfo[]> {
    return Promise.resolve([]);
  },
  sendSdkHeartbeat: function (): Promise<void> {
    return Promise.resolve();
  },
};

jest.mock('../src/auto-api.ts', () => {
  return {
    AutoApi: jest.fn().mockImplementation(() => mockedAutoApi),
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
jest.useFakeTimers();
describe('reporter test', () => {
  let reporter: ApplauseReporter;

  beforeEach(() => {
    jest.clearAllMocks();
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

  it('should pass the test case name and run id', () => {
    const mockedAutoApi = new AutoApi({
      apiKey: '',
      baseUrl: '',
      productId: 0,
    });
    const rr = new RunReporter(
      mockedAutoApi,
      0,
      new TestRunHeartbeatService(0, mockedAutoApi)
    );
    rr.startTestCase('test', 'Test');
    expect(mockedAutoApi.startTestCase).toHaveBeenCalledWith({
      testCaseName: 'Test',
      testRunId: 0,
    } as CreateTestCaseResultDto);
  });
  it('should extract out the testrail id', () => {
    const mockedAutoApi = new AutoApi({
      apiKey: '',
      baseUrl: '',
      productId: 0,
    });
    const rr = new RunReporter(
      mockedAutoApi,
      0,
      new TestRunHeartbeatService(0, mockedAutoApi)
    );
    rr.startTestCase('test', 'TestRail-1234 Test');
    expect(mockedAutoApi.startTestCase).toHaveBeenCalledWith({
      testCaseName: 'Test',
      testRunId: 0,
      testCaseId: '1234',
    } as CreateTestCaseResultDto);
  });
  it('should extract out the applause test case id', () => {
    const mockedAutoApi = new AutoApi({
      apiKey: '',
      baseUrl: '',
      productId: 0,
    });
    const rr = new RunReporter(
      mockedAutoApi,
      0,
      new TestRunHeartbeatService(0, mockedAutoApi)
    );
    rr.startTestCase('test', 'Applause-1234 Test');
    expect(mockedAutoApi.startTestCase).toHaveBeenCalledWith({
      testCaseName: 'Test',
      testRunId: 0,
      itwTestCaseId: '1234',
    } as CreateTestCaseResultDto);
  });
  it('should allow overwriting of testrail test case id', () => {
    const mockedAutoApi = new AutoApi({
      apiKey: '',
      baseUrl: '',
      productId: 0,
    });
    const rr = new RunReporter(
      mockedAutoApi,
      0,
      new TestRunHeartbeatService(0, mockedAutoApi)
    );
    rr.startTestCase('test', 'TestRail-1234 Test', { testCaseId: '4567' });
    expect(mockedAutoApi.startTestCase).toHaveBeenCalledWith({
      testCaseName: 'Test',
      testRunId: 0,
      testCaseId: '4567',
    } as CreateTestCaseResultDto);
  });
  it('should allow overwriting of applause test case id', () => {
    const mockedAutoApi = new AutoApi({
      apiKey: '',
      baseUrl: '',
      productId: 0,
    });
    const rr = new RunReporter(
      mockedAutoApi,
      0,
      new TestRunHeartbeatService(0, mockedAutoApi)
    );
    rr.startTestCase('test', 'Applause-1234 Test', { itwTestCaseId: '4567' });
    expect(mockedAutoApi.startTestCase).toHaveBeenCalledWith({
      testCaseName: 'Test',
      testRunId: 0,
      itwTestCaseId: '4567',
    } as CreateTestCaseResultDto);
  });
  it('should not overwrite the test case id if other values are passed', () => {
    const mockedAutoApi = new AutoApi({
      apiKey: '',
      baseUrl: '',
      productId: 0,
    });
    const rr = new RunReporter(
      mockedAutoApi,
      0,
      new TestRunHeartbeatService(0, mockedAutoApi)
    );
    rr.startTestCase('test', 'TestRail-1234 Test', { itwTestCaseId: '4567' });
    expect(mockedAutoApi.startTestCase).toHaveBeenCalledWith({
      testCaseName: 'Test',
      testRunId: 0,
      testCaseId: '1234',
      itwTestCaseId: '4567',
    } as CreateTestCaseResultDto);
  });
});
