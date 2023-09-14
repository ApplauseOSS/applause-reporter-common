import { AutoApi } from '../src/auto-api.ts';

jest.setTimeout(400_000);
test('should create the thing', () => {
  const autoApi = new AutoApi({
    baseUrl: 'http://www.example.com',
    apiKey: 'apiKey',
    productId: 1,
  });
  expect(autoApi).not.toBeUndefined();
});

test('providing bogus productId should throw an exception', () => {
  const test = () => {
    new AutoApi({
      baseUrl: 'http://www.example.com',
      apiKey: 'apiKey',
      productId: -1,
    });
  };
  expect(test).toThrow('productId must be a positive integer, was');
});
