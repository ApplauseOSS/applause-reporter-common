export interface TestRunAutoResultDto {
  testCycleId: number;
  status: TestRunAutoResultStatus;
  failureReason?: string;
  sessionDetailsJson?: object;
  startTime?: Date;
  endTime?: Date;
}

export enum TestRunAutoResultStatus {
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
  CANCELED = 'CANCELED',
  ERROR = 'ERROR',
}
