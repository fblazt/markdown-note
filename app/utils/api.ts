export class ApiError<T = unknown> extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public data?: T
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiErrorPayload<T = unknown> {
  statusCode?: number;
  statusMessage?: string;
  message?: string;
  data?: T;
}

export function getApiBaseUrl(): string {
  try {
    return useRuntimeConfig().public.apiBaseUrl || '';
  } catch {
    return typeof process !== 'undefined' ? process.env?.NUXT_PUBLIC_API_BASE_URL || '' : '';
  }
}

export function resolveApiUrl(path: string, baseUrl?: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const base = baseUrl !== undefined ? baseUrl : getApiBaseUrl();
  if (!base) {
    return path;
  }

  const cleanBase = base.replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
}

export async function apiFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const url = resolveApiUrl(path);

  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: options.credentials || 'include',
  });

  if (!response.ok) {
    let payload: ApiErrorPayload | undefined;
    try {
      payload = await response.json();
    } catch {}

    const message =
      payload?.statusMessage ||
      payload?.message ||
      `Request failed with status ${response.status}`;

    throw new ApiError(message, payload?.statusCode ?? response.status, payload?.data);
  }

  if (response.status === 204) {
    return {} as T;
  }

  const result = await response.json();
  if (result && typeof result === 'object' && 'data' in result && 'statusCode' in result) {
    return result.data as T;
  }

  return result as T;
}

