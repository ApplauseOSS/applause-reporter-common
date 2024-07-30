export interface TestRunAutoResultDto {
  testCycleId: number;
  status: TestRunAutoResultStatus;
  failureReason?: string;
  sessionDetailsJson?: SessionDetails;
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

export interface SessionDetails {
  value: {
    deviceName?: string;
    orientation?: string;
    platformName?: string;
    platformVersion?: string;
    browserName?: string;
    browserVersion?: string;
  };
}
