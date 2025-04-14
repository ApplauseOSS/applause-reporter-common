import { TestRailOptions } from './dto.ts';
import Validator from 'validator';
const validator = Validator.default;

export interface AutoApiConfig {
  readonly autoApiBaseUrl: string;
  readonly apiKey: string;
  readonly productId: number;
  readonly testRailOptions?: TestRailOptions;
  readonly applauseTestCycleId?: number;
  readonly timeout?: number;
}

export const DEFAULT_URL = 'https://prod-auto-api.cloud.applause.com/';

export const DEFAULT_AUTO_API_PROPERTIES: Partial<AutoApiConfig> = {
  autoApiBaseUrl: DEFAULT_URL,
};

export function isAutoApiConfigComplete(
  config: Partial<AutoApiConfig>
): boolean {
  return (
    config.autoApiBaseUrl !== undefined &&
    config.apiKey !== undefined &&
    config.productId !== undefined
  );
}

export function validatePartialAutoApiConfig(config: Partial<AutoApiConfig>) {
  if (
    config.productId !== undefined &&
    (!Number.isInteger(config.productId) || config.productId <= 0)
  ) {
    throw new Error(
      `productId must be a positive integer, was: '${config.productId}'`
    );
  }
}

export function validateAutoApiConfig(config: AutoApiConfig) {
  if (!Number.isInteger(config.productId) || config.productId <= 0) {
    throw new Error(
      `productId must be a positive integer, was: '${config.productId}'`
    );
  }
  if (
    !validator.isURL(config.autoApiBaseUrl, {
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
      `autoApiBaseUrl is not valid HTTP/HTTPS URL, was: ${config.autoApiBaseUrl}`
    );
  }

  if (validator.isEmpty(config.apiKey)) {
    throw new Error('apiKey is an empty string!');
  }
}
