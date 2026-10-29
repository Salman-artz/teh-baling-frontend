import { useAuthStore } from '@/stores/auth-store';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
  meta?: { page: number; limit: number; total: number };
};

export interface JwtPayload {
  id?: string;
  email?: string;
  role?: string;
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}

export function parseJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload) as JwtPayload;
  } catch {
    return null;
  }
}

export function isTokenExpiringSoon(token: string | null, thresholdSeconds = 120): boolean {
  if (!token) return true;
  const payload = parseJwtPayload(token);
  if (!payload || !payload.exp) return false;
  const nowInSeconds = Math.floor(Date.now() / 1000);
  return payload.exp - nowInSeconds <= thresholdSeconds;
}

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  // First attempt from cookie
  const match = document.cookie.match(/(^| )access_token=([^;]+)/);
  if (match) return decodeURIComponent(match[2]);
  // Fallback to localStorage
  return localStorage.getItem('access_token') || localStorage.getItem('tehbaling_token');
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  const match = document.cookie.match(/(^| )refresh_token=([^;]+)/);
  if (match) return decodeURIComponent(match[2]);
  return localStorage.getItem('refresh_token');
}

let activeRefreshPromise: Promise<string | null> | null = null;

export async function refreshAuthToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  if (activeRefreshPromise) {
    return activeRefreshPromise;
  }

  activeRefreshPromise = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      return null;
    }

    const rfPayload = parseJwtPayload(refreshToken);
    const nowInSeconds = Math.floor(Date.now() / 1000);
    if (rfPayload && rfPayload.exp && rfPayload.exp <= nowInSeconds) {
      useAuthStore.getState().logout();
      return null;
    }

    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          useAuthStore.getState().logout();
        }
        return null;
      }

      const json = await res.json();
      if (json.success && json.data?.accessToken) {
        useAuthStore.getState().setAuth(
          json.data.user,
          json.data.accessToken,
          json.data.refreshToken || refreshToken
        );
        return json.data.accessToken as string;
      }

      return null;
    } catch (err) {
      console.error('[Token Refresh Network Error]:', err);
      return null;
    } finally {
      activeRefreshPromise = null;
    }
  })();

  return activeRefreshPromise;
}

export async function downloadFile(endpoint: string, fallbackFilename: string): Promise<boolean> {
  let token = getAuthToken();
  if (token && isTokenExpiringSoon(token, 60)) {
    const refreshed = await refreshAuthToken();
    if (refreshed) token = refreshed;
  }

  const sep = endpoint.includes('?') ? '&' : '?';
  const url = `${API_URL}${endpoint}${token ? `${sep}token=${encodeURIComponent(token)}` : ''}`;

  try {
    const res = await fetch(url, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      const errMsg = errJson?.error?.message || `Gagal mengunduh file (HTTP ${res.status})`;
      alert(errMsg);
      return false;
    }

    const blob = await res.blob();
    const disposition = res.headers.get('content-disposition');
    let filename = fallbackFilename;
    if (disposition && disposition.includes('filename=')) {
      const parts = disposition.split('filename=');
      if (parts[1]) {
        filename = parts[1].replace(/["']/g, '').trim();
      }
    }

    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(blobUrl);
    return true;
  } catch (err) {
    console.error('[Download error]:', err);
    alert('Terjadi kesalahan saat mengunduh file.');
    return false;
  }
}

interface InFlightRequestEntry {
  promise: Promise<ApiResponse<unknown>>;
  controller: AbortController;
}

const inFlightGetRequests = new Map<string, InFlightRequestEntry>();

/**
 * Abort all pending in-flight GET requests (called on page/route navigation).
 */
export function cancelAllPendingRequests(reason = 'Navigation'): void {
  for (const entry of inFlightGetRequests.values()) {
    try {
      entry.controller.abort(reason);
    } catch {
      // Ignore if already aborted
    }
  }
  inFlightGetRequests.clear();
}

export async function apiClient<T>(
  endpoint: string,
  options?: RequestInit,
  isRetry = false
): Promise<ApiResponse<T>> {
  const isGet = !options || !options.method || options.method === 'GET';
  if (isGet && inFlightGetRequests.has(endpoint) && !isRetry) {
    return inFlightGetRequests.get(endpoint)!.promise as Promise<ApiResponse<T>>;
  }

  const controller = new AbortController();
  if (options?.signal) {
    if (options.signal.aborted) {
      controller.abort(options.signal.reason);
    } else {
      options.signal.addEventListener(
        'abort',
        () => {
          try {
            controller.abort(options.signal?.reason);
          } catch {
            // Ignore
          }
        },
        { once: true }
      );
    }
  }

  let token = getAuthToken();
  if (token && isTokenExpiringSoon(token, 60)) {
    const refreshed = await refreshAuthToken();
    if (refreshed) token = refreshed;
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options?.headers,
  };

  const reqPromise = (async () => {
    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        signal: controller.signal,
        headers,
      });

      if (res.status === 401 && !isRetry) {
        const refreshedToken = await refreshAuthToken();
        if (refreshedToken) {
          return apiClient<T>(endpoint, options, true);
        } else if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
          useAuthStore.getState().logout();
          window.location.replace('/login');
        }
      }

      const json = (await res.json()) as ApiResponse<T>;

      if (!json.success && json.error?.code === 'UNAUTHORIZED' && !isRetry) {
        const refreshedToken = await refreshAuthToken();
        if (refreshedToken) {
          return apiClient<T>(endpoint, options, true);
        }
      }

      return json;
    } catch (err: unknown) {
      if (
        (err instanceof Error && (err.name === 'AbortError' || err.message?.includes('aborted'))) ||
        controller.signal.aborted
      ) {
        return { success: false, error: { code: 'REQUEST_ABORTED', message: 'Permintaan dibatalkan.' } };
      }
      return { success: false, error: { code: 'NETWORK_ERROR', message: 'Koneksi jaringan terputus.' } };
    } finally {
      if (isGet) {
        inFlightGetRequests.delete(endpoint);
      }
    }
  })();

  if (isGet && !isRetry) {
    inFlightGetRequests.set(endpoint, {
      promise: reqPromise,
      controller,
    });
  }

  return reqPromise;
}

export const api = {
  get: <T>(endpoint: string, options?: RequestInit) => apiClient<T>(endpoint, options),
  post: <T>(endpoint: string, body: unknown, options?: RequestInit) =>
    apiClient<T>(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(endpoint: string, body: unknown, options?: RequestInit) =>
    apiClient<T>(endpoint, { ...options, method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(endpoint: string, options?: RequestInit) =>
    apiClient<T>(endpoint, { ...options, method: 'DELETE' }),
};
