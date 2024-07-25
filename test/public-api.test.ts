import { PublicApi } from '../src/index.ts';

jest.setTimeout(400_000);

test('should create the thing', () => {
  const publicAPI = new PublicApi({
    publicApiBaseUrl: 'http://www.example.com',
    apiKey: 'apiKey',
    productId: 1,
  });
  expect(publicAPI).not.toBeUndefined();
});

test('providing bogus productId should throw an exception', () => {
  const test = () => {
    new PublicApi({
      publicApiBaseUrl: 'http://www.example.com',
      apiKey: 'apiKey',
      productId: -1,
    });
  };
  expect(test).toThrow('productId must be a positive integer, was');
});
