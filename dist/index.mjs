import axios from 'axios';
import Validator from 'validator';
import * as winston from 'winston';
import TransportStream from 'winston-transport';
import { simpleParser } from 'mailparser';
import { writeFileSync, existsSync, readFileSync } from 'fs';
import path, { join } from 'path';

const API_VERSION = '1.1.0';

const validator$1 = Validator.default;
const DEFAULT_URL$1 = 'https://prod-auto-api.cloud.applause.com/';
const DEFAULT_AUTO_API_PROPERTIES = {
    autoApiBaseUrl: DEFAULT_URL$1,
};
function isAutoApiConfigComplete(config) {
    return (config.autoApiBaseUrl !== undefined &&
        config.apiKey !== undefined &&
        config.productId !== undefined);
}
function validateAutoApiConfig(config) {
    if (!Number.isInteger(config.productId) || config.productId <= 0) {
        throw new Error(`productId must be a positive integer, was: '${config.productId}'`);
    }
    if (!validator$1.isURL(config.autoApiBaseUrl, {
        protocols: ['http', 'https'],
        require_tld: false, // allow localhost
        allow_query_components: false,
        disallow_auth: true,
        allow_fragments: false,
        allow_protocol_relative_urls: false,
        allow_trailing_dot: false,
        require_host: true,
        require_protocol: true,
    })) {
        throw new Error(`autoApiBaseUrl is not valid HTTP/HTTPS URL, was: ${config.autoApiBaseUrl}`);
    }
    if (validator$1.isEmpty(config.apiKey)) {
        throw new Error('apiKey is an empty string!');
    }
}

const MESSAGE = Symbol.for('message');
const WINSTON_DEFAULT_LOG_FORMAT = winston.format.printf(({ level, message, label, timestamp }) => {
    return `${timestamp} [${label}] ${level}: ${message}`;
});
function constructDefaultLogger() {
    return winston.createLogger({
        format: winston.format.combine(winston.format.label({ label: 'Applause Tests' }), winston.format.timestamp(), winston.format.splat(), WINSTON_DEFAULT_LOG_FORMAT),
        transports: [
            new winston.transports.File({ filename: 'error.log', level: 'error' }),
            new winston.transports.File({ filename: 'combined.log' }),
            new ApplauseTransport(),
            new winston.transports.Console({
                level: 'info',
                format: winston.format.combine(winston.format.colorize(), WINSTON_DEFAULT_LOG_FORMAT),
            }),
        ],
    });
}
/**
 * A simple Class for storing and retrieving log messages.
 */
class LoggingContainer {
    logs = [];
    /**
     * Retrieves all logs stored in the container.
     *
     * @returns An array of log messages.
     */
    getLogs() {
        return this.logs;
    }
    /**
     * Retrieves and clears all logs stored in the container.
     *
     * @returns An array of log messages.
     */
    drainLogs() {
        const logs = this.logs;
        this.clearLogs();
        return logs;
    }
    /**
     * Clears all logs stored in the container.
     */
    clearLogs() {
        this.logs = [];
    }
    /**
     * Adds a log message to the container.
     *
     * @param log - The log message to add.
     */
    addLog(log) {
        this.logs.push(log);
    }
}
// Create a new Shared LoggingContainer to store logs
const APPLAUSE_LOG_RECORDS = new LoggingContainer();
/**
 * A Custom Winston Transport that sends logs to the Applause LoggingContainer
 */
class ApplauseTransport extends TransportStream {
    constructor(opts) {
        super(opts);
    }
    log(info, callback) {
        setImmediate(() => {
            this.emit('logged', info);
        });
        this.format?.transform(info);
        APPLAUSE_LOG_RECORDS.addLog(info[MESSAGE] ?? info.message);
        // Continue to the next transport
        callback();
    }
}

/**
 * This file contains the implementation of the `AutoApi` class, which is responsible for making API calls to interact with the Applause platform.
 * The `AutoApi` class provides methods for starting and ending test runs, creating test cases, submitting test case results, and performing other operations related to test management.
 * It also includes properties and methods to track the number of HTTP calls in progress.
 */
