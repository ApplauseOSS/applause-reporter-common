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
    tests: string[];
    itwTestCycleId?: number;
}
/**
 * DTO modeling the response to a test run creation request
 */
export interface TestRunCreateResponseDto {
    runId: number;
}
/**
 * DTO used to mark the start of a test result
 */
export interface CreateTestResultDto {
    testRunId: number;
    testCaseName: string;
    providerSessionIds: string[];
    testCaseId?: string;
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
    testResultId: number;
    testRailCaseId?: number;
    itwCaseId?: number;
    status: TestResultStatus;
    failureReason?: string;
}
/**
 * Enum representing a test result's status
 */
export declare enum TestResultStatus {
    NOT_RUN = "NOT_RUN",
    IN_PROGRESS = "IN_PROGRESS",
    PASSED = "PASSED",
    FAILED = "FAILED",
    SKIPPED = "SKIPPED",
    CANCELED = "CANCELED",
    ERROR = "ERROR"
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
//# sourceMappingURL=dto.d.ts.map