import { AutoApi, DriverRegistration, _validateCtorParams } from '../src';
jest.setTimeout(400_000);
describe('my suite', () => {
  beforeAll(() => {
    DriverRegistration.registerDriver('beforeAll', 'item1');
  });
  it('should create the thing', () => {
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

  test('driver registration persistance', () => {
    DriverRegistration.registerDriver('something', 'value1');
    DriverRegistration.registerDriver('something', 'value2');
    DriverRegistration.registerDriver('somethingElse', 'value1');
    DriverRegistration.registerDriver('somethingElse', 'value2');
    DriverRegistration.registerDriver('somethingElse', 'value3');
    const beforeAll = DriverRegistration.getDrivers('beforeAll');
    const something = DriverRegistration.getDrivers('something');
    const somethingElse = DriverRegistration.getDrivers('somethingElse');
    const anotherThing = DriverRegistration.getDrivers('anotherThing');
    expect(DriverRegistration.getKeys().length).toEqual(3);
    expect(beforeAll.length).toEqual(1);
    expect(something.length).toEqual(2);
    expect(somethingElse.length).toEqual(3);
    expect(anotherThing.length).toEqual(0);
  });
});
