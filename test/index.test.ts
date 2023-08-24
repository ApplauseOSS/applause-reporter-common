import { AutoApi, _validateCtorParams } from '../src';
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

test('providing bogus baseUrl should throw an exception', () => {
  const test = () => {
    _validateCtorParams({
      clientConfig: {
        baseUrl: 'fakeUrl',
        apiKey: 'fakeApiKey',
      },
      productId: 1,
    });
  };
  expect(test).toThrow('baseUrl is not valid HTTP/HTTPS URL, was:');
});

test('providing baseUrl with localhost should work', () => {
  const test = () => {
    _validateCtorParams({
      clientConfig: {
        baseUrl: 'http://localhost:8080',
        apiKey: 'fakeApiKey',
      },
      productId: 1,
    });
  };
  expect(test).not.toThrow();
});

test('providing empty apiKey should throw an exception', () => {
  const test = () => {
    _validateCtorParams({
      clientConfig: { baseUrl: 'http://www.example.com', apiKey: '' },
      productId: 1,
    });
  };
  expect(test).toThrow('apiKey is an empty string!');
});
