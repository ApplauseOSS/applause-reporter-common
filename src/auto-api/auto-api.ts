/**
 * This file contains the implementation of the `AutoApi` class, which is responsible for making API calls to interact with the Applause platform.
 * The `AutoApi` class provides methods for starting and ending test runs, creating test cases, submitting test case results, and performing other operations related to test management.
 * It also includes properties and methods to track the number of HTTP calls in progress.
 */

import axios, { AxiosError, AxiosInstance, AxiosResponse } from 'axios';
import {
  AssetType,
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
import { AutoApiConfig, validateAutoApiConfig } from './auto-api-config.ts';
import { constructDefaultLogger } from '../shared/logging.ts';
import * as winston from 'winston';

export class AutoApi {
  private readonly client: AxiosInstance;

  private logger: winston.Logger;
  private callsInFlight: number;
  /**
   * Tracks the number of HTTP calls in progress.
   * This property is used by reporters that want to know when the async work is finished.
   */
  public get getCallsInFlight(): number {
    return this.callsInFlight;
  }

  /**
   * Creates an instance of the `AutoApi` class.
   * @param options - The configuration options for the Applause API.
   */
  constructor(
    readonly options: AutoApiConfig,
    logger?: winston.Logger
  ) {
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

    this.client.interceptors.response.use(
      function (response: AxiosResponse<unknown, unknown>) {
        return response;
      },
      (error: AxiosError) => {
        // log and rethrow
        const errText =
           
          error.response?.data !== undefined
            ? JSON.stringify(error.response.data)
            : `error-code [${error.response?.status}] with error [${error.response?.statusText}]`;
        this.logger.error(`Auto-Api returned ${errText}`);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Starts a new test run.
   * @param info - The information for creating the test run.
   * @returns A promise that resolves to the response containing the created test run.
   */
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

          itwTestCycleId: this.options.applauseTestCycleId,

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

  /**
   * Ends a test run.
   * @param testRunId - The ID of the test run to end.
   * @returns A promise that resolves to the response indicating the completion of the test run.
   */
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

  /**
   * Starts a new test case.
   * @param params - The parameters for creating the test case.
   * @returns A promise that resolves to the response containing the created test case.
   */
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

  /**
   * Submits a test case result.
   * @param params - The parameters for submitting the test case result.
   * @returns A promise that resolves when the test case result is submitted.
   */
  async submitTestCaseResult(params: SubmitTestCaseResultDto): Promise<void> {
    this.callsInFlight += 1;
    try {
      await this.client.post('/api/v1.0/test-result', params);
    } finally {
      this.callsInFlight -= 1;
    }
  }

  /**
   * Retrieves the provider session links for the specified test results.
   * @param resultIds - The IDs of the test results.
   * @returns A promise that resolves to the response containing the provider session links.
   */
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

  /**
   * Sends a heartbeat for the specified test run.
   * @param testRunId - The ID of the test run.
   * @returns A promise that resolves to the response indicating the heartbeat was sent.
   */
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

  /**
   * Retrieves the email address for the specified email prefix.
   * @param emailPrefix - The prefix of the email address.
   * @returns A promise that resolves to the response containing the email address.
   */
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

  /**
   * Retrieves the content of the specified email.
   * @param request - The request parameters for retrieving the email content.
   * @returns A promise that resolves to the response containing the email content.
   */
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

  /**
   * Uploads an asset for the specified test result.
   * @param resultId - The ID of the test result.
   * @param file - The file to upload as an asset.
   * @param assetName - The name of the asset.
   * @param providerSessionGuid - The GUID of the provider session.
   * @param assetType - The type of the asset.
   * @returns A promise that resolves to the response indicating the asset was uploaded.
   */
  async uploadAsset(
    resultId: number,
    file: Buffer,
    assetName: string,
    providerSessionGuid: string,
    assetType: AssetType
  ): Promise<AxiosResponse<void>> {
    this.callsInFlight += 1;

    try {
      // this filters out falsy values (null, undefined, 0)
      return await this.client.postForm<void>(
        `/api/v1.0/test-result/${resultId}/upload`,
        {
          file,
          assetName,
          providerSessionGuid,
          assetType,
        }
      );
    } finally {
      this.callsInFlight -= 1;
    }
  }
}
