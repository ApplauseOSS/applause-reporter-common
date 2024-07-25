import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { TestRunAutoResultDto } from './dto.ts';
import {
  PublicApiConfig,
  validatePublicApiConfig,
} from './public-api-config.ts';

export class PublicApi {
  private readonly client: AxiosInstance;

  private callsInFlight: number;
  /**
   * tracks number of HTTP calls in progress, used by reporters that want to know when our async work is finished
   */
  public get getCallsInFlight(): number {
    return this.callsInFlight;
  }

  constructor(readonly options: PublicApiConfig) {
    this.callsInFlight = 0;
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
        console.error(`Public-Api returned ${errText}`);
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
