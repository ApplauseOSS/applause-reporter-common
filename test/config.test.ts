import { DEFAULT_URL } from '../src/auto-api/auto-api-config.ts';
import { loadConfig } from '../src/config/config.ts';

describe('config loader', () => {
  it('should load the config and use the default url', () => {
    const config = loadConfig({
      configFile: './test/resources/applause.json',
    });

    expect(config.autoApiBaseUrl).toBe(DEFAULT_URL);
    expect(config.apiKey).toBe('fakeKey');
    expect(config.productId).toBe(1);
    expect(config.applauseTestCycleId).toBeUndefined();
    expect(config.testRailOptions).toBeUndefined();
  });

  it('should load the config with a base url', () => {
    const config = loadConfig({
      configFile: './test/resources/applause-with-url.json',
    });

    expect(config.autoApiBaseUrl).toBe('http://localhost:8080');
    expect(config.apiKey).toBe('fakeKey');
    expect(config.productId).toBe(1);
    expect(config.applauseTestCycleId).toBeUndefined();
    expect(config.testRailOptions).toBeUndefined();
  });

  it('should allow for config variable overrides', () => {
    const config = loadConfig({
      configFile: './test/resources/applause-with-url.json',
      properties: {
        autoApiBaseUrl: 'http://overwritten.com',
      },
    });

    expect(config.autoApiBaseUrl).toBe('http://overwritten.com');
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
    ).toThrowError('autoApiBaseUrl is not valid HTTP/HTTPS URL, was: notAUrl');
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

  it('should not override properties with undefined', () => {
    const config = loadConfig({
      configFile: './test/resources/applause-with-url.json',
      properties: {
        apiKey: undefined,
        applauseTestCycleId: undefined,
        autoApiBaseUrl: undefined,
        productId: undefined,
        testRailOptions: undefined,
      },
    });

    expect(config.autoApiBaseUrl).toBe('http://localhost:8080');
    expect(config.apiKey).toBe('fakeKey');
    expect(config.productId).toBe(1);
    expect(config.applauseTestCycleId).toBeUndefined();
    expect(config.testRailOptions).toBeUndefined();
  });

  it('should resume when the config file is missing', () => {
    const config = loadConfig({
      configFile: './test/resources/not-found.json',
      properties: {
        apiKey: 'fakeKey',
        productId: 1,
      },
    });
    expect(config).not.toBeNull();
  });
});
