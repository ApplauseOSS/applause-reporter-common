import { existsSync, readFileSync } from 'fs';
import path from 'path';

import {
  AutoApiConfig,
  DEFAULT_AUTO_API_PROPERTIES,
  isAutoApiConfigComplete,
  validateAutoApiConfig,
} from '../auto-api/auto-api-config.ts';
import {
  DEFAULT_PUBLIC_API_PROPERTIES,
  isPublicApiConfigComplete,
  PublicApiConfig,
  validatePublicApiConfig,
} from '../public-api/public-api-config.ts';

export type ApplauseConfig = AutoApiConfig & PublicApiConfig;

export interface ConfigLoadProperties {
  configFile?: string;
  properties?: Partial<ApplauseConfig>;
}

// Loads the configuration
export function loadConfig(loadOptions?: ConfigLoadProperties): ApplauseConfig {
  // Setup the initial config with any default properties
  let config: Partial<ApplauseConfig> = {
    ...DEFAULT_PUBLIC_API_PROPERTIES,
    ...DEFAULT_AUTO_API_PROPERTIES,
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
  return isAutoApiConfigComplete(config) && isPublicApiConfigComplete(config);
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
  validateAutoApiConfig(config);
  validatePublicApiConfig(config);
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
