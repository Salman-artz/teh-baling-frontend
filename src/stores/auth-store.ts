import { create } from 'zustand';

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'BOOTH_ATTENDANT' | 'PRODUCTION';
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  setAuth: (user: AuthUser, token: string, refreshToken?: string) => void;
  logout: () => Promise<void>;
  isAuthenticated: () => boolean;
}

// Cookie Helper Functions for Secure Token Handling (H-2)
function setCookie(name: string, value: string, maxAgeSeconds: number = 86400) {
  if (typeof document !== 'undefined') {
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax; Secure=${window.location.protocol === 'https:'}`;
  }
}

function deleteCookie(name: string) {
  if (typeof document !== 'undefined') {
    document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax;`;
  }
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('auth_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: typeof window !== 'undefined' ? getStoredUser() : null,
  accessToken: typeof window !== 'undefined' ? getCookie('access_token') || localStorage.getItem('access_token') : null,
  refreshToken: typeof window !== 'undefined' ? getCookie('refresh_token') || localStorage.getItem('refresh_token') : null,

  setAuth: (user, accessToken, refreshToken) => {
    // H-2 Fix: Store token in secure cookie for SSR route protection and localStorage for fallback
    setCookie('access_token', accessToken, 86400);
    if (refreshToken) {
      setCookie('refresh_token', refreshToken, 7 * 86400);
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('auth_user', JSON.stringify(user));
      if (refreshToken) localStorage.setItem('refresh_token', refreshToken);
    }

    set({ user, accessToken, refreshToken: refreshToken || null });
  },

  logout: async () => {
    const currentToken = get().accessToken;
    // M-1 Fix: Server-side token revocation call
    if (currentToken && typeof window !== 'undefined') {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
        await fetch(`${apiUrl}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${currentToken}`,
          },
        }).catch(() => {});
      } catch {
        // Continue logout even if network fails
      }
    }

    deleteCookie('access_token');
    deleteCookie('refresh_token');

    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('auth_user');
    }

    set({ user: null, accessToken: null, refreshToken: null });
  },

  isAuthenticated: () => get().accessToken !== null,
}));
