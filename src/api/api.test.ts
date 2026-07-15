import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import Api from './api';
import type { HttpResponse } from '.';
import type { AxiosResponseHeaders } from 'axios';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

// Ensure axios.defaults.headers.common exists for token storage
if (!axios.defaults) {
  (axios as unknown as { defaults: Record<string, unknown> }).defaults = {};
}
if (!axios.defaults.headers) {
  (axios as unknown as { defaults: { headers: Record<string, unknown> } }).defaults.headers = {};
}
if (!axios.defaults.headers.common) {
  (axios as unknown as { defaults: { headers: { common: Record<string, unknown> } } }).defaults.headers.common = {};
}

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock Blob
(globalThis as typeof globalThis).Blob = class Blob {
  size: number;
  type: string;
  constructor(parts?: BlobPart[], options?: BlobPropertyBag) {
    this.size = parts ? parts.reduce((acc, part) => {
      if (typeof part === 'string') return acc + part.length;
      if (part instanceof ArrayBuffer) return acc + part.byteLength;
      return acc;
    }, 0) : 0;
    this.type = options?.type || '';
  }
} as unknown as typeof Blob;

describe('Api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    delete (axios.defaults.headers.common as Record<string, unknown>)['Authorization'];
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getBaseURL', () => {
    it('should return the correct base URL', () => {
      expect(Api.getBaseURL()).toBe('/api/v1');
    });
  });

  describe('headers', () => {
    it('should return headers with token from axios defaults', async () => {
      axios.defaults.headers.common['Authorization'] = 'test-token-123';
      const headers = await Api.headers();

      expect(headers).toEqual({
        'Authorization': 'test-token-123',
        'Content-Type': 'application/json',
      });
    });

    it('should return headers with empty token when not in axios defaults', async () => {
      const headers = await Api.headers();

      expect(headers).toEqual({
        'Authorization': '',
        'Content-Type': 'application/json',
      });
    });
  });

  describe('encodeUrlParams', () => {
    it('should encode simple key-value params', () => {
      const url = '/test';
      const params = { name: 'John', age: 30 };

      const result = Api.encodeUrlParams(url, params);

      expect(result).toBe('/test?name=John&age=30');
    });

    it('should encode array params with multiple values', () => {
      const url = '/test';
      const params = { ids: [1, 2, 3] };

      const result = Api.encodeUrlParams(url, params);

      expect(result).toBe('/test?ids=1&ids=2&ids=3');
    });

    it('should encode special characters', () => {
      const url = '/test';
      const params = { query: 'hello world', special: 'a&b=c' };

      const result = Api.encodeUrlParams(url, params);

      expect(result).toBe('/test?query=hello%20world&special=a%26b%3Dc');
    });

    it('should handle mixed params with arrays and simple values', () => {
      const url = '/test';
      const params = { name: 'John', tags: ['a', 'b'], active: true };

      const result = Api.encodeUrlParams(url, params);

      expect(result).toBe('/test?name=John&tags=a&tags=b&active=true');
    });

    it('should handle empty params object', () => {
      const url = '/test';
      const params = {};

      const result = Api.encodeUrlParams(url, params);

      expect(result).toBe('/test?');
    });
  });

  describe('HTTP methods', () => {
    const mockResponse: HttpResponse<Record<string, unknown>> = {
      data: { message: 'success' },
      status: 200,
      statusText: 'OK',
      headers: {} as AxiosResponseHeaders,
      config: {},
    };

    beforeEach(() => {
      mockedAxios.mockResolvedValue(mockResponse);
    });

    describe('get', () => {
      it('should call xhr with GET method', async () => {
        const xhrSpy = vi.spyOn(Api, 'xhr');
        await Api.get('/test');

        expect(xhrSpy).toHaveBeenCalledWith('/test', {}, 'GET');
      });

      it('should call xhr with params', async () => {
        const xhrSpy = vi.spyOn(Api, 'xhr');
        await Api.get('/test', { id: 1 });

        expect(xhrSpy).toHaveBeenCalledWith('/test', { id: 1 }, 'GET');
      });
    });

    describe('post', () => {
      it('should call xhr with POST method', async () => {
        const xhrSpy = vi.spyOn(Api, 'xhr');
        await Api.post('/test', { name: 'test' });

        expect(xhrSpy).toHaveBeenCalledWith('/test', { name: 'test' }, 'POST');
      });

      it('should call xhr with undefined params when not provided', async () => {
        const xhrSpy = vi.spyOn(Api, 'xhr');
        await Api.post('/test');

        expect(xhrSpy).toHaveBeenCalledWith('/test', undefined, 'POST');
      });
    });

    describe('put', () => {
      it('should call xhr with PUT method', async () => {
        const xhrSpy = vi.spyOn(Api, 'xhr');
        await Api.put('/test', { name: 'updated' });

        expect(xhrSpy).toHaveBeenCalledWith('/test', { name: 'updated' }, 'PUT');
      });
    });

    describe('patch', () => {
      it('should call xhr with PATCH method', async () => {
        const xhrSpy = vi.spyOn(Api, 'xhr');
        await Api.patch('/test', { name: 'patched' });

        expect(xhrSpy).toHaveBeenCalledWith('/test', { name: 'patched' }, 'PATCH');
      });
    });

    describe('delete', () => {
      it('should call xhr with DELETE method', async () => {
        const xhrSpy = vi.spyOn(Api, 'xhr');
        await Api.delete('/test', { id: 1 });

        expect(xhrSpy).toHaveBeenCalledWith('/test', { id: 1 }, 'DELETE');
      });
    });
  });

  describe('xhr', () => {
    beforeEach(() => {
      axios.defaults.headers.common['Authorization'] = 'auth-token';
    });

    it('should make a GET request with encoded URL params', async () => {
      const mockResponse = {
        data: { result: 'data' },
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' } as unknown as AxiosResponseHeaders,
        config: {},
      };
      mockedAxios.mockResolvedValue(mockResponse);

      await Api.xhr('/test', { id: 1, name: 'test' }, 'GET');

      expect(mockedAxios).toHaveBeenCalledWith(expect.objectContaining({
        method: 'GET',
        url: '/api/v1/test?id=1&name=test',
        headers: {
          'Authorization': 'auth-token',
          'Content-Type': 'application/json',
        },
      }));
    });

    it('should make a POST request with data in body', async () => {
      const mockResponse = {
        data: { result: 'created' },
        status: 201,
        statusText: 'Created',
        headers: {} as AxiosResponseHeaders,
        config: {},
      };
      mockedAxios.mockResolvedValue(mockResponse);

      await Api.xhr('/test', { name: 'new item' }, 'POST');

      expect(mockedAxios).toHaveBeenCalledWith(expect.objectContaining({
        method: 'POST',
        url: '/api/v1/test',
        data: { name: 'new item' },
        headers: {
          'Authorization': 'auth-token',
          'Content-Type': 'application/json',
        },
      }));
    });

    describe('status code handling', () => {
      it('should return response for status 200', async () => {
        const mockResponse = {
          data: { success: true },
          status: 200,
          statusText: 'OK',
          headers: {} as AxiosResponseHeaders,
          config: {},
        };
        mockedAxios.mockResolvedValue(mockResponse);

        const result = await Api.xhr('/test', null, 'GET');

        expect(result).toEqual(mockResponse);
      });

      it('should return response for status 201', async () => {
        const mockResponse = {
          data: { created: true },
          status: 201,
          statusText: 'Created',
          headers: {} as AxiosResponseHeaders,
          config: {},
        };
        mockedAxios.mockResolvedValue(mockResponse);

        const result = await Api.xhr('/test', { data: 'new' }, 'POST');

        expect(result).toEqual(mockResponse);
      });

      it('should return response for status 202', async () => {
        const mockResponse = {
          data: { accepted: true },
          status: 202,
          statusText: 'Accepted',
          headers: {} as AxiosResponseHeaders,
          config: {},
        };
        mockedAxios.mockResolvedValue(mockResponse);

        const result = await Api.xhr('/test', { data: 'async' }, 'POST');

        expect(result).toEqual(mockResponse);
      });

      it('should return response for status 204', async () => {
        const mockResponse = {
          data: null,
          status: 204,
          statusText: 'No Content',
          headers: {} as AxiosResponseHeaders,
          config: {},
        };
        mockedAxios.mockResolvedValue(mockResponse);

        const result = await Api.xhr('/test', { id: 1 }, 'DELETE');

        expect(result).toEqual(mockResponse);
      });

      it('should return response for status 302', async () => {
        const mockResponse = {
          data: { redirect: '/new-location' },
          status: 302,
          statusText: 'Found',
          headers: {} as AxiosResponseHeaders,
          config: {},
        };
        mockedAxios.mockResolvedValue(mockResponse);

        const result = await Api.xhr('/test', null, 'GET');

        expect(result).toEqual(mockResponse);
      });

      it('should return response for status 403', async () => {
        const mockResponse = {
          data: { forbidden: true },
          status: 403,
          statusText: 'Forbidden',
          headers: {} as AxiosResponseHeaders,
          config: {},
        };
        mockedAxios.mockResolvedValue(mockResponse);

        const result = await Api.xhr('/test', null, 'GET');

        expect(result).toEqual(mockResponse);
      });

      it('should throw error message for non-success status codes', async () => {
        const mockResponse = {
          data: { message: 'Internal Server Error' },
          status: 500,
          statusText: 'Internal Server Error',
          headers: {} as AxiosResponseHeaders,
          config: {},
        };
        mockedAxios.mockResolvedValue(mockResponse);

        await expect(Api.xhr('/test', null, 'GET')).rejects.toBe('Internal Server Error');
      });

      it('should throw error message for status 400', async () => {
        const mockResponse = {
          data: { message: 'Bad Request' },
          status: 400,
          statusText: 'Bad Request',
          headers: {} as AxiosResponseHeaders,
          config: {},
        };
        mockedAxios.mockResolvedValue(mockResponse);

        await expect(Api.xhr('/test', { invalid: 'data' }, 'POST')).rejects.toBe('Bad Request');
      });

      it('should throw error message for status 404', async () => {
        const mockResponse = {
          data: { message: 'Not Found' },
          status: 404,
          statusText: 'Not Found',
          headers: {} as AxiosResponseHeaders,
          config: {},
        };
        mockedAxios.mockResolvedValue(mockResponse);

        await expect(Api.xhr('/nonexistent', null, 'GET')).rejects.toBe('Not Found');
      });
    });

    describe('content type handling', () => {
      it('should handle Excel file response and throw with file size', async () => {
        const mockResponse = {
          data: new ArrayBuffer(1024),
          status: 200,
          statusText: 'OK',
          headers: {
            'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml',
          } as unknown as AxiosResponseHeaders,
          config: {},
        };
        mockedAxios.mockResolvedValue(mockResponse);

        await expect(Api.xhr('/export', null, 'GET')).rejects.toThrow('File Size');
      });

      it('should use arraybuffer response type when content_type option is specified', async () => {
        const mockResponse = {
          data: { result: 'data' },
          status: 200,
          statusText: 'OK',
          headers: {} as AxiosResponseHeaders,
          config: {},
        };
        mockedAxios.mockResolvedValue(mockResponse);

        // Use POST to ensure params is not set to null before the content_type check
        await Api.xhr('/download', { option: { content_type: 'excel' } }, 'POST');

        expect(mockedAxios).toHaveBeenCalledWith(expect.objectContaining({
          responseType: 'arraybuffer',
          data: { option: { content_type: 'excel' } },
        }));
      });
    });

    describe('error handling', () => {
      it('should rethrow errors from axios', async () => {
        const networkError = new Error('Network Error');
        mockedAxios.mockRejectedValue(networkError);

        await expect(Api.xhr('/test', null, 'GET')).rejects.toThrow('Network Error');
      });

      it('should handle axios rejection', async () => {
        const error = new Error('Request failed');
        mockedAxios.mockRejectedValue(error);

        await expect(Api.xhr('/test', { data: 'test' }, 'POST')).rejects.toThrow('Request failed');
      });
    });

    describe('validateStatus', () => {
      it('should always return true for validateStatus in standard request', async () => {
        const mockResponse = {
          data: { test: 'data' },
          status: 200,
          statusText: 'OK',
          headers: {} as AxiosResponseHeaders,
          config: {},
        };
        mockedAxios.mockResolvedValue(mockResponse);

        await Api.xhr('/test', null, 'GET');

        const callArgs = mockedAxios.mock.calls[0][0] as unknown as Record<string, unknown>;
        expect((callArgs.validateStatus as () => boolean)()).toBe(true);
      });

      it('should always return true for validateStatus in arraybuffer request', async () => {
        const mockResponse = {
          data: { test: 'data' },
          status: 200,
          statusText: 'OK',
          headers: {} as AxiosResponseHeaders,
          config: {},
        };
        mockedAxios.mockResolvedValue(mockResponse);

        await Api.xhr('/download', { option: { content_type: 'excel' } }, 'POST');

        const callArgs = mockedAxios.mock.calls[0][0] as unknown as Record<string, unknown>;
        expect((callArgs.validateStatus as () => boolean)()).toBe(true);
      });
    });

    describe('params handling', () => {
      it('should not include data when params is null', async () => {
        const mockResponse = {
          data: { result: 'data' },
          status: 200,
          statusText: 'OK',
          headers: {} as AxiosResponseHeaders,
          config: {},
        };
        mockedAxios.mockResolvedValue(mockResponse);

        await Api.xhr('/test', null, 'POST');

        expect(mockedAxios).toHaveBeenCalledWith(expect.not.objectContaining({
          data: expect.anything(),
        }));
      });

      it('should include data when params is provided for non-GET requests', async () => {
        const mockResponse = {
          data: { result: 'data' },
          status: 200,
          statusText: 'OK',
          headers: {} as AxiosResponseHeaders,
          config: {},
        };
        mockedAxios.mockResolvedValue(mockResponse);

        await Api.xhr('/test', { key: 'value' }, 'POST');

        expect(mockedAxios).toHaveBeenCalledWith(expect.objectContaining({
          data: { key: 'value' },
        }));
      });

      it('should set params to null after encoding URL for GET requests', async () => {
        const mockResponse = {
          data: { result: 'data' },
          status: 200,
          statusText: 'OK',
          headers: {} as AxiosResponseHeaders,
          config: {},
        };
        mockedAxios.mockResolvedValue(mockResponse);

        await Api.xhr('/test', { id: 123 }, 'GET');

        // For GET requests, params should NOT be in data, only in URL
        expect(mockedAxios).toHaveBeenCalledWith(expect.objectContaining({
          url: '/api/v1/test?id=123',
        }));
        // Verify data is not set (because params was set to null)
        const callArgs = mockedAxios.mock.calls[0][0] as unknown as Record<string, unknown>;
        expect(callArgs.data).toBeUndefined();
      });
    });
  });

  describe('integration tests', () => {
    it('should complete a full GET request flow', async () => {
      axios.defaults.headers.common['Authorization'] = 'integration-token';
      const mockResponse = {
        data: { users: [{ id: 1, name: 'John' }] },
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' } as unknown as AxiosResponseHeaders,
        config: {},
      };
      mockedAxios.mockResolvedValue(mockResponse);

      const result = await Api.get('/users', { page: 1, limit: 10 });

      expect(result.data).toEqual({ users: [{ id: 1, name: 'John' }] });
      expect(mockedAxios).toHaveBeenCalledWith(expect.objectContaining({
        method: 'GET',
        url: '/api/v1/users?page=1&limit=10',
        headers: {
          'Authorization': 'integration-token',
          'Content-Type': 'application/json',
        },
      }));
    });

    it('should complete a full POST request flow', async () => {
      axios.defaults.headers.common['Authorization'] = 'integration-token';
      const mockResponse = {
        data: { id: 1, name: 'New User' },
        status: 201,
        statusText: 'Created',
        headers: {} as AxiosResponseHeaders,
        config: {},
      };
      mockedAxios.mockResolvedValue(mockResponse);

      const result = await Api.post('/users', { name: 'New User', email: 'new@example.com' });

      expect(result.data).toEqual({ id: 1, name: 'New User' });
      expect(mockedAxios).toHaveBeenCalledWith(expect.objectContaining({
        method: 'POST',
        url: '/api/v1/users',
        data: { name: 'New User', email: 'new@example.com' },
      }));
    });

    it('should complete a full PUT request flow', async () => {
      axios.defaults.headers.common['Authorization'] = 'integration-token';
      const mockResponse = {
        data: { id: 1, name: 'Updated User' },
        status: 200,
        statusText: 'OK',
        headers: {} as AxiosResponseHeaders,
        config: {},
      };
      mockedAxios.mockResolvedValue(mockResponse);

      const result = await Api.put('/users/1', { name: 'Updated User' });

      expect(result.data).toEqual({ id: 1, name: 'Updated User' });
    });

    it('should complete a full DELETE request flow', async () => {
      axios.defaults.headers.common['Authorization'] = 'integration-token';
      const mockResponse = {
        data: null,
        status: 204,
        statusText: 'No Content',
        headers: {} as AxiosResponseHeaders,
        config: {},
      };
      mockedAxios.mockResolvedValue(mockResponse);

      const result = await Api.delete('/users/1', { id: 1 });

      expect(result.status).toBe(204);
    });
  });
});
