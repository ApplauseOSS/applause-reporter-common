'use strict';

var axios = require('axios');
var fs = require('fs');
var path = require('path');
var Validator = require('validator');
var queryString = require('querystring');
var mailparser = require('mailparser');

function _interopNamespaceDefault(e) {
    var n = Object.create(null);
    if (e) {
        Object.keys(e).forEach(function (k) {
            if (k !== 'default') {
                var d = Object.getOwnPropertyDescriptor(e, k);
                Object.defineProperty(n, k, d.get ? d : {
                    enumerable: true,
                    get: function () { return e[k]; }
                });
            }
        });
    }
    n.default = e;
    return Object.freeze(n);
}

var queryString__namespace = /*#__PURE__*/_interopNamespaceDefault(queryString);

const API_VERSION = '1.0.0';

const validator = Validator.default;
const DEFAULT_URL = 'https://prod-auto-api.cloud.applause.com/';
// Loads the configuration
function loadConfig(loadOptions) {
    // Setup the initial config with any default properties
    let config = {
        baseUrl: DEFAULT_URL,
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
function overrideConfig(config, overrides) {
    return Object.assign({}, config, Object.fromEntries(Object.entries(overrides || {}).filter(([_, v]) => v !== undefined)));
}
function isComplete(config) {
    return (config.baseUrl !== undefined &&
        config.apiKey !== undefined &&
        config.productId !== undefined);
}
function loadConfigFromFile(configFile) {
    const configFilePath = configFile || process.cwd() + '/applause.json';
    if (!fs.existsSync(configFilePath)) {
        return {};
    }
    const fileCotents = fs.readFileSync(configFilePath, 'utf8');
    return JSON.parse(fileCotents);
}
function validateConfig(config) {
    if (!Number.isInteger(config.productId) || config.productId <= 0) {
        throw new Error(`productId must be a positive integer, was: '${config.productId}'`);
    }
    if (!validator.isURL(config.baseUrl, {
        protocols: ['http', 'https'],
        require_tld: false,
        allow_query_components: false,
        disallow_auth: true,
        allow_fragments: false,
        allow_protocol_relative_urls: false,
        allow_trailing_dot: false,
        require_host: true,
        require_protocol: true,
    })) {
        throw new Error(`baseUrl is not valid HTTP/HTTPS URL, was: ${config.baseUrl}`);
    }
    if (validator.isEmpty(config.apiKey)) {
        throw new Error('apiKey is an empty string!');
    }
}
function validatePartialConfig(config) {
    if (config.productId !== undefined &&
        (!Number.isInteger(config.productId) || config.productId <= 0)) {
        throw new Error(`productId must be a positive integer, was: '${config.productId}'`);
    }
}

class AutoApi {
    options;
    client;
    callsInFlight;
    /**
     * tracks number of HTTP calls in progress, used by reporters that want to know when our async work is finished
     */
    get getCallsInFlight() {
        return this.callsInFlight;
    }
    constructor(options) {
        this.options = options;
        this.callsInFlight = 0;
        validateConfig(options);
        this.client = axios.create({
            baseURL: options.baseUrl,
            timeout: 10000,
            headers: {
                'X-Api-Key': options.apiKey,
                'Context-Type': 'application/json',
            },
            responseType: 'json',
        });
    }
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
    async endTestRun(testRunId) {
        this.callsInFlight += 1;
        try {
            return await this.client.delete(`/api/v1.0/test-run/${testRunId}?endingStatus=COMPLETE`);
        }
        finally {
            this.callsInFlight -= 1;
        }
    }
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
    async submitTestCaseResult(params) {
        this.callsInFlight += 1;
        try {
            await this.client.post('/api/v1.0/test-result', params);
        }
        finally {
            this.callsInFlight -= 1;
        }
    }
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
    async sendSdkHeartbeat(testRunId) {
        this.callsInFlight += 1;
        try {
            // this filters out falsy values (null, undefined, 0)
            return await this.client.post('/api/v2.0/sdk-heartbeat', queryString__namespace.stringify({ testRunId: testRunId }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
        }
        finally {
            this.callsInFlight -= 1;
        }
    }
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
}

/**
 * Enum representing a test result's status
 */
exports.TestResultStatus = void 0;
(function (TestResultStatus) {
    TestResultStatus["NOT_RUN"] = "NOT_RUN";
    TestResultStatus["IN_PROGRESS"] = "IN_PROGRESS";
    TestResultStatus["PASSED"] = "PASSED";
    TestResultStatus["FAILED"] = "FAILED";
    TestResultStatus["SKIPPED"] = "SKIPPED";
    TestResultStatus["CANCELED"] = "CANCELED";
    TestResultStatus["ERROR"] = "ERROR";
})(exports.TestResultStatus || (exports.TestResultStatus = {}));

class Inbox {
    emailAddress;
    autoApi;
    constructor(emailAddress, autoApi) {
        this.emailAddress = emailAddress;
        this.autoApi = autoApi;
    }
    async getEmail() {
        const res = await this.autoApi.getEmailContent({
            emailAddress: this.emailAddress,
        });
        return await mailparser.simpleParser(res.data);
    }
}

class EmailHelper {
    autoApi;
    constructor(autoApi) {
        this.autoApi = autoApi;
    }
    async getInbox(emailPrefix) {
        const generatedAddress = (await this.autoApi.getEmailAddress(emailPrefix)).data.emailAddress;
        return new Inbox(generatedAddress, this.autoApi);
    }
}

class TestRunHeartbeatService {
    testRunId;
    autoApi;
    enabled = false;
    nextHeartbeat;
    constructor(testRunId, autoApi) {
        this.testRunId = testRunId;
        this.autoApi = autoApi;
    }
    async start() {
        // End the current heartbeat if it has started
        await this.end();
        // Set up va new interval
        this.enabled = true;
        this.scheduleNextHeartbeat();
    }
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
        console.log('Sending heartbeat');
        await this.autoApi.sendSdkHeartbeat(this.testRunId);
        console.log('Heartbeat sent');
        this.scheduleNextHeartbeat();
    }
    async end() {
        if (this.nextHeartbeat !== undefined) {
            this.enabled = false;
            console.debug('Ending Applause SDK Heartbeat');
            await this.nextHeartbeat;
            console.debug('Applause SDK Heartbeat Ended Successfully');
        }
        this.nextHeartbeat = undefined;
    }
}

class ApplauseReporter {
    autoApi;
    initializer;
    reporter;
    runStarted = false;
    runFinished = false;
    constructor(config) {
        this.autoApi = new AutoApi(config);
        this.initializer = new RunInitializer(this.autoApi);
    }
    runnerStart(tests) {
        this.reporter = this.initializer.initializeRun(tests);
        void this.reporter.then(() => {
            this.runStarted = true;
        });
    }
    startTestCase(id, testCaseName, params) {
        if (this.reporter === undefined) {
            throw new Error('Cannot start a test case for a run that was never initialized');
        }
        void this.reporter.then(reporter => reporter.startTestCase(id, testCaseName, params));
    }
    submitTestCaseResult(id, status, params) {
        if (this.reporter === undefined) {
            throw new Error('Cannot submit test case result for a run that was never initialized');
        }
        void this.reporter.then(reporter => reporter.submitTestCaseResult(id, status, params));
    }
    async runnerEnd() {
        if (this.reporter === undefined) {
            throw new Error('Cannot end a run that was never initialized');
        }
        await this.reporter
            .then(reporter => reporter.runnerEnd())
            .then(() => (this.runFinished = true));
    }
    isSynchronized() {
        // Verify the run is not yet started or it has ended, and all calls made to the applause api have finished
        return ((!this.runStarted || (this.runStarted && this.runFinished)) &&
            this.autoApi.getCallsInFlight == 0);
    }
}
class RunInitializer {
    autoApi;
    constructor(autoApi) {
        this.autoApi = autoApi;
    }
    async initializeRun(tests) {
        const cleanedTests = tests
            ?.map(parseTestCaseName)
            .map(parsed => parsed.testCaseName.trim());
        const testRunCreateResponse = await this.autoApi.startTestRun({
            tests: cleanedTests || [],
        });
        if (testRunCreateResponse.status < 200 ||
            testRunCreateResponse.status > 300) {
            throw new Error('Unable to create test run');
        }
        const runId = testRunCreateResponse.data.runId;
        console.log('Test Run %d initialized', runId);
        const heartbeatService = new TestRunHeartbeatService(runId, this.autoApi);
        await heartbeatService.start();
        return new RunReporter(this.autoApi, runId, heartbeatService);
    }
}
class RunReporter {
    autoApi;
    testRunId;
    heartbeatService;
    uidToResultIdMap = {};
    resultSubmissionMap = {};
    constructor(autoApi, testRunId, heartbeatService) {
        this.autoApi = autoApi;
        this.testRunId = testRunId;
        this.heartbeatService = heartbeatService;
    }
    startTestCase(id, testCaseName, params) {
        const parsedTestCase = parseTestCaseName(testCaseName);
        this.uidToResultIdMap[id] = this.autoApi
            .startTestCase({
            testCaseName: parsedTestCase.testCaseName,
            testCaseId: parsedTestCase.testRailTestCaseId,
            itwTestCaseId: parsedTestCase.applauseTestCaseId,
            testRunId: this.testRunId,
            // If the additional params provides either test case id, it will override the parsed value we set above
            ...Object.fromEntries(Object.entries(params || {}).filter(([_, v]) => v !== undefined)),
        })
            .then(res => {
            return res.data.testResultId;
        });
    }
    submitTestCaseResult(id, status, params) {
        this.resultSubmissionMap[id] = this.uidToResultIdMap[id]?.then(resultId => this.autoApi.submitTestCaseResult({
            status: status,
            testResultId: resultId,
            ...params,
        }));
    }
    async runnerEnd() {
        // Wait for all results to be created
        const resultIds = (await Promise.all(Object.values(this.uidToResultIdMap))) || [];
        // Wait for the results to be submitted
        void (await Promise.all(Object.values(this.resultSubmissionMap)));
        // Wait the heartbeat to be ended
        void (await this.heartbeatService.end());
        void (await this.autoApi.endTestRun(this.testRunId));
        // Fetch the provider session asset links and save them off to a file
        const resp = await this.autoApi.getProviderSessionLinks(resultIds);
        const jsonArray = resp.data || [];
        if (jsonArray.length > 0) {
            console.info(JSON.stringify(jsonArray));
            // this is the wdio.conf outputDir
            const outputPath = '.';
            fs.writeFileSync(path.join(outputPath, 'providerUrls.txt'), JSON.stringify(jsonArray, null, 1));
        }
    }
}
const TEST_RAIL_CASE_ID_PREFIX = 'TestRail-';
const APPLAUSE_CASE_ID_PREFIX = 'Applause-';
function parseTestCaseName(testCaseName) {
    // Split the name on spaces. We will reassemble after parsing out the other ids
    const tokens = testCaseName.split(' ');
    let testRailTestCaseId;
    let applauseTestCaseId;
    tokens.forEach(token => {
        if (token?.startsWith(TEST_RAIL_CASE_ID_PREFIX)) {
            if (testRailTestCaseId !== undefined) {
                console.warn('Multiple TestRail case ids detected in testCase name');
            }
            testRailTestCaseId = token.substring(TEST_RAIL_CASE_ID_PREFIX.length);
        }
        else if (token?.startsWith(APPLAUSE_CASE_ID_PREFIX)) {
            if (applauseTestCaseId !== undefined) {
                console.warn('Multiple Applause case ids detected in testCase name');
            }
            applauseTestCaseId = token.substring(APPLAUSE_CASE_ID_PREFIX.length);
        }
    });
    return {
        applauseTestCaseId,
        testRailTestCaseId,
        testCaseName: tokens
            .filter(token => token !== `${TEST_RAIL_CASE_ID_PREFIX}${testRailTestCaseId || ''}`)
            .filter(token => token !== `${APPLAUSE_CASE_ID_PREFIX}${applauseTestCaseId || ''}`)
            .join(' ')
            .trim(),
    };
}

exports.ApplauseReporter = ApplauseReporter;
exports.AutoApi = AutoApi;
exports.DEFAULT_URL = DEFAULT_URL;
exports.EmailHelper = EmailHelper;
exports.Inbox = Inbox;
exports.RunInitializer = RunInitializer;
exports.RunReporter = RunReporter;
exports.TestRunHeartbeatService = TestRunHeartbeatService;
exports.isComplete = isComplete;
exports.loadConfig = loadConfig;
exports.loadConfigFromFile = loadConfigFromFile;
exports.overrideConfig = overrideConfig;
exports.validateConfig = validateConfig;
exports.validatePartialConfig = validatePartialConfig;
//# sourceMappingURL=index.cjs.map
