import { AxiosResponse } from 'axios';
import { ApplauseConfig, CreateTestResultDto, CreateTestResultResponseDto, SubmitTestResultDto, TestResultProviderInfo, TestRunCreateDto, TestRunCreateResponseDto } from './dto.ts';
export declare class AutoApi {
    readonly options: ApplauseConfig;
    private readonly client;
    private callsInFlight;
    /**
     * tracks number of HTTP calls in progress, used by reporters that want to know when our async work is finished
     */
    get getCallsInFlight(): number;
    constructor(options: ApplauseConfig);
    startTestRun(info: TestRunCreateDto): Promise<AxiosResponse<TestRunCreateResponseDto>>;
    endTestRun(testRunId: number): Promise<AxiosResponse<void>>;
    startTestCase(params: CreateTestResultDto): Promise<AxiosResponse<CreateTestResultResponseDto>>;
    submitTestCaseResult(params: SubmitTestResultDto): Promise<void>;
    getProviderSessionLinks(resultIds: number[]): Promise<AxiosResponse<TestResultProviderInfo[]>>;
    sendSdkHeartbeat(testRunId: number): Promise<AxiosResponse<void>>;
}
/**
 * Exposed for testing. Don't use this!
 * @private
 *
 * @param params mirrored constructor args from AutoApi class
 */
export declare const _validateCtorParams: (options: ApplauseConfig) => void;
//# sourceMappingURL=auto-api.d.ts.map