import { PublicApi } from '../src/index.ts';
import axios from 'axios';

jest.setTimeout(400_000);
jest.mock('axios', () => ({
  create: jest.fn(),
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;
let mockAxiosInstance: any;

beforeEach(() => {
  jest.clearAllMocks();
  mockAxiosInstance = {
    get: jest.fn(),
    post: jest.fn(),
    interceptors: {
      response: {
        use: jest.fn(),
      },
    },
  };
  mockedAxios.create.mockReturnValue(mockAxiosInstance);
});

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

describe('getBuilds', () => {

  test('should call axios with correct parameters and return response', async () => {
    const mockResponse = {
      data: {
        totalPages: 1073741824,
        totalElements: 9007199254740991,
        size: 1073741824,
        content: [
          {
            id: 1073741824,
            name: 'string',
            description: 'string',
            companyId: 1073741824,
            productId: 1073741824,
            releaseUrls: ['string'],
            timeline: {
              createDate: '2025-07-11T03:40:45.930Z',
              lastChangeDate: '2025-07-11T03:40:45.930Z',
            },
            attachments: [
              {
                hashMd5: 'string',
                hashSha1: 'string',
                hashSha256: 'string',
                hashSha512: 'string',
                id: 1073741824,
                fileName: 'string',
                contentType: 'string',
                size: 1073741824,
                url: 'string',
                timeline: {
                  createDate: '2025-07-11T03:40:45.930Z',
                  lastChangeDate: '2025-07-11T03:40:45.930Z',
                },
              },
            ],
          },
        ],
        number: 1073741824,
        sort: {
          empty: true,
          unsorted: true,
          sorted: true,
        },
        first: true,
        last: true,
        numberOfElements: 1073741824,
        pageable: {
          offset: 9007199254740991,
          sort: {
            empty: true,
            unsorted: true,
            sorted: true,
          },
          unpaged: true,
          paged: true,
          pageSize: 1073741824,
          pageNumber: 1073741824,
        },
        empty: true,
      },
    };

    mockAxiosInstance.get.mockResolvedValue(mockResponse);

    const publicApi = new PublicApi({
      publicApiBaseUrl: 'http://www.example.com',
      apiKey: 'apiKey',
      productId: 1,
    });

    const result = await publicApi.getBuilds(123);

    expect(mockAxiosInstance.get).toHaveBeenCalledWith('v2/builds', {
      params: {
        productId: 123,
        size: 100,
        sort: 'desc',
      },
    });
    expect(result).toEqual(mockResponse);
  });

  test('should track calls in flight correctly', async () => {
    mockAxiosInstance.get.mockResolvedValue({ data: {} });

    const publicApi = new PublicApi({
      publicApiBaseUrl: 'http://www.example.com',
      apiKey: 'apiKey',
      productId: 1,
    });

    expect(publicApi.getCallsInFlight).toBe(0);

    const promise = publicApi.getBuilds(123);
    
    // Note: calls in flight increment happens synchronously
    expect(publicApi.getCallsInFlight).toBe(1);

    await promise;

    expect(publicApi.getCallsInFlight).toBe(0);
  });

  test('should decrement calls in flight even when request fails', async () => {
    mockAxiosInstance.get.mockRejectedValue(new Error('Network error'));

    const publicApi = new PublicApi({
      publicApiBaseUrl: 'http://www.example.com',
      apiKey: 'apiKey',
      productId: 1,
    });

    expect(publicApi.getCallsInFlight).toBe(0);

    try {
      await publicApi.getBuilds(123);
    } catch (error) {
      // Expected to fail
    }

    expect(publicApi.getCallsInFlight).toBe(0);
  });
});
