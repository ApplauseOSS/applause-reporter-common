'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var axios = require('axios');
var validator = require('validator');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var axios__default = /*#__PURE__*/_interopDefaultLegacy(axios);
var validator__default = /*#__PURE__*/_interopDefaultLegacy(validator);

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

class AutoApi {
    constructor(options) {
        this.options = options;
        this.callsInFlight = 0;
        _validateCtorParams(options);
        this.client = _isAxiosInstance(options.clientConfig)
            ? options.clientConfig
            : axios__default['default'].create({
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
    async startTestCase(testCaseName, providerSessionId, itwTestCaseId) {
        this.callsInFlight += 1;
        try {
            if (this.options.groupingName !== undefined &&
                providerSessionId !== undefined) {
                throw new Error(`Provider either groupingName in constructor or providerSessionId in each test start, not both!  Values provided: { providerSessionId: "${providerSessionId}\n ", groupingName: "${this.options.groupingName}" }`);
            }
            const res = await this.client.post('/api/v1.0/test-result/create-ps-result', {
                testCaseName: testCaseName,
                productId: this.options.productId,
                itwTestCaseId,
                groupingName: this.options.groupingName === undefined
                    ? null
                    : this.options.groupingName,
                providerSessionId: providerSessionId === undefined ? null : providerSessionId,
            });
            return res;
        }
        finally {
            this.callsInFlight -= 1;
        }
    }
    async submitTestResult(resultId, status, failureReason) {
        this.callsInFlight += 1;
        try {
            const dto = {
                testResultId: resultId,
                status: status,
                failureReason: failureReason,
            };
            await this.client.post('/api/v1.0/test-result/submit-ps-result', dto);
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
        if (!validator__default['default'].isURL(params[0].clientConfig.baseUrl, {
            protocols: ['http', 'https'],
            require_tld: false,
            require_host: true,
            require_protocol: true,
        })) {
            throw new Error(`baseUrl is not valid HTTP/HTTPS URL, was: ${params[0].clientConfig.baseUrl}`);
        }
        // API Key sanity
        if (validator__default['default'].isEmpty(params[0].clientConfig.apiKey)) {
            throw new Error('apiKey is an empty string!');
        }
    }
};

exports.AutoApi = AutoApi;
exports._validateCtorParams = _validateCtorParams;
//# sourceMappingURL=index.js.map
