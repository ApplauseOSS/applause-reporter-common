import { AxiosResponse } from 'axios';
import * as winston from 'winston';
import winston__default from 'winston';
import { ParsedMail } from 'mailparser';
import { TransformableInfo } from 'logform';
import TransportStream from 'winston-transport';

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
declare enum AssetType {
    SCREENSHOT = "SCREENSHOT",
    FAILURE_SCREENSHOT = "FAILURE_SCREENSHOT",
    VIDEO = "VIDEO",
    NETWORK_HAR = "NETWORK_HAR",
    VITALS_LOG = "VITALS_LOG",
    CONSOLE_LOG = "CONSOLE_LOG",
    NETWORK_LOG = "NETWORK_LOG",
    DEVICE_LOG = "DEVICE_LOG",
    SELENIUM_LOG = "SELENIUM_LOG",
    SELENIUM_LOG_JSON = "SELENIUM_LOG_JSON",
    BROWSER_LOG = "BROWSER_LOG",
    FRAMEWORK_LOG = "FRAMEWORK_LOG",
    EMAIL = "EMAIL",
    PAGE_SOURCE = "PAGE_SOURCE",
    CODE_BUNDLE = "CODE_BUNDLE",
    RESULTS_ZIP = "RESULTS_ZIP",
    SESSION_DETAILS = "SESSION_DETAILS",
    DEVICE_DETAILS = "DEVICE_DETAILS",
    UNKNOWN = "UNKNOWN"
}

interface AutoApiConfig {
    readonly autoApiBaseUrl: string;
    readonly apiKey: string;
    readonly productId: number;
    readonly testRailOptions?: TestRailOptions;
    readonly applauseTestCycleId?: number;
}

/**
 * This file contains the implementation of the `AutoApi` class, which is responsible for making API calls to interact with the Applause platform.
 * The `AutoApi` class provides methods for starting and ending test runs, creating test cases, submitting test case results, and performing other operations related to test management.
 * It also includes properties and methods to track the number of HTTP calls in progress.
 */

declare class AutoApi {
    readonly options: AutoApiConfig;
    private readonly client;
    private logger;
    private callsInFlight;
    /**
     * Tracks the number of HTTP calls in progress.
     * This property is used by reporters that want to know when the async work is finished.
     */
    get getCallsInFlight(): number;
    /**
     * Creates an instance of the `AutoApi` class.
     * @param options - The configuration options for the Applause API.
     */
    constructor(options: AutoApiConfig, logger?: winston.Logger);
    /**
     * Starts a new test run.
     * @param info - The information for creating the test run.
     * @returns A promise that resolves to the response containing the created test run.
     */
    startTestRun(info: TestRunCreateDto): Promise<AxiosResponse<TestRunCreateResponseDto>>;
    /**
     * Ends a test run.
     * @param testRunId - The ID of the test run to end.
     * @returns A promise that resolves to the response indicating the completion of the test run.
     */
    endTestRun(testRunId: number): Promise<AxiosResponse<void>>;
    /**
     * Starts a new test case.
     * @param params - The parameters for creating the test case.
     * @returns A promise that resolves to the response containing the created test case.
     */
    startTestCase(params: CreateTestCaseResultDto): Promise<AxiosResponse<CreateTestCaseResultResponseDto>>;
    /**
     * Submits a test case result.
     * @param params - The parameters for submitting the test case result.
     * @returns A promise that resolves when the test case result is submitted.
     */
    submitTestCaseResult(params: SubmitTestCaseResultDto): Promise<void>;
    /**
     * Retrieves the provider session links for the specified test results.
     * @param resultIds - The IDs of the test results.
     * @returns A promise that resolves to the response containing the provider session links.
     */
    getProviderSessionLinks(resultIds: number[]): Promise<AxiosResponse<TestResultProviderInfo[]>>;
    /**
     * Sends a heartbeat for the specified test run.
     * @param testRunId - The ID of the test run.
     * @returns A promise that resolves to the response indicating the heartbeat was sent.
     */
    sendSdkHeartbeat(testRunId: number): Promise<AxiosResponse<void>>;
    /**
     * Retrieves the email address for the specified email prefix.
     * @param emailPrefix - The prefix of the email address.
     * @returns A promise that resolves to the response containing the email address.
     */
    getEmailAddress(emailPrefix: string): Promise<AxiosResponse<EmailAddressResponse>>;
    /**
     * Retrieves the content of the specified email.
     * @param request - The request parameters for retrieving the email content.
     * @returns A promise that resolves to the response containing the email content.
     */
    getEmailContent(request: EmailFetchRequest): Promise<AxiosResponse<Buffer>>;
    /**
     * Uploads an asset for the specified test result.
     * @param resultId - The ID of the test result.
     * @param file - The file to upload as an asset.
     * @param assetName - The name of the asset.
     * @param providerSessionGuid - The GUID of the provider session.
     * @param assetType - The type of the asset.
     * @returns A promise that resolves to the response indicating the asset was uploaded.
     */
    uploadAsset(resultId: number, file: Buffer, assetName: string, providerSessionGuid: string, assetType: AssetType): Promise<AxiosResponse<void>>;
}

