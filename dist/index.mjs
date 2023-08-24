import axios from 'axios';
import validator from 'validator';

const API_VERSION = '1.0.0';

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

class AutoApi {
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
    /**
     * tracks number of HTTP calls in progress, used by reporters that want to know when our async work is finished
     */
    get getCallsInFlight() {
        return this.callsInFlight;
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
    async submitTestResult(params) {
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

export { AutoApi, TestResultStatus, _validateCtorParams };
//# sourceMappingURL=index.mjs.map
