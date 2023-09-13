'use strict';

var axios = require('axios');
var Validator = require('validator');
var fs = require('fs');
var path = require('path');

const API_VERSION = '1.0.0';

const validator = Validator.default;
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
        _validateCtorParams(options);
        this.client = _isAxiosInstance(options.clientConfig)
            ? options.clientConfig
            : axios.create({
                baseURL: options.clientConfig.baseUrl,
                timeout: 10000,
                headers: {
                    'X-Api-Key': options.clientConfig.apiKey,
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
            return await this.client.delete(`/api/v3.0/driver-session/${testRunId}?sessionStatus=COMPLETE`);
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
            return await this.client.post(`/api/v2.0/sdk-heartbeat?testRunId=${testRunId}`);
        }
        finally {
            this.callsInFlight -= 1;
        }
    }
}
/**
 *
 * @param clientConfig user defined type check to see if we were passed an already built AxoisIntance or regular ClientConfig
 */
const _isAxiosInstance = (clientConfig) => {
    // we check for property "request" to see if client config object is an Axois instance or regular ClientConfig
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return clientConfig.request !== undefined;
};
/**
 * Exposed for testing. Don't use this!
 * @private
 *
 * @param params mirrored constructor args from AutoApi class
 */
const _validateCtorParams = (...params) => {
    // product ID sanity
    if (!Number.isInteger(params[0].productId) || params[0].productId <= 0) {
        throw new Error(`productId must be a positive integer, was: '${params[0].productId}'`);
    }
    // check for specific options if pre-built client wasn't passed
    if (!_isAxiosInstance(params[0].clientConfig)) {
        // Base URL sanity
        if (!validator.isURL(params[0].clientConfig.baseUrl, {
            protocols: ['http', 'https'],
            require_tld: false,
            require_host: true,
            require_protocol: true,
        })) {
            throw new Error(`baseUrl is not valid HTTP/HTTPS URL, was: ${params[0].clientConfig.baseUrl}`);
        }
        // API Key sanity
        if (validator.isEmpty(params[0].clientConfig.apiKey)) {
            throw new Error('apiKey is an empty string!');
        }
    }
};

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
    constructor(config) {
        this.autoApi = new AutoApi(config);
        this.initializer = new RunInitializer(this.autoApi);
    }
    runnerStart(tests) {
        this.reporter = this.initializer.initializeRun(tests);
    }
    startTestCase(id, testCaseName) {
        if (this.reporter === undefined) {
            throw new Error('Cannot start a test case for a run that was never initialized');
        }
        void this.reporter.then(reporter => reporter.startTestCase(id, testCaseName));
    }
    submitTestCaseResult(id, status, errorMessage) {
        if (this.reporter === undefined) {
            throw new Error('Cannot submit test case result for a run that was never initialized');
        }
        void this.reporter.then(reporter => reporter.submitTestCaseResult(id, status, errorMessage));
    }
    async runnerEnd() {
        if (this.reporter === undefined) {
            throw new Error('Cannot end a run that was never initialized');
        }
        await this.reporter.then(reporter => reporter.runnerEnd());
    }
}
class RunInitializer {
    autoApi;
    constructor(autoApi) {
        this.autoApi = autoApi;
    }
    async initializeRun(tests) {
        const testRunCreateResponse = await this.autoApi.startTestRun({
            tests: tests || [],
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
    TEST_RAIL_CASE_ID_PREFIX = 'TestRail-';
    APPLAUSE_CASE_ID_PREFIX = 'Applause-';
    uidToResultIdMap = {};
    resultSubmissionMap = {};
    constructor(autoApi, testRunId, heartbeatService) {
        this.autoApi = autoApi;
        this.testRunId = testRunId;
        this.heartbeatService = heartbeatService;
    }
    startTestCase(id, testCaseName) {
        const parsedTestCase = this.parseTestCaseName(testCaseName);
        this.uidToResultIdMap[id] = this.autoApi
            .startTestCase({
            testCaseName: parsedTestCase.testCaseName,
            testCaseId: parsedTestCase.testRailTestCaseId,
            testRunId: this.testRunId,
            providerSessionIds: [],
        })
            .then(res => {
            return res.data.testResultId;
        });
    }
    submitTestCaseResult(id, status, errorMessage) {
        this.resultSubmissionMap[id] = this.uidToResultIdMap[id]?.then(resultId => this.autoApi.submitTestCaseResult({
            status: status,
            testResultId: resultId,
            failureReason: errorMessage,
        }));
    }
    parseTestCaseName(testCaseName) {
        // Split the name on spaces. We will reassemble after parsing out the other ids
        const tokens = testCaseName.split(' ');
        let testRailTestCaseId;
        let applauseTestCaseId;
        tokens.forEach(token => {
            if (token?.startsWith(this.TEST_RAIL_CASE_ID_PREFIX)) {
                if (testRailTestCaseId !== undefined) {
                    console.warn('Multiple TestRail case ids detected in testCase name');
                }
                testRailTestCaseId = token.substring(this.TEST_RAIL_CASE_ID_PREFIX.length);
            }
            else if (token?.startsWith(this.APPLAUSE_CASE_ID_PREFIX)) {
                if (applauseTestCaseId !== undefined) {
                    console.warn('Multiple Applause case ids detected in testCase name');
                }
                applauseTestCaseId = token.substring(this.APPLAUSE_CASE_ID_PREFIX.length);
            }
        });
        return {
            applauseTestCaseId,
            testRailTestCaseId,
            testCaseName: tokens
                .filter(token => token !==
                `${this.TEST_RAIL_CASE_ID_PREFIX}${testRailTestCaseId || ''}`)
                .filter(token => token !==
                `${this.APPLAUSE_CASE_ID_PREFIX}${applauseTestCaseId || ''}`)
                .join(' '),
        };
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

exports.ApplauseReporter = ApplauseReporter;
exports.AutoApi = AutoApi;
exports.TestRunHeartbeatService = TestRunHeartbeatService;
exports._validateCtorParams = _validateCtorParams;
//# sourceMappingURL=index.js.map
