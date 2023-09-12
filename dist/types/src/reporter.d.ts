import { ApplauseConfig, TestResultStatus } from './dto.ts';
export declare class ApplauseReporter {
    private autoApi;
    private initializer;
    private reporter?;
    constructor(config: ApplauseConfig);
    runnerStart(tests?: string[]): void;
    startTestCase(id: string, testCaseName: string): void;
    submitTestCaseResult(id: string, status: TestResultStatus, errorMessage?: string): void;
    runnerEnd(): Promise<void>;
}
//# sourceMappingURL=reporter.d.ts.map