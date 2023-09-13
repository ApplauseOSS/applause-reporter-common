import axios, { AxiosInstance, AxiosResponse } from 'axios';
import {
  ApplauseConfig,
  ClientConfig,
  CreateTestCaseResultDto,
  CreateTestCaseResultResponseDto,
  SubmitTestCaseResultDto,
  TestResultProviderInfo,
  TestRunCreateDto,
  TestRunCreateResponseDto,
} from './dto.ts';
import { API_VERSION } from './version.ts';
import Validator from 'validator';
const validator = Validator.default;

export class AutoApi {
  private readonly client: AxiosInstance;

  private callsInFlight: number;
  /**
   * tracks number of HTTP calls in progress, used by reporters that want to know when our async work is finished
   */
  public get getCallsInFlight(): number {
    return this.callsInFlight;
  }

  constructor(readonly options: ApplauseConfig) {
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

  async startTestRun(
    info: TestRunCreateDto
  ): Promise<AxiosResponse<TestRunCreateResponseDto>> {
    this.callsInFlight += 1;
    try {
      return await this.client.post<TestRunCreateResponseDto>(
        '/api/v1.0/test-run/create',
        {
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
          overrideTestRailRunNameUniqueness:
            this.options.testRailOptions?.overrideTestRailRunUniqueness,
        }
      );
    } finally {
      this.callsInFlight -= 1;
    }
  }

  async endTestRun(testRunId: number): Promise<AxiosResponse<void>> {
    this.callsInFlight += 1;
    try {
      return await this.client.delete<void>(
        `/api/v3.0/driver-session/${testRunId}?sessionStatus=COMPLETE`
      );
    } finally {
      this.callsInFlight -= 1;
    }
  }

  async startTestCase(
    params: CreateTestCaseResultDto
  ): Promise<AxiosResponse<CreateTestCaseResultResponseDto>> {
    this.callsInFlight += 1;
    try {
      const res = await this.client.post<CreateTestCaseResultResponseDto>(
        '/api/v1.0/test-result/create-result',
        params
      );
      return res;
    } finally {
      this.callsInFlight -= 1;
    }
  }

  async submitTestCaseResult(params: SubmitTestCaseResultDto): Promise<void> {
    this.callsInFlight += 1;
    try {
      await this.client.post('/api/v1.0/test-result', params);
    } finally {
      this.callsInFlight -= 1;
    }
  }

  async getProviderSessionLinks(
    resultIds: number[]
  ): Promise<AxiosResponse<TestResultProviderInfo[]>> {
    this.callsInFlight += 1;
    try {
      // this filters out falsy values (null, undefined, 0)
      const validIds: number[] = resultIds.filter(id => id);
      return await this.client.post<TestResultProviderInfo[]>(
        '/api/v1.0/test-result/provider-info',
        validIds
      );
    } finally {
      this.callsInFlight -= 1;
    }
  }

  async sendSdkHeartbeat(testRunId: number): Promise<AxiosResponse<void>> {
    this.callsInFlight += 1;
    try {
      // this filters out falsy values (null, undefined, 0)
      return await this.client.post<void>(
        `/api/v2.0/sdk-heartbeat?testRunId=${testRunId}`
      );
    } finally {
      this.callsInFlight -= 1;
    }
  }
}

/**
 *
 * @param clientConfig user defined type check to see if we were passed an already built AxoisIntance or regular ClientConfig
 */
const _isAxiosInstance = (
  clientConfig: ClientConfig | AxiosInstance
): clientConfig is AxiosInstance => {
  // we check for property "request" to see if client config object is an Axois instance or regular ClientConfig
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  return (clientConfig as AxiosInstance).request !== undefined;
};

/**
 * Exposed for testing. Don't use this!
 * @private
 *
 * @param params mirrored constructor args from AutoApi class
 */
export const _validateCtorParams = (
  ...params: ConstructorParameters<typeof AutoApi>
): void => {
  // product ID sanity
  if (!Number.isInteger(params[0].productId) || params[0].productId <= 0) {
    throw new Error(
      `productId must be a positive integer, was: '${params[0].productId}'`
    );
  }
  // check for specific options if pre-built client wasn't passed
  if (!_isAxiosInstance(params[0].clientConfig)) {
    // Base URL sanity
    if (
      !validator.isURL(params[0].clientConfig.baseUrl, {
        protocols: ['http', 'https'],
        require_tld: false, // allow localhost
        require_host: true,
        require_protocol: true,
      })
    ) {
      throw new Error(
        `baseUrl is not valid HTTP/HTTPS URL, was: ${params[0].clientConfig.baseUrl}`
      );
    }
    // API Key sanity
    if (validator.isEmpty(params[0].clientConfig.apiKey)) {
      throw new Error('apiKey is an empty string!');
    }
  }
};