/**
 * Represents an email inbox.
 */
declare class Inbox {
    readonly emailAddress: string;
    private autoApi;
    /**
     * Creates an instance of Inbox.
     * @param emailAddress - The email address associated with the inbox.
     * @param autoApi - An instance of the AutoApi class.
     */
    constructor(emailAddress: string, autoApi: AutoApi);
    /**
     * Retrieves the content of an email from the inbox.
     * @returns A Promise that resolves to the parsed email content.
     */
    getEmail(): Promise<ParsedMail>;
}

/**
 * Represents an email attachment.
 */
interface Attachment {
    /**
     * The name of the file.
     */
    fileName: string;
    /**
     * The content of the file as a Uint16Array.
     */
    context: Uint16Array;
}

/**
 * Helper class for managing email functionality.
 */
declare class EmailHelper {
    private autoApi;
    constructor(autoApi: AutoApi);
    /**
     * Retrieves the inbox for the specified email prefix.
     *
     * @param emailPrefix - The prefix used to generate the email address.
     * @returns A Promise that resolves to an Inbox object.
     */
    getInbox(emailPrefix: string): Promise<Inbox>;
}

/**
 * Represents a service for sending heartbeats during a test run.
 */
declare class TestRunHeartbeatService {
    readonly testRunId: number;
    readonly autoApi: AutoApi;
    private enabled;
    private nextHeartbeat?;
    private readonly logger;
    /**
     * Creates an instance of TestRunHeartbeatService.
     * @param testRunId - The ID of the test run.
     * @param autoApi - The AutoApi instance used for sending heartbeats.
     */
    constructor(testRunId: number, autoApi: AutoApi, logger?: winston__default.Logger);
    /**
     * Starts sending heartbeats.
     * @returns A promise that resolves when the heartbeats are started.
     */
    start(): Promise<void>;
    /**
     * Checks if the heartbeats are enabled.
     * @returns True if the heartbeats are enabled, false otherwise.
     */
    isEnabled(): boolean;
    private scheduleNextHeartbeat;
    private sendHeartbeat;
    /**
     * Ends the heartbeats.
     * @returns A promise that resolves when the heartbeats are ended.
     */
    end(): Promise<void>;
}

/**
 * Represents an Applause reporter.
 */
declare class ApplauseReporter {
    private autoApi;
    private initializer;
    private logger;
    private reporter?;
    private runStarted;
    private runFinished;
    /**
     * Creates an instance of ApplauseReporter.
     * @param config - The Applause configuration.
     */
    constructor(config: AutoApiConfig, logger?: winston.Logger);
    /**
     * Starts the Applause runner.
     * @param tests - Optional array of test names to run.
     * @returns A promise that resolves to the test run ID.
     * @throws Error if a run is already started or finished.
     */
    runnerStart(tests?: string[]): Promise<number>;
    /**
     * Starts a test case.
     * @param id - The ID of the test case.
     * @param testCaseName - The name of the test case.
     * @param params - Optional additional parameters for the test case.
     * @returns A promise that resolves to the test case ID.
     * @throws Error if a run was never initialized.
     */
    startTestCase(id: string, testCaseName: string, params?: AdditionalTestCaseParams): Promise<number>;
    /**
     * Submits a test case result.
     * @param id - The ID of the test case.
     * @param status - The status of the test case result.
     * @param params - Optional additional parameters for the test case result.
     * @returns A promise that resolves to the test case result ID.
     * @throws Error if a run was never initialized.
     */
    submitTestCaseResult(id: string, status: TestResultStatus, params?: AdditionalTestCaseResultParams): Promise<number>;
    /**
     * Ends the Applause runner.
     * @returns A promise that resolves when the runner is ended.
     * @throws Error if a run was never initialized.
     */
    runnerEnd(): Promise<void>;
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
    attachTestCaseAsset(id: string, assetName: string, providerSessionGuid: string, assetType: AssetType, asset: Buffer): Promise<void>;
    /**
     * Checks if the Applause runner is synchronized.
     * @returns True if the runner is not yet started or has ended, and all calls made to the applause API have finished.
     */
    isSynchronized(): boolean;
}
/**
 * Represents a Run Initializer.
 */
