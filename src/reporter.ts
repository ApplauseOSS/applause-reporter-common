import { writeFileSync } from 'fs';
import { AutoApi } from './auto-api.ts';
import { ApplauseConfig, TestResultStatus } from './dto.ts';
import { TestRunHeartbeatService } from './heartbeat.ts';
import { join as pathJoin } from 'path';

export class ApplauseReporter {
  private autoApi: AutoApi;
  private initializer: RunInitializer;
  private reporter?: Promise<RunReporter>;

  constructor(config: ApplauseConfig) {
    this.autoApi = new AutoApi(config);
    this.initializer = new RunInitializer(this.autoApi);
  }

  public runnerStart(tests?: string[]): void {
    this.reporter = this.initializer.initializeRun(tests);
  }

  public startTestCase(id: string, testCaseName: string): void {
    if (this.reporter === undefined) {
      throw new Error(
        'Cannot start a test case for a run that was never initialized'
      );
    }
    void this.reporter.then(reporter =>
      reporter.startTestCase(id, testCaseName)
    );
  }

  public submitTestCaseResult(
    id: string,
    status: TestResultStatus,
    errorMessage?: string
  ): void {
    if (this.reporter === undefined) {
      throw new Error(
        'Cannot submit test case result for a run that was never initialized'
      );
    }
    void this.reporter.then(reporter =>
      reporter.submitTestCaseResult(id, status, errorMessage)
    );
  }

  public async runnerEnd(): Promise<void> {
    if (this.reporter === undefined) {
      throw new Error('Cannot end a run that was never initialized');
    }
    await this.reporter.then(reporter => reporter.runnerEnd());
  }
}

class RunInitializer {
  constructor(private autoApi: AutoApi) {}

  async initializeRun(tests?: string[]): Promise<RunReporter> {
    const testRunCreateResponse = await this.autoApi.startTestRun({
      tests: tests || [],
    });
    if (
      testRunCreateResponse.status < 200 ||
      testRunCreateResponse.status > 300
    ) {
      throw new Error('Unable to create test run');
    }
    const runId = testRunCreateResponse.data.runId;
    console.log('Test Run %d initialized', runId);
    const heartbeatService = new TestRunHeartbeatService(runId, this.autoApi);
    await heartbeatService.start();
    return new RunReporter(this.autoApi, runId, heartbeatService);
  }
}

class RunReporter {
  private readonly TEST_RAIL_CASE_ID_PREFIX: string = 'TestRail-';
  private readonly APPLAUSE_CASE_ID_PREFIX: string = 'Applause-';

  private uidToResultIdMap: Record<string, Promise<number>> = {};
  private resultSubmissionMap: Record<string, Promise<void>> = {};

  constructor(
    private autoApi: AutoApi,
    private testRunId: number,
    private heartbeatService: TestRunHeartbeatService
  ) {}

  public startTestCase(id: string, testCaseName: string): void {
    const parsedTestCase = this.parseTestCaseName(testCaseName);
    this.uidToResultIdMap[id] = this.autoApi
      .startTestCase({
        testCaseName: parsedTestCase.testCaseName,
        testCaseId: parsedTestCase.testRailTestCaseId,
        testRunId: this.testRunId,
        providerSessionIds: [],
      })
      .then(res => {
        return res.data.testResultId;
      });
  }

  public submitTestCaseResult(
    id: string,
    status: TestResultStatus,
    errorMessage?: string
  ): void {
    this.resultSubmissionMap[id] = this.uidToResultIdMap[id]?.then(resultId =>
      this.autoApi.submitTestCaseResult({
        status: status,
        testResultId: resultId,
        failureReason: errorMessage,
      })
    );
  }

  public parseTestCaseName(testCaseName: string): ParsedTestCaseName {
    // Split the name on spaces. We will reassemble after parsing out the other ids
    const tokens = testCaseName.split(' ');
    let testRailTestCaseId: string | undefined;
    let applauseTestCaseId: string | undefined;
    tokens.forEach(token => {
      if (token?.startsWith(this.TEST_RAIL_CASE_ID_PREFIX)) {
        if (testRailTestCaseId !== undefined) {
          console.warn('Multiple TestRail case ids detected in testCase name');
        }
        testRailTestCaseId = token.substring(
          this.TEST_RAIL_CASE_ID_PREFIX.length
        );
      } else if (token?.startsWith(this.APPLAUSE_CASE_ID_PREFIX)) {
        if (applauseTestCaseId !== undefined) {
          console.warn('Multiple Applause case ids detected in testCase name');
        }
        applauseTestCaseId = token.substring(
          this.APPLAUSE_CASE_ID_PREFIX.length
        );
      }
    });
    return {
      applauseTestCaseId,
      testRailTestCaseId,
      testCaseName: tokens
        .filter(
          token =>
            token !==
            `${this.TEST_RAIL_CASE_ID_PREFIX}${testRailTestCaseId || ''}`
        )
        .filter(
          token =>
            token !==
            `${this.APPLAUSE_CASE_ID_PREFIX}${applauseTestCaseId || ''}`
        )
        .join(' '),
    };
  }

  public async runnerEnd(): Promise<void> {
    // Wait for all results to be created
    const resultIds =
      (await Promise.all(Object.values(this.uidToResultIdMap))) || [];

    // Wait for the results to be submitted
    void (await Promise.all(Object.values(this.resultSubmissionMap)));

    // Wait the heartbeat to be ended
    void (await this.heartbeatService.end());
    void (await this.autoApi.endTestRun(this.testRunId));

    // Fetch the provider session asset links and save them off to a file
    const resp = await this.autoApi.getProviderSessionLinks(resultIds);
    const jsonArray = resp.data || [];
    if (jsonArray.length > 0) {
      console.info(JSON.stringify(jsonArray));
      // this is the wdio.conf outputDir
      const outputPath = '.';
      writeFileSync(
        pathJoin(outputPath, 'providerUrls.txt'),
        JSON.stringify(jsonArray, null, 1)
      );
    }
  }
}

interface ParsedTestCaseName {
  testCaseName: string;
  testRailTestCaseId?: string;
  applauseTestCaseId?: string;
}