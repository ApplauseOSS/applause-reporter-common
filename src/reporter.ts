import { writeFileSync } from 'fs';
import { AutoApi } from './auto-api.ts';
import {
  AdditionalTestCaseParams,
  AdditionalTestCaseResultParams,
  TestResultStatus,
} from './dto.ts';
import { TestRunHeartbeatService } from './heartbeat.ts';
import { join as pathJoin } from 'path';
import { ApplauseConfig } from './config.ts';

export class ApplauseReporter {
  private autoApi: AutoApi;
  private initializer: RunInitializer;
  private reporter?: Promise<RunReporter>;
  private runStarted: boolean = false;
  private runFinished: boolean = false;

  constructor(config: ApplauseConfig) {
    this.autoApi = new AutoApi(config);
    this.initializer = new RunInitializer(this.autoApi);
  }

  public runnerStart(tests?: string[]): void {
    this.reporter = this.initializer.initializeRun(tests);
    void this.reporter.then(() => {
      this.runStarted = true;
    });
  }

  public startTestCase(
    id: string,
    testCaseName: string,
    params?: AdditionalTestCaseParams
  ): void {
    if (this.reporter === undefined) {
      throw new Error(
        'Cannot start a test case for a run that was never initialized'
      );
    }
    void this.reporter.then(reporter =>
      reporter.startTestCase(id, testCaseName, params)
    );
  }

  public submitTestCaseResult(
    id: string,
    status: TestResultStatus,
    params?: AdditionalTestCaseResultParams
  ): void {
    if (this.reporter === undefined) {
      throw new Error(
        'Cannot submit test case result for a run that was never initialized'
      );
    }
    void this.reporter.then(reporter =>
      reporter.submitTestCaseResult(id, status, params)
    );
  }

  public async runnerEnd(): Promise<void> {
    if (this.reporter === undefined) {
      throw new Error('Cannot end a run that was never initialized');
    }
    await this.reporter
      .then(reporter => reporter.runnerEnd())
      .then(() => (this.runFinished = true));
  }

  public isSynchronized(): boolean {
    // Verify the run is not yet started or it has ended, and all calls made to the applause api have finished
    return (
      (!this.runStarted || (this.runStarted && this.runFinished)) &&
      this.autoApi.getCallsInFlight == 0
    );
  }
}

export class RunInitializer {
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

export class RunReporter {
  private readonly TEST_RAIL_CASE_ID_PREFIX: string = 'TestRail-';
  private readonly APPLAUSE_CASE_ID_PREFIX: string = 'Applause-';

  private uidToResultIdMap: Record<string, Promise<number>> = {};
  private resultSubmissionMap: Record<string, Promise<void>> = {};

  constructor(
    private autoApi: AutoApi,
    private testRunId: number,
    private heartbeatService: TestRunHeartbeatService
  ) {}

  public startTestCase(
    id: string,
    testCaseName: string,
    params?: AdditionalTestCaseParams
  ): void {
    const parsedTestCase = this.parseTestCaseName(testCaseName);
    this.uidToResultIdMap[id] = this.autoApi
      .startTestCase({
        testCaseName: parsedTestCase.testCaseName,
        testCaseId: parsedTestCase.testRailTestCaseId,
        itwTestCaseId: parsedTestCase.applauseTestCaseId,

        testRunId: this.testRunId,
        // If the additional params provides either test case id, it will override the parsed value we set above
        ...Object.fromEntries(
          Object.entries(params || {}).filter(([_, v]) => v !== undefined)
        ),
      })
      .then(res => {
        return res.data.testResultId;
      });
  }

  public submitTestCaseResult(
    id: string,
    status: TestResultStatus,
    params?: AdditionalTestCaseResultParams
  ): void {
    this.resultSubmissionMap[id] = this.uidToResultIdMap[id]?.then(resultId =>
      this.autoApi.submitTestCaseResult({
        status: status,
        testResultId: resultId,
        ...params,
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
