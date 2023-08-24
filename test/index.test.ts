import {
  AutoApi,
  TestRunHeartbeatService,
  TestResultStatus,
  _validateCtorParams,
} from '../src';
jest.setTimeout(400_000);
test('should create the thing', () => {
  const autoApi = new AutoApi({
    clientConfig: { baseUrl: 'http://www.example.com', apiKey: 'apiKey' },
    productId: 1,
  });
  expect(autoApi).not.toBeUndefined();
});

test('providing bogus productId should throw an exception', () => {
  const test = () => {
    _validateCtorParams({
      clientConfig: {
        baseUrl: 'http://www.example.com',
        apiKey: 'fakeApiKey',
      },
      productId: -1,
    });
  };
  expect(test).toThrow('productId must be a positive integer, was');
});

test('providing bogus baseUrl should throw an exception', () => {
  const test = () => {
    _validateCtorParams({
      clientConfig: {
        baseUrl: 'fakeUrl',
        apiKey: 'fakeApiKey',
      },
      productId: 1,
    });
  };
  expect(test).toThrow('baseUrl is not valid HTTP/HTTPS URL, was:');
});

test('providing baseUrl with localhost should work', () => {
  const test = () => {
    _validateCtorParams({
      clientConfig: {
        baseUrl: 'http://localhost:8080',
        apiKey: 'fakeApiKey',
      },
      productId: 1,
    });
  };
  expect(test).not.toThrow();
});

test('providing empty apiKey should throw an exception', () => {
  const test = () => {
    _validateCtorParams({
      clientConfig: { baseUrl: 'http://www.example.com', apiKey: '' },
      productId: 1,
    });
  };
  expect(test).toThrow('apiKey is an empty string!');
});

test('Send create run', async () => {
  const autoApi = new AutoApi({
    clientConfig: {
      baseUrl: 'https://integration-auto-api.devcloud.applause.com:443/',
      apiKey: '43792e3b-e601-4593-a4c9-0457d04c0c260dc526',
    },
    productId: 267,
  });
  const res = await autoApi.startTestRun({
    tests: [],
  });
  const runId = res.data.runId;
  const heartbeatJob = new TestRunHeartbeatService(runId, autoApi);
  await heartbeatJob.start();
  const res1 = await autoApi.startTestCase({
    providerSessionIds: [],
    testCaseName: 'test1',
    testRunId: runId,
  });
  const res2 = await autoApi.startTestCase({
    providerSessionIds: [],
    testCaseName: 'test2',
    testRunId: runId,
  });
  await new Promise(r => setTimeout(r, 360_000));

  await autoApi.submitTestResult({
    status: TestResultStatus.PASSED,
    testResultId: res1.data.testResultId,
  });
  await autoApi.submitTestResult({
    status: TestResultStatus.FAILED,
    testResultId: res2.data.testResultId,
    failureReason: 'Because I Said So!',
  });
  await heartbeatJob.end();
  await autoApi.endTestRun(runId);
});
