import { DEFAULT_URL, loadConfig } from '../src/config.ts';

describe('config loader', () => {
  it('should load the config and use the default url', () => {
    const config = loadConfig({
      configFile: './test/resources/applause.json',
    });

    expect(config.baseUrl).toBe(DEFAULT_URL);
    expect(config.apiKey).toBe('fakeKey');
    expect(config.productId).toBe(1);
    expect(config.applauseTestCycleId).toBeUndefined();
    expect(config.testRailOptions).toBeUndefined();
  });

  it('should load the config with a base url', () => {
    const config = loadConfig({
      configFile: './test/resources/applause-with-url.json',
    });

    expect(config.baseUrl).toBe('http://localhost:8080');
    expect(config.apiKey).toBe('fakeKey');
    expect(config.productId).toBe(1);
    expect(config.applauseTestCycleId).toBeUndefined();
    expect(config.testRailOptions).toBeUndefined();
  });

  it('should allow for config variable overrides', () => {
    const config = loadConfig({
      configFile: './test/resources/applause-with-url.json',
      properties: {
        baseUrl: 'http://overwritten.com',
      },
    });

    expect(config.baseUrl).toBe('http://overwritten.com');
    expect(config.apiKey).toBe('fakeKey');
    expect(config.productId).toBe(1);
    expect(config.applauseTestCycleId).toBeUndefined();
    expect(config.testRailOptions).toBeUndefined();
  });

  it('should fail for an invalid base url', () => {
    expect(() =>
      loadConfig({
        configFile: './test/resources/bad-url-applause.json',
      })
    ).toThrowError('baseUrl is not valid HTTP/HTTPS URL, was: notAUrl');
  });

  it('should fail for an invalid productId', () => {
    expect(() =>
      loadConfig({
        configFile: './test/resources/bad-productId-applause.json',
      })
    ).toThrowError("productId must be a positive integer, was: '-1'");
  });

  it('should fail for an invalid apiKey', () => {
    expect(() =>
      loadConfig({
        configFile: './test/resources/bad-apiKey-applause.json',
      })
    ).toThrowError('apiKey is an empty string!');
  });
});