class AutoApi {
    options;
    client;
    logger;
    callsInFlight;
    /**
     * Tracks the number of HTTP calls in progress.
     * This property is used by reporters that want to know when the async work is finished.
     */
    get getCallsInFlight() {
        return this.callsInFlight;
    }
    /**
     * Creates an instance of the `AutoApi` class.
     * @param options - The configuration options for the Applause API.
     */
    constructor(options, logger) {
        this.options = options;
        this.callsInFlight = 0;
        this.logger = logger ?? constructDefaultLogger();
        validateAutoApiConfig(options);
        this.client = axios.create({
            baseURL: options.autoApiBaseUrl,
            timeout: options.timeout ?? 300_000,
            headers: {
                'X-Api-Key': options.apiKey,
                'Context-Type': 'application/json',
            },
            responseType: 'json',
        });
        this.client.interceptors.response.use(function (response) {
            return response;
        }, (error) => {
            // log and rethrow
            const errText = error.response?.data !== undefined
                ? JSON.stringify(error.response.data)
                : `error-code [${error.response?.status}] with error [${error.response?.statusText}]`;
            this.logger.error(`Auto-Api returned ${errText}`);
            return Promise.reject(error);
        });
    }
    /**
     * Starts a new test run.
     * @param info - The information for creating the test run.
     * @returns A promise that resolves to the response containing the created test run.
     */
    async startTestRun(info) {
        this.callsInFlight += 1;
        try {
            return await this.client.post('/api/v1.0/test-run/create', {
                // Provided params
                ...info,
                // API Version
                sdkVersion: `js:${API_VERSION}`,
                // Copy over the product id
                productId: this.options.productId,
                itwTestCycleId: this.options.applauseTestCycleId,
                // Copy over test rail parameters
                testRailReportingEnabled: this.options.testRailOptions !== undefined,
                addAllTestsToPlan: this.options.testRailOptions?.addAllTestsToPlan,
                testRailProjectId: this.options.testRailOptions?.projectId,
                testRailSuiteId: this.options.testRailOptions?.suiteId,
                testRailPlanName: this.options.testRailOptions?.planName,
                testRailRunName: this.options.testRailOptions?.runName,
                overrideTestRailRunNameUniqueness: this.options.testRailOptions?.overrideTestRailRunUniqueness,
            });
        }
        finally {
            this.callsInFlight -= 1;
        }
    }
    /**
     * Ends a test run.
     * @param testRunId - The ID of the test run to end.
     * @returns A promise that resolves to the response indicating the completion of the test run.
     */
    async endTestRun(testRunId) {
        this.callsInFlight += 1;
        try {
            return await this.client.delete(`/api/v1.0/test-run/${testRunId}?endingStatus=COMPLETE`);
        }
        finally {
            this.callsInFlight -= 1;
        }
    }
    /**
     * Starts a new test case.
     * @param params - The parameters for creating the test case.
     * @returns A promise that resolves to the response containing the created test case.
     */
    async startTestCase(params) {
        this.callsInFlight += 1;
        try {
            const res = await this.client.post('/api/v1.0/test-result/create-result', params);
            return res;
        }
        finally {
            this.callsInFlight -= 1;
        }
    }
    /**
     * Submits a test case result.
     * @param params - The parameters for submitting the test case result.
     * @returns A promise that resolves when the test case result is submitted.
     */
    async submitTestCaseResult(params) {
        this.callsInFlight += 1;
        try {
            await this.client.post('/api/v1.0/test-result', params);
        }
        finally {
            this.callsInFlight -= 1;
        }
    }
    /**
     * Retrieves the provider session links for the specified test results.
     * @param resultIds - The IDs of the test results.
     * @returns A promise that resolves to the response containing the provider session links.
     */
    async getProviderSessionLinks(resultIds) {
        this.callsInFlight += 1;
        try {
            // this filters out falsy values (null, undefined, 0)
            const validIds = resultIds.filter(id => id);
            return await this.client.post('/api/v1.0/test-result/provider-info', validIds);
        }
        finally {
            this.callsInFlight -= 1;
        }
    }
    /**
     * Sends a heartbeat for the specified test run.
     * @param testRunId - The ID of the test run.
     * @returns A promise that resolves to the response indicating the heartbeat was sent.
     */
    async sendSdkHeartbeat(testRunId) {
        this.callsInFlight += 1;
        try {
            // this filters out falsy values (null, undefined, 0)
            return await this.client.post('/api/v2.0/sdk-heartbeat', {
                testRunId: testRunId,
            });
        }
        finally {
            this.callsInFlight -= 1;
        }
    }
    /**
     * Retrieves the email address for the specified email prefix.
     * @param emailPrefix - The prefix of the email address.
     * @returns A promise that resolves to the response containing the email address.
     */
    async getEmailAddress(emailPrefix) {
        this.callsInFlight += 1;
        try {
            // this filters out falsy values (null, undefined, 0)
            return await this.client.get(`/api/v1.0/email/get-address?prefix=${emailPrefix}`);
        }
        finally {
            this.callsInFlight -= 1;
        }
    }
    /**
     * Retrieves the content of the specified email.
     * @param request - The request parameters for retrieving the email content.
     * @returns A promise that resolves to the response containing the email content.
     */
    async getEmailContent(request) {
        this.callsInFlight += 1;
        try {
            // this filters out falsy values (null, undefined, 0)
            return await this.client.post('/api/v1.0/email/download-email', request);
        }
        finally {
            this.callsInFlight -= 1;
        }
    }
    /**
     * Uploads an asset for the specified test result.
     * @param resultId - The ID of the test result.
     * @param file - The file to upload as an asset.
     * @param assetName - The name of the asset.
     * @param providerSessionGuid - The GUID of the provider session.
     * @param assetType - The type of the asset.
     * @returns A promise that resolves to the response indicating the asset was uploaded.
     */
    async uploadAsset(resultId, file, assetName, providerSessionGuid, assetType) {
        this.callsInFlight += 1;
        try {
            // this filters out falsy values (null, undefined, 0)
            return await this.client.postForm(`/api/v1.0/test-result/${resultId}/upload`, {
                file,
                assetName,
                providerSessionGuid,
                assetType,
            });
        }
        finally {
            this.callsInFlight -= 1;
        }
    }
}

