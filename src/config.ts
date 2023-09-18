import { existsSync, readFileSync } from 'fs';
import { TestRailOptions } from './dto.ts';
import path from 'path';

import Validator from 'validator';
const validator = Validator.default;

export interface ApplauseConfig {
  readonly baseUrl: string;
  readonly apiKey: string;
  readonly productId: number;
  readonly testRailOptions?: TestRailOptions;
  readonly applauseTestCycleId?: number;
}

export const DEFAULT_URL = 'https://prod-auto-api.cloud.applause.com/';

export interface ConfigLoadProperties {
  configFile?: string;
  properties?: Partial<ApplauseConfig>;
}

// Loads the configuration
export function loadConfig(loadOptions?: ConfigLoadProperties): ApplauseConfig {
  // Setup the initial config with any default properties
  let config: Partial<ApplauseConfig> = {
    baseUrl: DEFAULT_URL,
  };

  // Load properties from the provided config file
  if (loadOptions !== undefined && loadOptions.configFile !== undefined) {
    config = overrideConfig(
      config,
      loadConfigFromFile(path.join(process.cwd(), loadOptions.configFile))
    );
  } else {
    // Override from the default config file
    config = overrideConfig(config, loadConfigFromFile());
  }

  // Then load in the file override properties
  if (loadOptions !== undefined && loadOptions.properties !== undefined) {
    config = overrideConfig(config, loadOptions.properties);
  }

  if (!isComplete(config)) {
    throw new Error('Config is not complete');
  }

  // We know that the config is complete, so we can cast
  const finalConfig = config as ApplauseConfig;

  validateConfig(finalConfig);

  return finalConfig;
}

export function overrideConfig(
  config: Partial<ApplauseConfig>,
  overrides?: Partial<ApplauseConfig>
): Partial<ApplauseConfig> {
  return Object.assign(
    {},
    config,
    Object.fromEntries(
      Object.entries(overrides || {}).filter(([_, v]) => v !== undefined)
    )
  );
}

export function isComplete(config: Partial<ApplauseConfig>): boolean {
  return (
    config.baseUrl !== undefined &&
    config.apiKey !== undefined &&
    config.productId !== undefined
  );
}

export function loadConfigFromFile(
  configFile?: string
): Partial<ApplauseConfig> {
  const configFilePath = configFile || process.cwd() + '/applause.json';
  if (!existsSync(configFilePath)) {
    return {};
  }
  const fileCotents = readFileSync(configFilePath, 'utf8');
  return JSON.parse(fileCotents) as Partial<ApplauseConfig>;
}

export function validateConfig(config: ApplauseConfig) {
  if (!Number.isInteger(config.productId) || config.productId <= 0) {
    throw new Error(
      `productId must be a positive integer, was: '${config.productId}'`
    );
  }
  if (
    !validator.isURL(config.baseUrl, {
      protocols: ['http', 'https'],
      require_tld: false, // allow localhost
      allow_query_components: false,
      disallow_auth: true,
      allow_fragments: false,
      allow_protocol_relative_urls: false,
      allow_trailing_dot: false,
      require_host: true,
      require_protocol: true,
    })
  ) {
    throw new Error(
      `baseUrl is not valid HTTP/HTTPS URL, was: ${config.baseUrl}`
    );
  }

  if (validator.isEmpty(config.apiKey)) {
    throw new Error('apiKey is an empty string!');
  }
}

export function validatePartialConfig(config: Partial<ApplauseConfig>) {
  if (
    config.productId !== undefined &&
    (!Number.isInteger(config.productId) || config.productId <= 0)
  ) {
    throw new Error(
      `productId must be a positive integer, was: '${config.productId}'`
    );
  }
}
