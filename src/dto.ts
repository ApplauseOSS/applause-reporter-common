import { AxiosInstance } from 'axios';

/**
 * Configuration of the auto-api client
 */
export type ClientConfig = {
  readonly baseUrl: string;
  readonly apiKey: string;
};

/**
 * DTO used to create a new Applause test run
 */
export interface TestRunCreateDto {
  // Required: a list of test cases to pre-create
  tests: string[];

  // Optional: an applause test cycle id
  itwTestCycleId?: number;
}

/**
 * DTO modeling the response to a test run creation request
 */
export interface TestRunCreateResponseDto {
  // The ID of the Applause Test Run
  runId: number;
}

/**
 * DTO used to mark the start of a test result
 */
export interface CreateTestResultDto {
  // ID of the test run to submit this result to
  testRunId: number;

  // Name of the Test Case
  testCaseName: string;

  // A collection of provider session guids
  providerSessionIds: string[];

  // Optional: TestRail Test Case Id
  testCaseId?: string;

  // Optional: Applause Test Case Id
  itwTestCaseId?: string;
}

/**
 * DTO response to a test result creation request
 */
export interface CreateTestResultResponseDto {
  testResultId: number;
}

/**
 * DTO used to submit a status to an in progress test result.
 */
export interface SubmitTestResultDto {
  // The id of the test result
  testResultId: number;

  // An optional testrail test case id
  testRailCaseId?: number;

  // An optional applause test case id
  itwCaseId?: number;

  // The ending status of the test.
  status: TestResultStatus;

  // An optional reason why the test failed.
  failureReason?: string;
}

/**
 * Enum representing a test result's status
 */
export enum TestResultStatus {
  NOT_RUN = 'NOT_RUN',
  IN_PROGRESS = 'IN_PROGRESS',
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
  CANCELED = 'CANCELED',
  ERROR = 'ERROR',
}

/**
 * DTO representing test result info that is provided at the end of a test run
 */
export interface TestResultProviderInfo {
  testResultId: number;
  providerUrl: string;
  providerSessionId: string;
}

/**
 * DTO representing TestRail settings. The presence of this info signals that test rail reporting is enabled
 */
export interface TestRailOptions {
  projectId: number;
  suiteId: number;
  planName: string;
  runName: string;
  addAllTestsToPlan?: boolean;
  overrideTestRailRunUniqueness?: boolean;
}

export interface ApplauseConfig {
  readonly clientConfig: ClientConfig | AxiosInstance;
  readonly productId: number;
  readonly testRailOptions?: TestRailOptions;
  readonly applauseTestCycleId?: number;
}
