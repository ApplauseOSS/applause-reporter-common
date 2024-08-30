# Applause Automation API Access

This project contains a shared interface into the Applause Automation API for JS/TS projects that need to communicate with the Applause Services. Each testing framework
requires a custom integration to handle adding these methods into the correct hooks provided by the framework. These methods can also be called manually if a custom integration
is needed. 

## Implementations

You can find the following reporter interfaces to be used with their corresponding JS/TS Test Runners:
- wdio-applause-reporter: https://github.com/ApplauseOSS/wdio-applause-reporter
- jest-applause-reporter: https://github.com/ApplauseOSS/jest-applause-reporter
- mocha-applause-reporter: https://github.com/ApplauseOSS/mocha-applause-reporter
- cucumber-applause-reporter: https://github.com/ApplauseOSS/cucumber-applause-reporter

## Requirements:
- Node 20.x
- TypeScript 


## Running 

### Run through local dev setup and build

`yarn all`

### build

`yarn build`

### test

`yarn test`

### clean

`yarn clean`

### lint

`yarn lint`

### Publishing
`yarn publish-verify`

## Implementation Information

### Applause Shared Reporter
The file reporter.ts contains the implementation of the ApplauseReporter class, which serves as a reporter for the Applause testing framework. This class provides methods to interact with the Applause API and perform various actions related to test runs, test cases, and test case results.

Here's a breakdown of the key components and functionalities of the ApplauseReporter class:

#### startTestCase(...) Method:

Starts a test case by calling the startTestCase method on the reporter property.
If the reporter property is undefined, it throws an error indicating that a run was never initialized.
Returns a promise that resolves to the testCaseId.

#### submitTestCaseResult Method:

Submits a test case result by calling the submitTestCaseResult method on the reporter property.
If the reporter property is undefined, it throws an error indicating that a run was never initialized.
Returns a promise that resolves to the testCaseResultId.

#### runnerEnd Method:

Ends the Applause runner by calling the runnerEnd method on the reporter property.
If the reporter property is undefined, it throws an error indicating that a run was never initialized.
Returns a promise that resolves when the runner is ended.

#### attachTestCaseAsset Method:

Attaches an asset to a test case by calling the attachTestCaseAsset method on the reporter property.
If the reporter property is undefined, it throws an error indicating that a run was never initialized.
Returns a promise that resolves when the asset is attached.

#### isSynchronized Method:

Checks if the Applause runner is synchronized by verifying if the run has started and finished, and if there are no pending API calls.
Returns true if the runner is not yet started or has ended, and all calls made to the Applause API have finished.

Overall, the ApplauseReporter class provides a convenient interface for interacting with the Applause testing framework, allowing you to start test runs, manage test cases, submit test case results, attach assets, and check the synchronization status of the runner.

### Email Testing

The file email-helper.ts, along with the src/email/** directory contains the implementation of our email helper utilities. It handes allocating an email address from the applause services for testing and fetching emails from it. We utilize the 'mailparser' dependency for interacting with the email content.


### Logging Integration

The file logging.ts offers a winston Transport class that allows the Applause reporter to gain access to log messages from the tests. These get stored as assets attched to the test results in the Applause automation service.