/**
 * Enum representing a test result's status
 */
var TestResultStatus;
(function (TestResultStatus) {
    TestResultStatus["NOT_RUN"] = "NOT_RUN";
    TestResultStatus["IN_PROGRESS"] = "IN_PROGRESS";
    TestResultStatus["PASSED"] = "PASSED";
    TestResultStatus["FAILED"] = "FAILED";
    TestResultStatus["SKIPPED"] = "SKIPPED";
    TestResultStatus["CANCELED"] = "CANCELED";
    TestResultStatus["ERROR"] = "ERROR";
})(TestResultStatus || (TestResultStatus = {}));
var AssetType;
(function (AssetType) {
    AssetType["SCREENSHOT"] = "SCREENSHOT";
    AssetType["FAILURE_SCREENSHOT"] = "FAILURE_SCREENSHOT";
    AssetType["VIDEO"] = "VIDEO";
    AssetType["NETWORK_HAR"] = "NETWORK_HAR";
    AssetType["VITALS_LOG"] = "VITALS_LOG";
    AssetType["CONSOLE_LOG"] = "CONSOLE_LOG";
    AssetType["NETWORK_LOG"] = "NETWORK_LOG";
    AssetType["DEVICE_LOG"] = "DEVICE_LOG";
    AssetType["SELENIUM_LOG"] = "SELENIUM_LOG";
    AssetType["SELENIUM_LOG_JSON"] = "SELENIUM_LOG_JSON";
    AssetType["BROWSER_LOG"] = "BROWSER_LOG";
    AssetType["FRAMEWORK_LOG"] = "FRAMEWORK_LOG";
    AssetType["EMAIL"] = "EMAIL";
    AssetType["PAGE_SOURCE"] = "PAGE_SOURCE";
    AssetType["CODE_BUNDLE"] = "CODE_BUNDLE";
    AssetType["RESULTS_ZIP"] = "RESULTS_ZIP";
    AssetType["SESSION_DETAILS"] = "SESSION_DETAILS";
    AssetType["DEVICE_DETAILS"] = "DEVICE_DETAILS";
    AssetType["UNKNOWN"] = "UNKNOWN";
})(AssetType || (AssetType = {}));

