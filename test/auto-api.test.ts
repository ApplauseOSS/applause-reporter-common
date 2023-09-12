import { AutoApi, _validateCtorParams } from '../src/auto-api.ts';

jest.setTimeout(400_000);
test('should create the thing', () => {
  const autoApi = new AutoApi({
    clientConfig: { baseUrl: 'http://www.example.com', apiKey: 'apiKey' },
    productId: 1,
  });
  expect(autoApi).not.toBeUndefined();
});

test('providing bogus productId should throw an exception', () => {
  const test = () => {
    _validateCtorParams({
      clientConfig: {
        baseUrl: 'http://www.example.com',
        apiKey: 'fakeApiKey',
      },
      productId: -1,
    });
  };
  expect(test).toThrow('productId must be a positive integer, was');
});
