export const TEST_RAIL_CASE_ID_PREFIX: string = 'TestRail-';
export const APPLAUSE_CASE_ID_PREFIX: string = 'Applause-';

export function parseTestCaseName(testCaseName: string): ParsedTestCaseName {
  const matches = testCaseName.match(/(TestRail-\d+|Applause-\d+)/g);
  const testRailCaseIds =
    matches
      ?.filter(match => match.startsWith(TEST_RAIL_CASE_ID_PREFIX))
      .map(match => match.substring(TEST_RAIL_CASE_ID_PREFIX.length)) || [];
  const applauseCaseIds =
    matches
      ?.filter(match => match.startsWith(APPLAUSE_CASE_ID_PREFIX))
      .map(match => match.substring(APPLAUSE_CASE_ID_PREFIX.length)) || [];

  if (testRailCaseIds.length > 1) {
    console.warn('Multiple TestRail case ids detected in testCase name');
  }
  if (applauseCaseIds.length > 1) {
    console.warn('Multiple Applause case ids detected in testCase name');
  }
  return {
    applauseTestCaseId: applauseCaseIds[0],
    testRailTestCaseId: testRailCaseIds[0],
    testCaseName: testCaseName
      .replace(/(TestRail-\d+|Applause-\d+)/g, '')
      .replace(/\s+/g, ' ')
      .trim(),
  };
}

export interface ParsedTestCaseName {
  testCaseName: string;
  testRailTestCaseId?: string;
  applauseTestCaseId?: string;
}
