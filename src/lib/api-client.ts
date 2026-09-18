const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
  meta?: { page: number; limit: number; total: number };
};

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  // First attempt from cookie
  const match = document.cookie.match(/(^| )access_token=([^;]+)/);
  if (match) return decodeURIComponent(match[2]);
  // Fallback to localStorage (check access_token and tehbaling_token)
  return localStorage.getItem('access_token') || localStorage.getItem('tehbaling_token');
}

export async function downloadFile(endpoint: string, fallbackFilename: string): Promise<boolean> {
  const token = getAuthToken();
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

const inFlightGetRequests = new Map<string, Promise<ApiResponse<unknown>>>();

export async function apiClient<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const isGet = !options || !options.method || options.method === 'GET';
  if (isGet && inFlightGetRequests.has(endpoint)) {
    return inFlightGetRequests.get(endpoint) as Promise<ApiResponse<T>>;
  }

  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options?.headers,
  };

  const reqPromise = (async () => {
    try {
      const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
      const json = (await res.json()) as ApiResponse<T>;
      return json;
    } catch {
      return { success: false, error: { code: 'NETWORK_ERROR', message: 'Koneksi jaringan terputus.' } };
    } finally {
      if (isGet) {
        inFlightGetRequests.delete(endpoint);
      }
    }
  })();

  if (isGet) {
    inFlightGetRequests.set(endpoint, reqPromise);
  }

  return reqPromise;
}

export const api = {
  get: <T>(endpoint: string) => apiClient<T>(endpoint),
  post: <T>(endpoint: string, body: unknown) =>
    apiClient<T>(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(endpoint: string, body: unknown) =>
    apiClient<T>(endpoint, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(endpoint: string) => apiClient<T>(endpoint, { method: 'DELETE' }),
};