/**
 * Represents an email inbox.
 */
class Inbox {
    emailAddress;
    autoApi;
    /**
     * Creates an instance of Inbox.
     * @param emailAddress - The email address associated with the inbox.
     * @param autoApi - An instance of the AutoApi class.
     */
    constructor(emailAddress, autoApi) {
        this.emailAddress = emailAddress;
        this.autoApi = autoApi;
    }
    /**
     * Retrieves the content of an email from the inbox.
     * @returns A Promise that resolves to the parsed email content.
     */
    async getEmail() {
        const res = await this.autoApi.getEmailContent({
            emailAddress: this.emailAddress,
        });
        return await simpleParser(res.data);
    }
}

/**
 * Helper class for managing email functionality.
 */
class EmailHelper {
    autoApi;
    constructor(autoApi) {
        this.autoApi = autoApi;
    }
    /**
     * Retrieves the inbox for the specified email prefix.
     *
     * @param emailPrefix - The prefix used to generate the email address.
     * @returns A Promise that resolves to an Inbox object.
     */
    async getInbox(emailPrefix) {
        const generatedAddress = (await this.autoApi.getEmailAddress(emailPrefix)).data.emailAddress;
        return new Inbox(generatedAddress, this.autoApi);
    }
}

/**
 * Represents a service for sending heartbeats during a test run.
 */
class TestRunHeartbeatService {
    testRunId;
    autoApi;
    enabled = false;
    nextHeartbeat;
    logger;
    /**
     * Creates an instance of TestRunHeartbeatService.
     * @param testRunId - The ID of the test run.
     * @param autoApi - The AutoApi instance used for sending heartbeats.
     */
    constructor(testRunId, autoApi, logger) {
        this.testRunId = testRunId;
        this.autoApi = autoApi;
        this.logger = logger ?? constructDefaultLogger();
    }
    /**
     * Starts sending heartbeats.
     * @returns A promise that resolves when the heartbeats are started.
     */
    async start() {
        // End the current heartbeat if it has started
        await this.end();
        // Set up a new interval
        this.enabled = true;
        this.scheduleNextHeartbeat();
    }
    /**
     * Checks if the heartbeats are enabled.
     * @returns True if the heartbeats are enabled, false otherwise.
     */
    isEnabled() {
        return this.enabled;
    }
    scheduleNextHeartbeat() {
        if (!this.enabled) {
            return;
        }
        this.nextHeartbeat = new Promise(resolve => setTimeout(resolve, 5000)).then(() => this.sendHeartbeat());
    }
    async sendHeartbeat() {
        this.logger.debug('Sending heartbeat');
        await this.autoApi.sendSdkHeartbeat(this.testRunId);
        this.logger.debug('Heartbeat sent');
        this.scheduleNextHeartbeat();
    }
    /**
     * Ends the heartbeats.
     * @returns A promise that resolves when the heartbeats are ended.
     */
    async end() {
        if (this.nextHeartbeat !== undefined) {
            this.enabled = false;
            this.logger.debug('Ending Applause SDK Heartbeat');
            await this.nextHeartbeat;
            this.logger.debug('Applause SDK Heartbeat Ended Successfully');
        }
        this.nextHeartbeat = undefined;
    }
}

const TEST_RAIL_CASE_ID_PREFIX = 'TestRail-';
const APPLAUSE_CASE_ID_PREFIX = 'Applause-';
function parseTestCaseName(testCaseName, logger) {
    const matches = testCaseName.match(/(TestRail-\d+|Applause-\d+)/g);
    const testRailCaseIds = matches
        ?.filter(match => match.startsWith(TEST_RAIL_CASE_ID_PREFIX))
        .map(match => match.substring(TEST_RAIL_CASE_ID_PREFIX.length)) ?? [];
    const applauseCaseIds = matches
        ?.filter(match => match.startsWith(APPLAUSE_CASE_ID_PREFIX))
        .map(match => match.substring(APPLAUSE_CASE_ID_PREFIX.length)) ?? [];
    if (testRailCaseIds.length > 1) {
        (logger ?? console).warn('Multiple TestRail case ids detected in testCase name');
    }
    if (applauseCaseIds.length > 1) {
        (logger ?? console).warn('Multiple Applause case ids detected in testCase name');
    }
    return {
        applauseTestCaseId: applauseCaseIds[0],
        testRailTestCaseId: testRailCaseIds[0],
        testCaseName: testCaseName
            .replace(/(TestRail-\d+|Applause-\d+)/g, '')
            .replace(/\s+/g, ' ')
            .trim(),
    };
}

