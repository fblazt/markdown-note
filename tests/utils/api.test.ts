import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { apiFetch, ApiError, getApiBaseUrl, resolveApiUrl } from '~/utils/api';

describe('API Client Helper (app/utils/api.ts)', () => {
  const originalFetch = globalThis.fetch;
  const originalUseRuntimeConfig = (globalThis as any).useRuntimeConfig;
  const originalEnvBaseUrl = process.env.NUXT_PUBLIC_API_BASE_URL;

  beforeEach(() => {
    vi.restoreAllMocks();
    (globalThis as any).useRuntimeConfig = () => ({
      public: {
        apiBaseUrl: '',
      },
    });
    delete process.env.NUXT_PUBLIC_API_BASE_URL;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    (globalThis as any).useRuntimeConfig = originalUseRuntimeConfig;
    if (originalEnvBaseUrl !== undefined) {
      process.env.NUXT_PUBLIC_API_BASE_URL = originalEnvBaseUrl;
    } else {
      delete process.env.NUXT_PUBLIC_API_BASE_URL;
    }
  });

  describe('resolveApiUrl and getApiBaseUrl', () => {
    it('returns path as is when explicit empty string is passed as baseUrl to resolveApiUrl', () => {
      expect(resolveApiUrl('/api/notes', '')).toBe('/api/notes');
      expect(resolveApiUrl('api/notes', '')).toBe('api/notes');
    });

    it('joins base URL and path correctly without duplicate slashes', () => {
      expect(resolveApiUrl('/api/notes', 'http://localhost:8080')).toBe('http://localhost:8080/api/notes');
      expect(resolveApiUrl('/api/notes', 'http://localhost:8080/')).toBe('http://localhost:8080/api/notes');
      expect(resolveApiUrl('api/notes', 'http://localhost:8080')).toBe('http://localhost:8080/api/notes');
      expect(resolveApiUrl('api/notes', 'http://localhost:8080/')).toBe('http://localhost:8080/api/notes');
    });

    it('preserves absolute URLs without prepending base URL', () => {
      expect(resolveApiUrl('https://example.com/api/test', 'http://localhost:8080')).toBe('https://example.com/api/test');
      expect(resolveApiUrl('http://example.com/api/test', 'http://localhost:8080')).toBe('http://example.com/api/test');
    });

    it('reads apiBaseUrl from useRuntimeConfig', () => {
      (globalThis as any).useRuntimeConfig = () => ({
        public: {
          apiBaseUrl: 'https://api.notes.internal',
        },
      });
      expect(getApiBaseUrl()).toBe('https://api.notes.internal');
      expect(resolveApiUrl('/api/notes')).toBe('https://api.notes.internal/api/notes');
    });

    it('falls back to process.env.NUXT_PUBLIC_API_BASE_URL when useRuntimeConfig is unavailable', () => {
      delete (globalThis as any).useRuntimeConfig;
      process.env.NUXT_PUBLIC_API_BASE_URL = 'http://backend.internal:3000';
      expect(getApiBaseUrl()).toBe('http://backend.internal:3000');
      expect(resolveApiUrl('/api/notes')).toBe('http://backend.internal:3000/api/notes');
    });

    it('returns empty string when no config or env is present', () => {
      delete (globalThis as any).useRuntimeConfig;
      delete process.env.NUXT_PUBLIC_API_BASE_URL;
      expect(getApiBaseUrl()).toBe('');
      expect(resolveApiUrl('/api/notes')).toBe('/api/notes');
    });

    it('returns empty string when useRuntimeConfig returns empty string', () => {
      (globalThis as any).useRuntimeConfig = () => ({
        public: {
          apiBaseUrl: '',
        },
      });
      expect(getApiBaseUrl()).toBe('');
      expect(resolveApiUrl('/api/notes')).toBe('/api/notes');
    });
  });

  describe('apiFetch functionality', () => {
    it('unwraps Go backend standard response envelope { statusCode, statusMessage, data }', async () => {
      const payloadData = { id: 'note-1', title: 'Standard Envelope Note', content: 'Envelope body' };
      const envelope = {
        statusCode: 200,
        statusMessage: 'OK',
        data: payloadData,
      };

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => envelope,
      });
      globalThis.fetch = fetchMock;

      const result = await apiFetch<typeof payloadData>('/api/v1/notes/note-1');

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(result).toEqual(payloadData);
    });

    it('unwraps envelope when data contains array or primitive value', async () => {
      const listData = [{ id: 'n1' }, { id: 'n2' }];
      const envelope = {
        statusCode: 200,
        statusMessage: 'Success',
        data: listData,
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => envelope,
      });

      const result = await apiFetch<typeof listData>('/api/v1/notes');
      expect(result).toEqual(listData);
    });

    it('returns direct JSON response when envelope keys are not present', async () => {
      const mockData = { id: 'note-1', title: 'Test Note', content: 'Hello' };
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockData,
      });
      globalThis.fetch = fetchMock;

      const result = await apiFetch<typeof mockData>('/api/notes/note-1');

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe('/api/notes/note-1');
      expect(options.credentials).toBe('include');
      expect(options.headers.get('Content-Type')).toBe('application/json');
      expect(result).toEqual(mockData);
    });

    it('merges custom headers and allows overriding Content-Type', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      });
      globalThis.fetch = fetchMock;

      // Test with custom headers object
      await apiFetch('/api/notes', {
        headers: {
          'Authorization': 'Bearer test-token-123',
          'X-Custom-Header': 'CustomValue',
        },
      });

      let [, options] = fetchMock.mock.calls[0];
      expect(options.headers.get('Content-Type')).toBe('application/json');
      expect(options.headers.get('Authorization')).toBe('Bearer test-token-123');
      expect(options.headers.get('X-Custom-Header')).toBe('CustomValue');

      // Test overriding Content-Type
      await apiFetch('/api/upload', {
        headers: {
          'Content-Type': 'text/plain',
        },
      });

      [, options] = fetchMock.mock.calls[1];
      expect(options.headers.get('Content-Type')).toBe('text/plain');

      // Test with Headers instance
      const customHeaders = new Headers();
      customHeaders.set('X-Request-Id', 'req-abc-999');
      await apiFetch('/api/items', {
        headers: customHeaders,
      });

      [, options] = fetchMock.mock.calls[2];
      expect(options.headers.get('Content-Type')).toBe('application/json');
      expect(options.headers.get('X-Request-Id')).toBe('req-abc-999');

      // Test with array of tuples headers
      await apiFetch('/api/tuples', {
        headers: [['X-Tuple-Header', 'tuple-value']],
      });

      [, options] = fetchMock.mock.calls[3];
      expect(options.headers.get('Content-Type')).toBe('application/json');
      expect(options.headers.get('X-Tuple-Header')).toBe('tuple-value');
    });

    it('sends POST request with body and correct options', async () => {
      const payload = { title: 'New Note', tags: ['work', 'project'] };
      const responseData = { id: 'note-new', ...payload, createdAt: '2026-08-30T00:00:00Z' };

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => responseData,
      });
      globalThis.fetch = fetchMock;

      const result = await apiFetch<typeof responseData>('/api/notes', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe('/api/notes');
      expect(options.method).toBe('POST');
      expect(options.body).toBe(JSON.stringify(payload));
      expect(options.credentials).toBe('include');
      expect(options.headers.get('Content-Type')).toBe('application/json');
      expect(result).toEqual(responseData);
    });

    it('handles 204 No Content response gracefully by returning empty object', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
        statusText: 'No Content',
      });
      globalThis.fetch = fetchMock;

      const result = await apiFetch('/api/notes/note-1', {
        method: 'DELETE',
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(result).toEqual({});
    });

    it('parses JSON error response with statusCode, statusMessage, and data for HTTP 400', async () => {
      const errorPayload = {
        statusCode: 400,
        statusMessage: 'Validation Failed',
        data: {
          fieldErrors: {
            title: 'Title cannot be empty',
          },
        },
      };

      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => errorPayload,
      });
      globalThis.fetch = fetchMock;

      try {
        await apiFetch('/api/notes', {
          method: 'POST',
          body: JSON.stringify({ title: '' }),
        });
        expect.unreachable('Should have thrown an ApiError');
      } catch (err: any) {
        expect(err).toBeInstanceOf(Error);
        expect(err).toBeInstanceOf(ApiError);
        expect(err.name).toBe('ApiError');
        expect(err.message).toBe('Validation Failed');
        expect(err.statusCode).toBe(400);
        expect(err.data).toEqual({
          fieldErrors: {
            title: 'Title cannot be empty',
          },
        });
      }
    });

    it('parses JSON error response for HTTP 401 Unauthorized', async () => {
      const errorPayload = {
        statusCode: 401,
        message: 'Invalid authentication token',
      };

      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => errorPayload,
      });
      globalThis.fetch = fetchMock;

      await expect(apiFetch('/api/protected')).rejects.toMatchObject({
        message: 'Invalid authentication token',
        statusCode: 401,
      });
    });

    it('parses JSON error response for HTTP 404 Note Not Found', async () => {
      const errorPayload = {
        statusMessage: 'Note not found',
        data: { noteId: 'missing-id' },
      };

      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => errorPayload,
      });
      globalThis.fetch = fetchMock;

      try {
        await apiFetch('/api/notes/missing-id');
        expect.unreachable('Should have thrown an ApiError');
      } catch (err: any) {
        expect(err.message).toBe('Note not found');
        expect(err.statusCode).toBe(404);
        expect(err.data).toEqual({ noteId: 'missing-id' });
      }
    });

    it('parses JSON error response for HTTP 500 Internal Server Error', async () => {
      const errorPayload = {
        statusCode: 500,
        statusMessage: 'Database connection failed',
      };

      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => errorPayload,
      });
      globalThis.fetch = fetchMock;

      await expect(apiFetch('/api/health')).rejects.toMatchObject({
        message: 'Database connection failed',
        statusCode: 500,
      });
    });

    it('defaults message to "Request failed with status <status>" when JSON has no statusMessage or message', async () => {
      const errorPayload = {
        someOtherKey: 'value',
      };

      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => errorPayload,
      });
      globalThis.fetch = fetchMock;

      try {
        await apiFetch('/api/forbidden');
        expect.unreachable('Should have thrown an ApiError');
      } catch (err: any) {
        expect(err.message).toBe('Request failed with status 403');
        expect(err.statusCode).toBe(403);
      }
    });

    it('handles HTTP error response when response is non-JSON text', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        json: async () => {
          throw new SyntaxError('Unexpected token < in JSON at position 0');
        },
      });
      globalThis.fetch = fetchMock;

      try {
        await apiFetch('/api/bad-gateway');
        expect.unreachable('Should have thrown an ApiError');
      } catch (err: any) {
        expect(err).toBeInstanceOf(Error);
        expect(err).toBeInstanceOf(ApiError);
        expect(err.message).toBe('Request failed with status 502');
        expect(err.statusCode).toBe(502);
        expect(err.data).toBeUndefined();
      }
    });

    it('handles HTTP error response when reading response body fails', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => {
          throw new Error('Socket closed prematurely');
        },
      });
      globalThis.fetch = fetchMock;

      try {
        await apiFetch('/api/service-unavailable');
        expect.unreachable('Should have thrown an ApiError');
      } catch (err: any) {
        expect(err.message).toBe('Request failed with status 503');
        expect(err.statusCode).toBe(503);
      }
    });

    it('prefixes URL with apiBaseUrl configured in runtimeConfig', async () => {
      (globalThis as any).useRuntimeConfig = () => ({
        public: {
          apiBaseUrl: 'http://localhost:8080',
        },
      });

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ status: 'ok' }),
      });
      globalThis.fetch = fetchMock;

      await apiFetch('/api/notes');

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url] = fetchMock.mock.calls[0];
      expect(url).toBe('http://localhost:8080/api/notes');
    });

    it('preserves custom credentials option if provided', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
      });
      globalThis.fetch = fetchMock;

      await apiFetch('/api/public-info', {
        credentials: 'omit',
      });

      const [, options] = fetchMock.mock.calls[0];
      expect(options.credentials).toBe('omit');
    });
  });
});
