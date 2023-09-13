import { AxiosInstance, AxiosResponse } from 'axios';

/**
 * Configuration of the auto-api client
 */
type ClientConfig = {
    readonly baseUrl: string;
    readonly apiKey: string;
};
/**
 * DTO used to create a new Applause test run
 */
interface TestRunCreateDto {
    tests: string[];
    itwTestCycleId?: number;
}
/**
 * DTO modeling the response to a test run creation request
 */
interface TestRunCreateResponseDto {
    runId: number;
}
interface AdditionalTestCaseParams {
    providerSessionIds?: string[];
    testCaseId?: string;
    itwTestCaseId?: string;
}
/**
 * DTO used to mark the start of a test result
 */
interface CreateTestCaseResultDto extends AdditionalTestCaseParams {
    testRunId: number;
    testCaseName: string;
}
/**
 * DTO response to a test result creation request
 */
interface CreateTestCaseResultResponseDto {
    testResultId: number;
}
interface AdditionalTestCaseResultParams {
    providerSessionGuids?: string[];
    testRailCaseId?: number;
    itwCaseId?: number;
    failureReason?: string;
}
/**
 * DTO used to submit a status to an in progress test result.
 */
interface SubmitTestCaseResultDto extends AdditionalTestCaseResultParams {
    testResultId: number;
    status: TestResultStatus;
}
/**
 * Enum representing a test result's status
 */
declare enum TestResultStatus {
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
interface TestResultProviderInfo {
    testResultId: number;
    providerUrl: string;
    providerSessionId: string;
}
/**
 * DTO representing TestRail settings. The presence of this info signals that test rail reporting is enabled
 */
interface TestRailOptions {
    projectId: number;
    suiteId: number;
    planName: string;
    runName: string;
    addAllTestsToPlan?: boolean;
    overrideTestRailRunUniqueness?: boolean;
}
interface ApplauseConfig {
    readonly clientConfig: ClientConfig | AxiosInstance;
    readonly productId: number;
    readonly testRailOptions?: TestRailOptions;
    readonly applauseTestCycleId?: number;
}

declare class AutoApi {
    readonly options: ApplauseConfig;
    private readonly client;
    private callsInFlight;
    /**
     * tracks number of HTTP calls in progress, used by reporters that want to know when our async work is finished
     */
    get getCallsInFlight(): number;
    constructor(options: ApplauseConfig);
    startTestRun(info: TestRunCreateDto): Promise<AxiosResponse<TestRunCreateResponseDto>>;
    endTestRun(testRunId: number): Promise<AxiosResponse<void>>;
    startTestCase(params: CreateTestCaseResultDto): Promise<AxiosResponse<CreateTestCaseResultResponseDto>>;
    submitTestCaseResult(params: SubmitTestCaseResultDto): Promise<void>;
    getProviderSessionLinks(resultIds: number[]): Promise<AxiosResponse<TestResultProviderInfo[]>>;
    sendSdkHeartbeat(testRunId: number): Promise<AxiosResponse<void>>;
}
/**
 * Exposed for testing. Don't use this!
 * @private
 *
 * @param params mirrored constructor args from AutoApi class
 */
declare const _validateCtorParams: (options: ApplauseConfig) => void;

declare class TestRunHeartbeatService {
    readonly testRunId: number;
    readonly autoApi: AutoApi;
    private enabled;
    private nextHeartbeat?;
    constructor(testRunId: number, autoApi: AutoApi);
    start(): Promise<void>;
    isEnabled(): boolean;
    private scheduleNextHeartbeat;
    private sendHeartbeat;
    end(): Promise<void>;
}

declare class ApplauseReporter {
    private autoApi;
    private initializer;
    private reporter?;
    constructor(config: ApplauseConfig);
    runnerStart(tests?: string[]): void;
    startTestCase(id: string, testCaseName: string, params?: AdditionalTestCaseParams): void;
    submitTestCaseResult(id: string, status: TestResultStatus, params?: AdditionalTestCaseResultParams): void;
    runnerEnd(): Promise<void>;
}

export { type AdditionalTestCaseParams, type AdditionalTestCaseResultParams, type ApplauseConfig, ApplauseReporter, AutoApi, type ClientConfig, type CreateTestCaseResultDto, type CreateTestCaseResultResponseDto, type SubmitTestCaseResultDto, type TestRailOptions, type TestResultProviderInfo, TestResultStatus, type TestRunCreateDto, type TestRunCreateResponseDto, TestRunHeartbeatService, _validateCtorParams };
