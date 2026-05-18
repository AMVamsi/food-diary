/**
 * Tests for the axios interceptors in api/client.ts.
 *
 * Interceptors are invoked directly by extracting their handler functions
 * from client.interceptors.*.handlers[0]. This tests the actual interceptor
 * logic without making real HTTP calls.
 *
 * Covers client.ts lines 13-24: request interceptor (Authorization header)
 * Covers client.ts lines 27-71: response interceptor (401, 429, 5xx, no-response)
 */

import { client } from '../client';
import { useAuthStore } from '../../store/auth';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/Toast';

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  getItemAsync: jest.fn().mockResolvedValue(null),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      refreshSession: jest.fn(),
    },
  },
}));

jest.mock('../../components/Toast', () => ({
  showToast: jest.fn(),
}));

type RequestConfig = {
  headers: Record<string, string | undefined>;
  data: unknown;
};

type ResponseError = {
  config: { _retried?: boolean; headers?: Record<string, string> };
  response?: { status: number };
  message?: string;
};

// Extract the interceptor handlers once after module load
const reqHandlers = (
  client.interceptors.request as unknown as {
    handlers: { fulfilled: (config: RequestConfig) => RequestConfig }[];
  }
).handlers;
const requestInterceptor = reqHandlers[0].fulfilled;

const resHandlers = (
  client.interceptors.response as unknown as {
    handlers: { rejected: (error: ResponseError) => Promise<unknown> }[];
  }
).handlers;
const responseErrorHandler = resHandlers[0].rejected;

beforeEach(() => {
  jest.clearAllMocks();
  // Reset auth store state between tests
  useAuthStore.setState({ token: null, userId: null, isLoading: false });
});

// ── Request interceptor ────────────────────────────────────────────────────────

describe('request interceptor', () => {
  it('attaches Authorization header when token is present', () => {
    // Covers client.ts lines 14-16: token → config.headers.Authorization
    useAuthStore.setState({ token: 'test-jwt-token', userId: 'user-1', isLoading: false });

    const config = { headers: {} as Record<string, string>, data: null };
    const result = requestInterceptor(config);

    expect(result.headers['Authorization']).toBe('Bearer test-jwt-token');
  });

  it('does not set Authorization header when token is null', () => {
    // Covers client.ts lines 13-16: no token → header not set
    useAuthStore.setState({ token: null, userId: null, isLoading: false });

    const config = { headers: {} as Record<string, string>, data: null };
    const result = requestInterceptor(config);

    expect(result.headers['Authorization']).toBeUndefined();
  });

  it('sets Content-Type to application/json for non-FormData bodies', () => {
    // Covers client.ts lines 18-23: non-FormData → Content-Type set
    const config = { headers: {} as Record<string, string>, data: { foo: 'bar' } };
    const result = requestInterceptor(config);

    expect(result.headers['Content-Type']).toBe('application/json');
  });

  it('does not set Content-Type for FormData bodies', () => {
    // Covers client.ts line 21: FormData → skip Content-Type
    const config = { headers: {} as Record<string, string>, data: new FormData() };
    const result = requestInterceptor(config);

    expect(result.headers['Content-Type']).toBeUndefined();
  });
});

// ── Response error interceptor ─────────────────────────────────────────────────

describe('response error interceptor — 401', () => {
  it('calls clearAuth and rejects when 401 and request was already retried', async () => {
    // Covers client.ts lines 34-57: 401 with _retried=true → skip refresh → clearAuth
    await useAuthStore.getState().setAuth('old-token', 'user-1');
    expect(useAuthStore.getState().token).toBe('old-token');

    const mockError = {
      config: { _retried: true, headers: {} },
      response: { status: 401 },
      message: 'Unauthorized',
    };

    await expect(responseErrorHandler(mockError)).rejects.toBeDefined();

    // clearAuth should have cleared the store
    expect(useAuthStore.getState().token).toBeNull();
  });

  it('calls clearAuth and rejects when 401 and refresh session fails', async () => {
    // Covers client.ts lines 39-56: refresh throws → clearAuth
    (supabase.auth.refreshSession as jest.Mock).mockRejectedValue(new Error('refresh failed'));
    await useAuthStore.getState().setAuth('old-token', 'user-1');

    const mockError = {
      config: { _retried: false, headers: {} },
      response: { status: 401 },
      message: 'Unauthorized',
    };

    await expect(responseErrorHandler(mockError)).rejects.toBeDefined();
    expect(useAuthStore.getState().token).toBeNull();
  });
});

describe('response error interceptor — 429', () => {
  it('calls showToast with warning when status is 429', async () => {
    // Covers client.ts lines 61-62: status 429 → showToast warning
    const mockError = {
      config: {},
      response: { status: 429 },
      message: 'Too Many Requests',
    };

    await expect(responseErrorHandler(mockError)).rejects.toBeDefined();
    expect(showToast).toHaveBeenCalledWith('Too many requests — please wait a moment', 'warning');
  });
});

describe('response error interceptor — 5xx', () => {
  it('calls showToast with error when status is 500', async () => {
    // Covers client.ts lines 63-64: status >= 500 → showToast error
    const mockError = {
      config: {},
      response: { status: 500 },
      message: 'Internal Server Error',
    };

    await expect(responseErrorHandler(mockError)).rejects.toBeDefined();
    expect(showToast).toHaveBeenCalledWith('Something went wrong — please try again', 'error');
  });

  it('calls showToast with error when status is 503', async () => {
    const mockError = {
      config: {},
      response: { status: 503 },
      message: 'Service Unavailable',
    };

    await expect(responseErrorHandler(mockError)).rejects.toBeDefined();
    expect(showToast).toHaveBeenCalledWith('Something went wrong — please try again', 'error');
  });
});

describe('response error interceptor — network error', () => {
  it('calls showToast with no-connection message when response is undefined', async () => {
    // Covers client.ts lines 65-67: error.response === undefined → no internet toast
    const mockError = {
      config: {},
      response: undefined,
      message: 'Network Error',
    };

    await expect(responseErrorHandler(mockError)).rejects.toBeDefined();
    expect(showToast).toHaveBeenCalledWith('No internet connection', 'error');
  });
});
