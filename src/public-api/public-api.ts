import axios, { AxiosError, AxiosInstance, AxiosResponse } from 'axios';
import { TestRunAutoResultDto } from './dto.ts';
import {
  PublicApiConfig,
  validatePublicApiConfig,
} from './public-api-config.ts';
import * as winston from 'winston';
import { constructDefaultLogger } from '../shared/logging.ts';

export class PublicApi {
  private readonly client: AxiosInstance;

  private callsInFlight: number;
  private logger: winston.Logger;
  /**
   * tracks number of HTTP calls in progress, used by reporters that want to know when our async work is finished
   */
  public get getCallsInFlight(): number {
    return this.callsInFlight;
  }

  constructor(
    readonly options: PublicApiConfig,
    logger?: winston.Logger
  ) {
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
        this.logger.error(`Public-Api returned ${errText}`);
        return Promise.reject(error);
      }
    );
  }

  async submitResult(
    testCaseId: number,
    info: TestRunAutoResultDto
  ): Promise<AxiosResponse<void>> {
    this.callsInFlight += 1;
    try {
      return await this.client.post<void>(
        `v2/test-case-results/${testCaseId}/submit`,
        info
      );
    } finally {
      this.callsInFlight -= 1;
    }
  }
}