declare class RunInitializer {
    private autoApi;
    private logger;
    constructor(autoApi: AutoApi, logger?: winston.Logger);
    /**
     * Initializes a test run.
     * @param tests - An optional array of test names to include in the run.
     * @returns A promise that resolves to a RunReporter instance.
     * @throws An error if unable to create the test run.
     */
    initializeRun(tests?: string[]): Promise<RunReporter>;
}
/**
 * Handles reporting test results to the Applause API.
 */
declare class RunReporter {
    private autoApi;
    readonly testRunId: number;
    private heartbeatService?;
    private uidToResultIdMap;
    private resultSubmissionMap;
    private logger;
    /**
     * Creates a new instance of the Reporter class.
     * @param autoApi - The AutoApi instance.
     * @param testRunId - The ID of the test run.
     * @param heartbeatService - (Optional) The TestRunHeartbeatService instance.
     */
    constructor(autoApi: AutoApi, testRunId: number, heartbeatService?: TestRunHeartbeatService | undefined, logger?: winston.Logger);
    /**
     * Starts a test case and returns a promise that resolves to the test result ID.
     *
     * @param id - The ID of the test case.
     * @param testCaseName - The name of the test case.
     * @param params - Additional parameters for the test case.
     * @returns A promise that resolves to the test result ID.
     */
    startTestCase(id: string, testCaseName: string, params?: AdditionalTestCaseParams): Promise<number>;
    /**
     * Submits the result of a test case.
     *
     * @param id - The ID of the test case.
     * @param status - The status of the test result.
     * @param params - Additional parameters for the test result.
     * @returns A promise that resolves to the result ID.
     */
    submitTestCaseResult(id: string, status: TestResultStatus, params?: AdditionalTestCaseResultParams): Promise<number>;
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
    attachTestCaseAsset(id: string, assetName: string, providerSessionGuid: string, assetType: AssetType, asset: Buffer): Promise<void>;
    /**
     * Ends the test runner and performs necessary cleanup tasks.
     * @returns A promise that resolves when the runner has ended.
     */
    runnerEnd(): Promise<void>;
}

interface TestRunAutoResultDto {
    testCycleId: number;
    status: TestRunAutoResultStatus;
    failureReason?: string;
    sessionDetailsJson?: SessionDetails;
    startTime?: Date;
    endTime?: Date;
}
declare enum TestRunAutoResultStatus {
    PASSED = "PASSED",
    FAILED = "FAILED",
    SKIPPED = "SKIPPED",
    CANCELED = "CANCELED",
    ERROR = "ERROR"
}
interface SessionDetails {
    value: {
        deviceName?: string;
        orientation?: string;
        platformName?: string;
        platformVersion?: string;
        browserName?: string;
        browserVersion?: string;
    };
}

interface PublicApiConfig {
    readonly publicApiBaseUrl: string;
    readonly apiKey: string;
    readonly productId: number;
    readonly applauseTestCycleId?: number;
}

declare class PublicApi {
    readonly options: PublicApiConfig;
    private readonly client;
    private callsInFlight;
    private logger;
    /**
     * tracks number of HTTP calls in progress, used by reporters that want to know when our async work is finished
     */
    get getCallsInFlight(): number;
    constructor(options: PublicApiConfig, logger?: winston.Logger);
    submitResult(testCaseId: number, info: TestRunAutoResultDto): Promise<AxiosResponse<void>>;
}

type ApplauseConfig = AutoApiConfig & PublicApiConfig;
/**
 * Represents the properties for loading the configuration.
 */
