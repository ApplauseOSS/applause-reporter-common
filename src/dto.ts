export interface CreateTestResultDto {
  /** id of test result we're currently processing * */
  testResultId: number;
  testRailTestCaseId: string;
  applauseTestCaseId: number;
}

export interface TestResultParamDto {
  /**  This is NOT the test session ID
    This field has been overloaded to have two meanings depending on which part
    of auto-api processing you are doing.
       - Sometimes it is the TestRail identifier for the test case
         When the data is first passed from the SDK to auto-api in the
         see TestResultController#createTestResult
       - Other times it s the DB row ID for the TestResult hibernate object
         see TestResultController#submitTestResult
    For this reason, this field is deprecated.  We still use it for legacy instances
    of the SDK, but it's going away, replaced by new fields **/
  testResultId?: number;

  /** Id in auto-api DB **/
  dbRowId?: number;

  /** The TestRail test identifier as defined by the user of the SDK.  Sent from the SDK to auto-api */
  testRailCaseId?: number;

  /** The ITW test identifier as defined by the user of the SDK.  Sent from the SDK to auto-api*/
  itwCaseId?: number;

  driverConfigId?: number;

  /** The driver group (serverside only) being used by test results */
  driverGroupId?: number;

  /** The ending status of the test. */
  status: TestResultStatus;

  /** Optional reason why the test failed. */
  failureReason?: string;
}

export enum TestResultStatus {
  NOT_RUN = 'NOT_RUN',
  IN_PROGRESS = 'IN_PROGRESS',
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
  CANCELED = 'CANCELED',
  ERROR = 'ERROR',
}

export interface TestResultProviderInfo {
  testResultId: number;
  providerUrl: string;
  providerSessionId: string;
}
