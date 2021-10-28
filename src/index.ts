import axios, { AxiosInstance, AxiosResponse } from 'axios';
import {
  CreateTestResultDto,
  TestResultParamDto,
  TestResultProviderInfo,
  TestResultStatus,
} from './dto';
import validator from 'validator';

export type ClientConfig = {
  readonly baseUrl: string;
  readonly apiKey: string;
};

export class AutoApi {
  private readonly client: AxiosInstance;

  private callsInFlight: number;
  /**
   * tracks number of HTTP calls in progress, used by reporters that want to know when our async work is finished
   */
  public get getCallsInFlight(): number {
    return this.callsInFlight;
  }

  constructor(
    private readonly options: {
      readonly clientConfig: ClientConfig | AxiosInstance;
      readonly productId: number;
      readonly groupingName?: string;
    }
  ) {
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

  async startTestCase(
    testCaseName: string,
    providerSessionId?: string
  ): Promise<AxiosResponse<CreateTestResultDto>> {
    this.callsInFlight += 1;
    try {
      if (
        this.options.groupingName !== undefined &&
        providerSessionId !== undefined
      ) {
        throw new Error(
          `Provider either groupingName in constructor or providerSessionId in each test start, not both!  Values provided: { providerSessionId: "${providerSessionId}\n ", groupingName: "${this.options.groupingName}" }`
        );
      }
      const res = await this.client.post<CreateTestResultDto>(
        '/api/v1.0/test-result/create-ps-result',
        {
          testCaseName: testCaseName,
          productId: this.options.productId,
          groupingName:
            this.options.groupingName === undefined
              ? null
              : this.options.groupingName,
          providerSessionId:
            providerSessionId === undefined ? null : providerSessionId,
        }
      );
      return res;
    } finally {
      this.callsInFlight -= 1;
    }
  }

  async submitTestResult(
    resultId: number,
    status: TestResultStatus,
    failureReason?: string
  ): Promise<void> {
    this.callsInFlight += 1;
    try {
      const dto: TestResultParamDto = {
        testResultId: resultId,
        status: status,
        failureReason: failureReason,
      };
      await this.client.post('/api/v1.0/test-result/submit-ps-result', dto);
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

// Re-export DTOs
export * from './dto';
