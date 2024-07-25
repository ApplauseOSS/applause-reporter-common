import Validator from 'validator';
const validator = Validator.default;

export interface PublicApiConfig {
  readonly publicApiBaseUrl: string;
  readonly apiKey: string;
  readonly productId: number;
  readonly applauseTestCycleId?: number;
}

export const DEFAULT_URL = 'https://api.applause.com/';

export const DEFAULT_PUBLIC_API_PROPERTIES: Partial<PublicApiConfig> = {
  publicApiBaseUrl: DEFAULT_URL,
};

export function isPublicApiConfigComplete(
  config: Partial<PublicApiConfig>
): boolean {
  return (
    config.publicApiBaseUrl !== undefined &&
    config.apiKey !== undefined &&
    config.productId !== undefined
  );
}

export function validatePartialPublicApiConfig(
  config: Partial<PublicApiConfig>
) {
  if (
    config.productId !== undefined &&
    (!Number.isInteger(config.productId) || config.productId <= 0)
  ) {
    throw new Error(
      `productId must be a positive integer, was: '${config.productId}'`
    );
  }
}

export function validatePublicApiConfig(config: PublicApiConfig) {
  if (!Number.isInteger(config.productId) || config.productId <= 0) {
    throw new Error(
      `productId must be a positive integer, was: '${config.productId}'`
    );
  }
  if (
    !validator.isURL(config.publicApiBaseUrl, {
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
      `publicApiBaseUrl is not valid HTTP/HTTPS URL, was: ${config.publicApiBaseUrl}`
    );
  }

  if (validator.isEmpty(config.apiKey)) {
    throw new Error('apiKey is an empty string!');
  }
}
