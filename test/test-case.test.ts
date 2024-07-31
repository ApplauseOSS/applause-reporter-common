import { parseTestCaseName, ParsedTestCaseName } from '../src/shared/test-case.ts';

describe('parseTestCaseName', () => {
    it('should parse a test case name without any prefixes', () => {
        const testCaseName = 'My Test Case';
        const parsedTestCaseName: ParsedTestCaseName = parseTestCaseName(testCaseName);
        expect(parsedTestCaseName.testCaseName).toEqual(testCaseName);
        expect(parsedTestCaseName.testRailTestCaseId).toBeUndefined();
        expect(parsedTestCaseName.applauseTestCaseId).toBeUndefined();
    });

    it('should parse a test case name with TestRail prefix', () => {
        const testCaseName = 'TestRail-123 My Test Case';
        const parsedTestCaseName: ParsedTestCaseName = parseTestCaseName(testCaseName);
        expect(parsedTestCaseName.testCaseName).toEqual('My Test Case');
        expect(parsedTestCaseName.testRailTestCaseId).toEqual('123');
        expect(parsedTestCaseName.applauseTestCaseId).toBeUndefined();
    });

    it('should parse a test case name with Applause prefix', () => {
        const testCaseName = 'Applause-456 My Test Case';
        const parsedTestCaseName: ParsedTestCaseName = parseTestCaseName(testCaseName);
        expect(parsedTestCaseName.testCaseName).toEqual('My Test Case');
        expect(parsedTestCaseName.testRailTestCaseId).toBeUndefined();
        expect(parsedTestCaseName.applauseTestCaseId).toEqual('456');
    });

    it('should parse a test case name with both TestRail and Applause prefixes', () => {
        const testCaseName = 'TestRail-123 Applause-456 My Test Case';
        const parsedTestCaseName: ParsedTestCaseName = parseTestCaseName(testCaseName);
        expect(parsedTestCaseName.testCaseName).toEqual('My Test Case');
        expect(parsedTestCaseName.testRailTestCaseId).toEqual('123');
        expect(parsedTestCaseName.applauseTestCaseId).toEqual('456');
    });

    it('should parse a test case name with both TestRail and Applause prefixes, with no spaces between', () => {
        const testCaseName = 'TestRail-123Applause-456 My Test Case';
        const parsedTestCaseName: ParsedTestCaseName = parseTestCaseName(testCaseName);
        expect(parsedTestCaseName.testCaseName).toEqual('My Test Case');
        expect(parsedTestCaseName.testRailTestCaseId).toEqual('123');
        expect(parsedTestCaseName.applauseTestCaseId).toEqual('456');
    });

    it('should parse a test case name with test case ids at the end of the test case name', () => {
        const testCaseName = 'My Test Case TestRail-123';
        const parsedTestCaseName: ParsedTestCaseName = parseTestCaseName(testCaseName);
        expect(parsedTestCaseName.testCaseName).toEqual('My Test Case');
        expect(parsedTestCaseName.testRailTestCaseId).toEqual('123');
        expect(parsedTestCaseName.applauseTestCaseId).toBeUndefined();
    });

    it('should parse a test case name with test case ids in the middle of the test case name', () => {
        const testCaseName = 'My Test Case TestRail-123 Another Test Case';
        const parsedTestCaseName: ParsedTestCaseName = parseTestCaseName(testCaseName);
        expect(parsedTestCaseName.testCaseName).toEqual('My Test Case Another Test Case');
        expect(parsedTestCaseName.testRailTestCaseId).toEqual('123');
        expect(parsedTestCaseName.applauseTestCaseId).toBeUndefined();
    });
});