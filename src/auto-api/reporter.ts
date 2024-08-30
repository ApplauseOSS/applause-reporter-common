import { writeFileSync } from 'fs';
import { AutoApi } from './auto-api.ts';
import {
  AdditionalTestCaseParams,
  AdditionalTestCaseResultParams,
  AssetType,
  TestResultStatus,
} from './dto.ts';
import { TestRunHeartbeatService } from './heartbeat.ts';
import { join as pathJoin } from 'path';
import { AutoApiConfig } from './auto-api-config.ts';
import { parseTestCaseName } from '../shared/test-case.ts';
import * as winston from 'winston';
import { constructDefaultLogger } from '../shared/logging.ts';

/**
 * Represents an Applause reporter.
 */
export class ApplauseReporter {
  private autoApi: AutoApi;
  private initializer: RunInitializer;
  private logger: winston.Logger;
  private reporter?: Promise<RunReporter>;
  private runStarted: boolean = false;
  private runFinished: boolean = false;

  /**
   * Creates an instance of ApplauseReporter.
   * @param config - The Applause configuration.
   */
  constructor(config: AutoApiConfig, logger?: winston.Logger) {
    this.logger = logger ?? constructDefaultLogger();
    this.autoApi = new AutoApi(config, this.logger);
    this.initializer = new RunInitializer(this.autoApi, this.logger);
    const runId = process.env['APPLAUSE_RUN_ID'];
    if (runId !== undefined) {
      const r = new RunReporter(
        this.autoApi,
        parseInt(runId),
        undefined,
        this.logger
      );
      this.reporter = new Promise(resolve => resolve(r));
      this.runStarted = true;
    }
  }

  /**
   * Starts the Applause runner.
   * @param tests - Optional array of test names to run.
   * @returns A promise that resolves to the test run ID.
   * @throws Error if a run is already started or finished.
   */
  public async runnerStart(tests?: string[]): Promise<number> {
    if (this.reporter !== undefined) {
      this.logger.error(
        'Cannot start a run - run already started or run already finished'
      );
      throw new Error(
        'Cannot start a run - run already started or run already finished'
      );
    }
    this.reporter = this.initializer.initializeRun(tests);
    const initializedReporter = await this.reporter;
    this.runStarted = true;
    process.env['APPLAUSE_RUN_ID'] = initializedReporter.testRunId.toString();
    return initializedReporter.testRunId;
  }

  /**
   * Starts a test case.
   * @param id - The ID of the test case.
   * @param testCaseName - The name of the test case.
   * @param params - Optional additional parameters for the test case.
   * @returns A promise that resolves to the test case ID.
   * @throws Error if a run was never initialized.
   */
  public async startTestCase(
    id: string,
    testCaseName: string,
    params?: AdditionalTestCaseParams
  ): Promise<number> {
    if (this.reporter === undefined) {
      this.logger.error(
        'Cannot start a test case for a run that was never initialized'
      );
      throw new Error(
        'Cannot start a test case for a run that was never initialized'
      );
    }
    const reporter = await this.reporter;
    return reporter.startTestCase(id, testCaseName, params);
  }

  /**
   * Submits a test case result.
   * @param id - The ID of the test case.
   * @param status - The status of the test case result.
   * @param params - Optional additional parameters for the test case result.
   * @returns A promise that resolves to the test case result ID.
   * @throws Error if a run was never initialized.
   */
  public async submitTestCaseResult(
    id: string,
    status: TestResultStatus,
    params?: AdditionalTestCaseResultParams
  ): Promise<number> {
    if (this.reporter === undefined) {
      this.logger.error(
        'Cannot submit test case result for a run that was never initialized'
      );
      throw new Error(
        'Cannot submit test case result for a run that was never initialized'
      );
    }
    const reporter = await this.reporter;
    return reporter.submitTestCaseResult(id, status, params);
  }

  /**
   * Ends the Applause runner.
   * @returns A promise that resolves when the runner is ended.
   * @throws Error if a run was never initialized.
   */
  public async runnerEnd(): Promise<void> {
    if (this.reporter === undefined) {
      this.logger.error('Cannot end a run that was never initialized');
      throw new Error('Cannot end a run that was never initialized');
    }
    await this.reporter
      .then(reporter => reporter.runnerEnd())
      .then(() => (this.runFinished = true));
  }

  /**
   * Attaches an asset to a test case.
   * @param id - The ID of the test case.
   * @param assetName - The name of the asset.
   * @param providerSessionGuid - The provider session GUID.
   * @param assetType - The type of the asset.
   * @param asset - The asset data as a Buffer.
   * @returns A promise that resolves when the asset is attached.
   * @throws Error if a run was never initialized.
   */
  public async attachTestCaseAsset(
    id: string,
    assetName: string,
    providerSessionGuid: string,
    assetType: AssetType,
    asset: Buffer
  ): Promise<void> {
    if (this.reporter === undefined) {
      this.logger.error(
        'Cannot attach an asset for a run that was never initialized'
      );
      throw new Error(
        'Cannot attach an asset for a run that was never initialized'
      );
    }
    return await this.reporter.then(reporter =>
      reporter.attachTestCaseAsset(
        id,
        assetName,
        providerSessionGuid,
        assetType,
        asset
      )
    );
  }

  /**
   * Checks if the Applause runner is synchronized.
   * @returns True if the runner is not yet started or has ended, and all calls made to the applause API have finished.
   */
  public isSynchronized(): boolean {
    return (
      (!this.runStarted || (this.runStarted && this.runFinished)) &&
      this.autoApi.getCallsInFlight == 0
    );
  }
}