/**
 * Represents an Applause reporter.
 */
class ApplauseReporter {
    autoApi;
    initializer;
    logger;
    reporter;
    runStarted = false;
    runFinished = false;
    /**
     * Creates an instance of ApplauseReporter.
     * @param config - The Applause configuration.
     */
    constructor(config, logger) {
        this.logger = logger ?? constructDefaultLogger();
        this.autoApi = new AutoApi(config, this.logger);
        this.initializer = new RunInitializer(this.autoApi, this.logger);
        const runId = process.env['APPLAUSE_RUN_ID'];
        if (runId !== undefined) {
            const r = new RunReporter(this.autoApi, parseInt(runId), undefined, this.logger);
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
    async runnerStart(tests) {
        if (this.reporter !== undefined) {
            this.logger.error('Cannot start a run - run already started or run already finished');
            throw new Error('Cannot start a run - run already started or run already finished');
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
    async startTestCase(id, testCaseName, params) {
        if (this.reporter === undefined) {
            this.logger.error('Cannot start a test case for a run that was never initialized');
            throw new Error('Cannot start a test case for a run that was never initialized');
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
    async submitTestCaseResult(id, status, params) {
        if (this.reporter === undefined) {
            this.logger.error('Cannot submit test case result for a run that was never initialized');
            throw new Error('Cannot submit test case result for a run that was never initialized');
        }
        const reporter = await this.reporter;
        return reporter.submitTestCaseResult(id, status, params);
    }
    /**
     * Ends the Applause runner.
     * @returns A promise that resolves when the runner is ended.
     * @throws Error if a run was never initialized.
     */
    async runnerEnd() {
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
    async attachTestCaseAsset(id, assetName, providerSessionGuid, assetType, asset) {
        if (this.reporter === undefined) {
            this.logger.error('Cannot attach an asset for a run that was never initialized');
            throw new Error('Cannot attach an asset for a run that was never initialized');
        }
        return await this.reporter.then(reporter => reporter.attachTestCaseAsset(id, assetName, providerSessionGuid, assetType, asset));
    }
    /**
     * Checks if the Applause runner is synchronized.
     * @returns True if the runner is not yet started or has ended, and all calls made to the applause API have finished.
     */
    isSynchronized() {
        return ((!this.runStarted || (this.runStarted && this.runFinished)) &&
            this.autoApi.getCallsInFlight == 0);
    }
}
/**
 * Represents a Run Initializer.
 */
class RunInitializer {
    autoApi;
    logger;
    constructor(autoApi, logger) {
        this.autoApi = autoApi;
        this.logger = logger ?? constructDefaultLogger();
    }
    /**
     * Initializes a test run.
     * @param tests - An optional array of test names to include in the run.
     * @returns A promise that resolves to a RunReporter instance.
     * @throws An error if unable to create the test run.
     */
    async initializeRun(tests) {
        const cleanedTests = tests
            ?.map(testName => parseTestCaseName(testName, this.logger))
            .map(parsed => parsed.testCaseName.trim());
        const testRunCreateResponse = await this.autoApi.startTestRun({
            tests: cleanedTests ?? [],
        });
        if (testRunCreateResponse.status < 200 ||
            testRunCreateResponse.status > 300) {
            this.logger.error(`Failed to create Applause Test Run: received error response with status ${testRunCreateResponse.status}.`);
            throw new Error('Unable to create test run');
        }
        const runId = testRunCreateResponse.data.runId;
        this.logger.info(`Test Run ${runId} initialized`);
        const heartbeatService = new TestRunHeartbeatService(runId, this.autoApi, this.logger);
        await heartbeatService.start();
        return new RunReporter(this.autoApi, runId, heartbeatService, this.logger);
    }
}
/**
 * Handles reporting test results to the Applause API.
 */
class RunReporter {
    autoApi;
    testRunId;
    heartbeatService;
    uidToResultIdMap = {};
    resultSubmissionMap = {};
    logger;
    /**
     * Creates a new instance of the Reporter class.
     * @param autoApi - The AutoApi instance.
     * @param testRunId - The ID of the test run.
     * @param heartbeatService - (Optional) The TestRunHeartbeatService instance.
     */
    constructor(autoApi, testRunId, heartbeatService, logger) {
        this.autoApi = autoApi;
        this.testRunId = testRunId;
        this.heartbeatService = heartbeatService;
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
    startTestCase(id, testCaseName, params) {
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
            ...Object.fromEntries(Object.entries(params || {}).filter(params => params[1] !== undefined)),
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
    submitTestCaseResult(id, status, params) {
        const submission = this.uidToResultIdMap[id]?.then(resultId => this.autoApi
            .submitTestCaseResult({
            status: status,
            testResultId: resultId,
            ...params,
        })
            .then(() => resultId));
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
    async attachTestCaseAsset(id, assetName, providerSessionGuid, assetType, asset) {
        await this.uidToResultIdMap[id]?.then(resultId => this.autoApi.uploadAsset(resultId, asset, assetName, providerSessionGuid, assetType));
    }
    /**
     * Ends the test runner and performs necessary cleanup tasks.
     * @returns A promise that resolves when the runner has ended.
     */
    async runnerEnd() {
        // Wait for all results to be created
        const resultIds = (await Promise.all(Object.values(this.uidToResultIdMap))) ?? [];
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
            writeFileSync(join(outputPath, 'providerUrls.txt'), JSON.stringify(jsonArray, null, 1));
        }
    }
}

var TestRunAutoResultStatus;
(function (TestRunAutoResultStatus) {
    TestRunAutoResultStatus["PASSED"] = "PASSED";
    TestRunAutoResultStatus["FAILED"] = "FAILED";
    TestRunAutoResultStatus["SKIPPED"] = "SKIPPED";
    TestRunAutoResultStatus["CANCELED"] = "CANCELED";
    TestRunAutoResultStatus["ERROR"] = "ERROR";
})(TestRunAutoResultStatus || (TestRunAutoResultStatus = {}));

const validator = Validator.default;
const DEFAULT_URL = 'https://api.applause.com/';
const DEFAULT_PUBLIC_API_PROPERTIES = {
    publicApiBaseUrl: DEFAULT_URL,
};
function isPublicApiConfigComplete(config) {
    return (config.publicApiBaseUrl !== undefined &&
        config.apiKey !== undefined &&
        config.productId !== undefined);
}
function validatePublicApiConfig(config) {
    if (!Number.isInteger(config.productId) || config.productId <= 0) {
        throw new Error(`productId must be a positive integer, was: '${config.productId}'`);
    }
    if (!validator.isURL(config.publicApiBaseUrl, {
        protocols: ['http', 'https'],
        require_tld: false, // allow localhost
        allow_query_components: false,
        disallow_auth: true,
        allow_fragments: false,
        allow_protocol_relative_urls: false,
        allow_trailing_dot: false,
        require_host: true,
        require_protocol: true,
    })) {
        throw new Error(`publicApiBaseUrl is not valid HTTP/HTTPS URL, was: ${config.publicApiBaseUrl}`);
    }
    if (validator.isEmpty(config.apiKey)) {
        throw new Error('apiKey is an empty string!');
    }
}

class PublicApi {
    options;
    client;
    callsInFlight;
    logger;
    /**
     * tracks number of HTTP calls in progress, used by reporters that want to know when our async work is finished
     */
    get getCallsInFlight() {
        return this.callsInFlight;
    }
    constructor(options, logger) {
        this.options = options;
        this.callsInFlight = 0;
        this.logger = logger ?? constructDefaultLogger();
        validatePublicApiConfig(options);
        this.client = axios.create({
            baseURL: options.publicApiBaseUrl,
            timeout: 10000,
            headers: {
                'X-Api-Key': options.apiKey,
                'Context-Type': 'application/json',
            },
            responseType: 'json',
        });
        this.client.interceptors.response.use(function (response) {
            return response;
        }, (error) => {
            // log and rethrow
            const errText = error.response?.data !== undefined
                ? JSON.stringify(error.response.data)
                : `error-code [${error.response?.status}] with error [${error.response?.statusText}]`;
            this.logger.error(`Public-Api returned ${errText}`);
            return Promise.reject(error);
        });
    }
    async submitResult(testCaseId, info) {
        this.callsInFlight += 1;
        try {
            return await this.client.post(`v2/test-case-results/${testCaseId}/submit`, info);
        }
        finally {
            this.callsInFlight -= 1;
        }
    }
}

/**
 * Represents the configuration options for the Applause Reporter.
 */
/**
 * Loads the configuration for the Applause Reporter.
 * @param loadOptions - The options for loading the configuration.
 * @returns The loaded Applause configuration.
 * @throws Error if the configuration is not complete or invalid.
 */
function loadConfig(loadOptions) {
    // Setup the initial config with any default properties
    let config = {
        ...DEFAULT_PUBLIC_API_PROPERTIES,
        ...DEFAULT_AUTO_API_PROPERTIES,
    };
    // Load properties from the provided config file
    if (loadOptions !== undefined && loadOptions.configFile !== undefined) {
        config = overrideConfig(config, loadConfigFromFile(path.join(process.cwd(), loadOptions.configFile)));
    }
    else {
        // Override from the default config file
        config = overrideConfig(config, loadConfigFromFile());
    }
    // Then load in the file override properties
    if (loadOptions !== undefined && loadOptions.properties !== undefined) {
        config = overrideConfig(config, loadOptions.properties);
    }
    if (!isComplete(config)) {
        throw new Error('Config is not complete');
    }
    // We know that the config is complete, so we can cast
    const finalConfig = config;
    validateConfig(finalConfig);
    return finalConfig;
}
/**
 * Overrides the configuration with the provided overrides.
 * @param config - The base configuration.
 * @param overrides - The overrides to apply.
 * @returns The overridden configuration.
 */
function overrideConfig(config, overrides) {
    return Object.assign({}, config, Object.fromEntries(Object.entries(overrides ?? {}).filter(params => params[1] !== undefined)));
}
/**
 * Checks if the configuration is complete.
 * @param config - The configuration to check.
 * @returns True if the configuration is complete, false otherwise.
 */
function isComplete(config) {
    return isAutoApiConfigComplete(config) && isPublicApiConfigComplete(config);
}
/**
 * Loads the configuration from the specified file.
 * @param configFile - The path to the configuration file.
 * @returns The loaded configuration from the file.
 */
function loadConfigFromFile(configFile) {
    const configFilePath = configFile ?? `${process.cwd()}/applause.json`;
    if (!existsSync(configFilePath)) {
        return {};
    }
    const fileContents = readFileSync(configFilePath, 'utf8');
    return JSON.parse(fileContents);
}
/**
 * Validates the configuration.
 * @param config - The configuration to validate.
 * @throws Error if the configuration is invalid.
 */
function validateConfig(config) {
    validateAutoApiConfig(config);
    validatePublicApiConfig(config);
}
/**
 * Validates a partial configuration.
 * @param config - The partial configuration to validate.
 * @throws Error if the partial configuration is invalid.
 */
function validatePartialConfig(config) {
    if (config.productId !== undefined &&
        (!Number.isInteger(config.productId) || config.productId <= 0)) {
        throw new Error(`productId must be a positive integer, was: '${config.productId}'`);
    }
}

export { APPLAUSE_CASE_ID_PREFIX, APPLAUSE_LOG_RECORDS, ApplauseReporter, ApplauseTransport, AssetType, AutoApi, EmailHelper, Inbox, LoggingContainer, PublicApi, RunInitializer, RunReporter, TEST_RAIL_CASE_ID_PREFIX, TestResultStatus, TestRunAutoResultStatus, TestRunHeartbeatService, WINSTON_DEFAULT_LOG_FORMAT, constructDefaultLogger, isComplete, loadConfig, loadConfigFromFile, overrideConfig, parseTestCaseName, validateConfig, validatePartialConfig };
//# sourceMappingURL=index.mjs.map
