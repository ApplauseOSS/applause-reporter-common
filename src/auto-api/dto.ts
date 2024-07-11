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

export interface AdditionalTestCaseParams {
  // A collection of provider session guids
  providerSessionIds?: string[];

  // Optional: TestRail Test Case Id
  testCaseId?: string;

  // Optional: Applause Test Case Id
  itwTestCaseId?: string;
}

/**
 * DTO used to mark the start of a test result
 */
export interface CreateTestCaseResultDto extends AdditionalTestCaseParams {
  // ID of the test run to submit this result to
  testRunId: number;

  // Name of the Test Case
  testCaseName: string;
}

/**
 * DTO response to a test result creation request
 */
export interface CreateTestCaseResultResponseDto {
  testResultId: number;
}

export interface AdditionalTestCaseResultParams {
  // A list of selenium provider session ids to connect to the result
  providerSessionGuids?: string[];

  // An optional testrail test case id
  testRailCaseId?: number;

  // An optional applause test case id
  itwCaseId?: number;

  // The reason a test case failed
  failureReason?: string;
}

/**
 * DTO used to submit a status to an in progress test result.
 */
export interface SubmitTestCaseResultDto
  extends AdditionalTestCaseResultParams {
  // The id of the test result
  testResultId: number;

  // The ending status of the test.
  status: TestResultStatus;
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

/**
 * DTO containing a generated email address for testing
 */
export interface EmailAddressResponse {
  emailAddress: string;
}

/**
 * DTO used for fetching an email from a given email address
 */
export interface EmailFetchRequest {
  emailAddress: string;
}

export enum AssetType {
  SCREENSHOT = 'SCREENSHOT',
  FAILURE_SCREENSHOT = 'FAILURE_SCREENSHOT',
  VIDEO = 'VIDEO',
  NETWORK_HAR = 'NETWORK_HAR',
  VITALS_LOG = 'VITALS_LOG',
  CONSOLE_LOG = 'CONSOLE_LOG',
  NETWORK_LOG = 'NETWORK_LOG',
  DEVICE_LOG = 'DEVICE_LOG',
  SELENIUM_LOG = 'SELENIUM_LOG',
  SELENIUM_LOG_JSON = 'SELENIUM_LOG_JSON',
  BROWSER_LOG = 'BROWSER_LOG',
  FRAMEWORK_LOG = 'FRAMEWORK_LOG',
  EMAIL = 'EMAIL',
  PAGE_SOURCE = 'PAGE_SOURCE',
  CODE_BUNDLE = 'CODE_BUNDLE',
  RESULTS_ZIP = 'RESULTS_ZIP',
  SESSION_DETAILS = 'SESSION_DETAILS',
  DEVICE_DETAILS = 'DEVICE_DETAILS',
  UNKNOWN = 'UNKNOWN',
}
