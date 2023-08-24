import { AxiosInstance, AxiosResponse } from 'axios';

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
/**
 * DTO used to mark the start of a test result
 */
interface CreateTestResultDto {
    testRunId: number;
    testCaseName: string;
    providerSessionIds: string[];
    testCaseId?: string;
    itwTestCaseId?: string;
}
/**
 * DTO response to a test result creation request
 */
interface CreateTestResultResponseDto {
    testResultId: number;
}
/**
 * DTO used to submit a status to an in progress test result.
 */
interface SubmitTestResultDto {
    testResultId: number;
    testRailCaseId?: number;
    itwCaseId?: number;
    status: TestResultStatus;
    failureReason?: string;
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

declare type ClientConfig = {
    readonly baseUrl: string;
    readonly apiKey: string;
};
declare class AutoApi {
    readonly options: {
        readonly clientConfig: ClientConfig | AxiosInstance;
        readonly productId: number;
        readonly testRailOptions?: TestRailOptions;
    };
    private readonly client;
    private callsInFlight;
    /**
     * tracks number of HTTP calls in progress, used by reporters that want to know when our async work is finished
     */
    get getCallsInFlight(): number;
    constructor(options: {
        readonly clientConfig: ClientConfig | AxiosInstance;
        readonly productId: number;
        readonly testRailOptions?: TestRailOptions;
    });
    startTestRun(info: TestRunCreateDto): Promise<AxiosResponse<TestRunCreateResponseDto>>;
    endTestRun(testRunId: number): Promise<AxiosResponse<void>>;
    startTestCase(params: CreateTestResultDto): Promise<AxiosResponse<CreateTestResultResponseDto>>;
    submitTestResult(params: SubmitTestResultDto): Promise<void>;
    getProviderSessionLinks(resultIds: number[]): Promise<AxiosResponse<TestResultProviderInfo[]>>;
    sendSdkHeartbeat(testRunId: number): Promise<AxiosResponse<void>>;
}
declare class TestRunHeartbeatService {
    readonly testRunId: number;
    readonly autoApi: AutoApi;
    private enabled;
    private nextHeartbeat?;
    constructor(testRunId: number, autoApi: AutoApi);
    start(): Promise<void>;
    private scheduleNextHeartbeat;
    private sendHeartbeat;
    end(): Promise<void>;
}
/**
 * Exposed for testing. Don't use this!
 * @private
 *
 * @param params mirrored constructor args from AutoApi class
 */
declare const _validateCtorParams: (options: {
    readonly clientConfig: ClientConfig | AxiosInstance;
    readonly productId: number;
    readonly testRailOptions?: TestRailOptions | undefined;
}) => void;

export { AutoApi, ClientConfig, CreateTestResultDto, CreateTestResultResponseDto, SubmitTestResultDto, TestRailOptions, TestResultProviderInfo, TestResultStatus, TestRunCreateDto, TestRunCreateResponseDto, TestRunHeartbeatService, _validateCtorParams };
