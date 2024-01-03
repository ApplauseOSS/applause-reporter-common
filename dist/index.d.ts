import { AxiosResponse } from 'axios';
import { ParsedMail } from 'mailparser';

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
/**
 * DTO containing a generated email address for testing
 */
interface EmailAddressResponse {
    emailAddress: string;
}
/**
 * DTO used for fetching an email from a given email address
 */
interface EmailFetchRequest {
    emailAddress: string;
}

interface ApplauseConfig {
    readonly baseUrl: string;
    readonly apiKey: string;
    readonly productId: number;
    readonly testRailOptions?: TestRailOptions;
    readonly applauseTestCycleId?: number;
}
declare const DEFAULT_URL = "https://prod-auto-api.cloud.applause.com/";
interface ConfigLoadProperties {
    configFile?: string;
    properties?: Partial<ApplauseConfig>;
}
declare function loadConfig(loadOptions?: ConfigLoadProperties): ApplauseConfig;
declare function overrideConfig(config: Partial<ApplauseConfig>, overrides?: Partial<ApplauseConfig>): Partial<ApplauseConfig>;
declare function isComplete(config: Partial<ApplauseConfig>): boolean;
declare function loadConfigFromFile(configFile?: string): Partial<ApplauseConfig>;
declare function validateConfig(config: ApplauseConfig): void;
declare function validatePartialConfig(config: Partial<ApplauseConfig>): void;

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
    getEmailAddress(emailPrefix: string): Promise<AxiosResponse<EmailAddressResponse>>;
    getEmailContent(request: EmailFetchRequest): Promise<AxiosResponse<Buffer>>;
}

declare class Inbox {
    readonly emailAddress: string;
    private autoApi;
    constructor(emailAddress: string, autoApi: AutoApi);
    getEmail(): Promise<ParsedMail>;
}

interface Attachment {
    fileName: string;
    context: Uint16Array;
}

declare class EmailHelper {
    private autoApi;
    constructor(autoApi: AutoApi);
    getInbox(emailPrefix: string): Promise<Inbox>;
}

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
    private runStarted;
    private runFinished;
    constructor(config: ApplauseConfig);
    runnerStart(tests?: string[]): void;
    startTestCase(id: string, testCaseName: string, params?: AdditionalTestCaseParams): void;
    submitTestCaseResult(id: string, status: TestResultStatus, params?: AdditionalTestCaseResultParams): void;
    runnerEnd(): Promise<void>;
    isSynchronized(): boolean;
}
declare class RunInitializer {
    private autoApi;
    constructor(autoApi: AutoApi);
    initializeRun(tests?: string[]): Promise<RunReporter>;
}
declare class RunReporter {
    private autoApi;
    private testRunId;
    private heartbeatService;
    private uidToResultIdMap;
    private resultSubmissionMap;
    constructor(autoApi: AutoApi, testRunId: number, heartbeatService: TestRunHeartbeatService);
    startTestCase(id: string, testCaseName: string, params?: AdditionalTestCaseParams): void;
    submitTestCaseResult(id: string, status: TestResultStatus, params?: AdditionalTestCaseResultParams): void;
    runnerEnd(): Promise<void>;
}

export { type AdditionalTestCaseParams, type AdditionalTestCaseResultParams, type ApplauseConfig, ApplauseReporter, type Attachment, AutoApi, type ClientConfig, type ConfigLoadProperties, type CreateTestCaseResultDto, type CreateTestCaseResultResponseDto, DEFAULT_URL, type EmailAddressResponse, type EmailFetchRequest, EmailHelper, Inbox, RunInitializer, RunReporter, type SubmitTestCaseResultDto, type TestRailOptions, type TestResultProviderInfo, TestResultStatus, type TestRunCreateDto, type TestRunCreateResponseDto, TestRunHeartbeatService, isComplete, loadConfig, loadConfigFromFile, overrideConfig, validateConfig, validatePartialConfig };
