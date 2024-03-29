import axios, { AxiosInstance, AxiosResponse } from 'axios';
import {
  CreateTestCaseResultDto,
  CreateTestCaseResultResponseDto,
  EmailAddressResponse,
  EmailFetchRequest,
  SubmitTestCaseResultDto,
  TestResultProviderInfo,
  TestRunCreateDto,
  TestRunCreateResponseDto,
} from './dto.ts';
import { API_VERSION } from './version.ts';
import { ApplauseConfig, validateConfig } from './config.ts';

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
    this.client.interceptors.response.use(
      function (response: AxiosResponse<any, any>) {
        return response;
      },
      function (error) {
        // log and rethrow
        const errText =
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          error.data !== undefined
            ? // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              error.data
            : // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              `error-code [${error.response.status}] with error [${error.response.statusText}]`;
        console.error(`Auto-Api returned ${errText}`);
        return Promise.reject(error);
      }
    );
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
        `/api/v1.0/test-run/${testRunId}?endingStatus=COMPLETE`
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
      return await this.client.post<void>('/api/v2.0/sdk-heartbeat', {
        testRunId: testRunId,
      });
    } finally {
      this.callsInFlight -= 1;
    }
  }

  async getEmailAddress(
    emailPrefix: string
  ): Promise<AxiosResponse<EmailAddressResponse>> {
    this.callsInFlight += 1;
    try {
      // this filters out falsy values (null, undefined, 0)
      return await this.client.get<EmailAddressResponse>(
        `/api/v1.0/email/get-address?prefix=${emailPrefix}`
      );
    } finally {
      this.callsInFlight -= 1;
    }
  }

  async getEmailContent(
    request: EmailFetchRequest
  ): Promise<AxiosResponse<Buffer>> {
    this.callsInFlight += 1;
    try {
      // this filters out falsy values (null, undefined, 0)
      return await this.client.post<Buffer>(
        '/api/v1.0/email/download-email',
        request
      );
    } finally {
      this.callsInFlight -= 1;
    }
  }
}
