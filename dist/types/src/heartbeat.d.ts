import { AutoApi } from './auto-api.ts';
export declare class TestRunHeartbeatService {
    readonly testRunId: number;
    readonly autoApi: AutoApi;
    private enabled;
    private nextHeartbeat?;
    constructor(testRunId: number, autoApi: AutoApi);
    start(): Promise<void>;
    isEnabled(): boolean;
    private scheduleNextHeartbeat;
    private sendHeartbeat;
    end(): Promise<void>;
}
//# sourceMappingURL=heartbeat.d.ts.map