interface ConfigLoadProperties {
    configFile?: string;
    properties?: Partial<ApplauseConfig>;
}
/**
 * Loads the configuration for the Applause Reporter.
 * @param loadOptions - The options for loading the configuration.
 * @returns The loaded Applause configuration.
 * @throws Error if the configuration is not complete or invalid.
 */
declare function loadConfig(loadOptions?: ConfigLoadProperties): ApplauseConfig;
/**
 * Overrides the configuration with the provided overrides.
 * @param config - The base configuration.
 * @param overrides - The overrides to apply.
 * @returns The overridden configuration.
 */
declare function overrideConfig(config: Partial<ApplauseConfig>, overrides?: Partial<ApplauseConfig>): Partial<ApplauseConfig>;
/**
 * Checks if the configuration is complete.
 * @param config - The configuration to check.
 * @returns True if the configuration is complete, false otherwise.
 */
declare function isComplete(config: Partial<ApplauseConfig>): boolean;
/**
 * Loads the configuration from the specified file.
 * @param configFile - The path to the configuration file.
 * @returns The loaded configuration from the file.
 */
declare function loadConfigFromFile(configFile?: string): Partial<ApplauseConfig>;
/**
 * Validates the configuration.
 * @param config - The configuration to validate.
 * @throws Error if the configuration is invalid.
 */
declare function validateConfig(config: ApplauseConfig): void;
/**
 * Validates a partial configuration.
 * @param config - The partial configuration to validate.
 * @throws Error if the partial configuration is invalid.
 */
declare function validatePartialConfig(config: Partial<ApplauseConfig>): void;

declare const TEST_RAIL_CASE_ID_PREFIX: string;
declare const APPLAUSE_CASE_ID_PREFIX: string;
declare function parseTestCaseName(testCaseName: string, logger?: winston.Logger): ParsedTestCaseName;
interface ParsedTestCaseName {
    testCaseName: string;
    testRailTestCaseId?: string;
    applauseTestCaseId?: string;
}

declare const WINSTON_DEFAULT_LOG_FORMAT: winston.Logform.Format;
declare function constructDefaultLogger(): winston.Logger;
/**
 * A simple Class for storing and retrieving log messages.
 */
declare class LoggingContainer {
    private logs;
    /**
     * Retrieves all logs stored in the container.
     *
     * @returns An array of log messages.
     */
    getLogs(): string[];
    /**
     * Retrieves and clears all logs stored in the container.
     *
     * @returns An array of log messages.
     */
    drainLogs(): string[];
    /**
     * Clears all logs stored in the container.
     */
    clearLogs(): void;
    /**
     * Adds a log message to the container.
     *
     * @param log - The log message to add.
     */
    addLog(log: string): void;
}
declare const APPLAUSE_LOG_RECORDS: LoggingContainer;
/**
 * A Custom Winston Transport that sends logs to the Applause LoggingContainer
 */
declare class ApplauseTransport extends TransportStream {
    constructor(opts?: TransportStream.TransportStreamOptions);
    log(info: TransformableInfo, callback: () => void): void;
}

export { APPLAUSE_CASE_ID_PREFIX, APPLAUSE_LOG_RECORDS, type AdditionalTestCaseParams, type AdditionalTestCaseResultParams, type ApplauseConfig, ApplauseReporter, ApplauseTransport, AssetType, type Attachment, AutoApi, type ClientConfig, type ConfigLoadProperties, type CreateTestCaseResultDto, type CreateTestCaseResultResponseDto, type EmailAddressResponse, type EmailFetchRequest, EmailHelper, Inbox, LoggingContainer, type ParsedTestCaseName, PublicApi, RunInitializer, RunReporter, type SessionDetails, type SubmitTestCaseResultDto, TEST_RAIL_CASE_ID_PREFIX, type TestRailOptions, type TestResultProviderInfo, TestResultStatus, type TestRunAutoResultDto, TestRunAutoResultStatus, type TestRunCreateDto, type TestRunCreateResponseDto, TestRunHeartbeatService, WINSTON_DEFAULT_LOG_FORMAT, constructDefaultLogger, isComplete, loadConfig, loadConfigFromFile, overrideConfig, parseTestCaseName, validateConfig, validatePartialConfig };