/**
 * Represents a Run Initializer.
 */
export class RunInitializer {
  private logger: winston.Logger;
  constructor(
    private autoApi: AutoApi,
    logger?: winston.Logger
  ) {
    this.logger = logger ?? constructDefaultLogger();
  }

  /**
   * Initializes a test run.
   * @param tests - An optional array of test names to include in the run.
   * @returns A promise that resolves to a RunReporter instance.
   * @throws An error if unable to create the test run.
   */
  async initializeRun(tests?: string[]): Promise<RunReporter> {
    const cleanedTests = tests
      ?.map(testName => parseTestCaseName(testName, this.logger))
      .map(parsed => parsed.testCaseName.trim());
    const testRunCreateResponse = await this.autoApi.startTestRun({
      tests: cleanedTests ?? [],
    });
    if (
      testRunCreateResponse.status < 200 ||
      testRunCreateResponse.status > 300
    ) {
      this.logger.error(
        `Failed to create Applause Test Run: received error response with status ${testRunCreateResponse.status}.`
      );
      throw new Error('Unable to create test run');
    }
    const runId = testRunCreateResponse.data.runId;
    this.logger.info(`Test Run ${runId} initialized`);
    const heartbeatService = new TestRunHeartbeatService(
      runId,
      this.autoApi,
      this.logger
    );
    await heartbeatService.start();
    return new RunReporter(this.autoApi, runId, heartbeatService, this.logger);
  }
}

/**
 * Handles reporting test results to the Applause API.
 */
export class RunReporter {
  private uidToResultIdMap: Record<string, Promise<number>> = {};
  private resultSubmissionMap: Record<string, Promise<number>> = {};
  private logger: winston.Logger;

  /**
   * Creates a new instance of the Reporter class.
   * @param autoApi - The AutoApi instance.
   * @param testRunId - The ID of the test run.
   * @param heartbeatService - (Optional) The TestRunHeartbeatService instance.
   */
  constructor(
    private autoApi: AutoApi,
    public readonly testRunId: number,
    private heartbeatService?: TestRunHeartbeatService,
    logger?: winston.Logger
  ) {
    this.logger = logger ?? constructDefaultLogger();
  }

  /**
   * Starts a test case and returns a promise that resolves to the test result ID.
   *
   * @param id - The ID of the test case.
   * @param testCaseName - The name of the test case.
   * @param params - Additional parameters for the test case.
   * @returns A promise that resolves to the test result ID.
   */
  public startTestCase(
    id: string,
    testCaseName: string,
    params?: AdditionalTestCaseParams
  ): Promise<number> {
    if (!testCaseName) {
      this.logger.error('testCaseName is required');
      throw new Error('testCaseName is required');
    }
    const parsedTestCase = parseTestCaseName(testCaseName, this.logger);
    const submission = this.autoApi
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
    this.uidToResultIdMap[id] = submission;
    return submission;
  }

  /**
   * Submits the result of a test case.
   *
   * @param id - The ID of the test case.
   * @param status - The status of the test result.
   * @param params - Additional parameters for the test result.
   * @returns A promise that resolves to the result ID.
   */
  public submitTestCaseResult(
    id: string,
    status: TestResultStatus,
    params?: AdditionalTestCaseResultParams
  ): Promise<number> {
    const submission = this.uidToResultIdMap[id]?.then(resultId =>
      this.autoApi
        .submitTestCaseResult({
          status: status,
          testResultId: resultId,
          ...params,
        })
        .then(() => resultId)
    );
    this.resultSubmissionMap[id] = submission;
    return submission;
  }

  /**
   * Attaches a test case asset to a result.
   *
   * @param id - The ID of the test case.
   * @param assetName - The name of the asset.
   * @param providerSessionGuid - The provider session GUID.
   * @param assetType - The type of the asset.
   * @param asset - The asset to attach.
   * @returns A promise that resolves when the asset is attached.
   */
  public async attachTestCaseAsset(
    id: string,
    assetName: string,
    providerSessionGuid: string,
    assetType: AssetType,
    asset: Buffer
  ): Promise<void> {
    await this.uidToResultIdMap[id]?.then(resultId =>
      this.autoApi.uploadAsset(
        resultId,
        asset,
        assetName,
        providerSessionGuid,
        assetType
      )
    );
  }

  /**
   * Ends the test runner and performs necessary cleanup tasks.
   * @returns A promise that resolves when the runner has ended.
   */
  public async runnerEnd(): Promise<void> {
    // Wait for all results to be created
    const resultIds =
      (await Promise.all(Object.values(this.uidToResultIdMap))) ?? [];

    // Wait for the results to be submitted
    void (await Promise.all(Object.values(this.resultSubmissionMap)));

    // Wait the heartbeat to be ended
    void (await this.heartbeatService?.end());
    void (await this.autoApi.endTestRun(this.testRunId));

    // Fetch the provider session asset links and save them off to a file
    const resp = await this.autoApi.getProviderSessionLinks(resultIds);
    const jsonArray = resp.data ?? [];
    if (jsonArray.length > 0) {
      this.logger.info(JSON.stringify(jsonArray));
      // this is the wdio.conf outputDir
      const outputPath = '.';
      writeFileSync(
        pathJoin(outputPath, 'providerUrls.txt'),
        JSON.stringify(jsonArray, null, 1)
      );
    }
  }
}
