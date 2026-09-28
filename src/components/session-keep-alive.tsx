'use client';

import { useEffect, useRef } from 'react';
import { getAuthToken, getRefreshToken, isTokenExpiringSoon, refreshAuthToken } from '@/lib/api-client';

export function SessionKeepAlive() {
  const lastActiveRef = useRef<number>(Date.now());
  const lastThrottleRef = useRef<number>(0);

  useEffect(() => {
    // Record user activity with throttling (max once per 10 seconds)
    const handleUserActivity = () => {
      const now = Date.now();
      if (now - lastThrottleRef.current > 10000) {
        lastThrottleRef.current = now;
        lastActiveRef.current = now;
      }
    };

    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    activityEvents.forEach((evt) => {
      window.addEventListener(evt, handleUserActivity, { passive: true });
    });

    // Keep-alive checker function
    const checkAndRefreshToken = async () => {
      const refreshToken = getRefreshToken();
      if (!refreshToken) return;

      const token = getAuthToken();
      const now = Date.now();
      const timeSinceLastActive = now - lastActiveRef.current;

      // As long as the user interacted within the last 60 minutes or tab is open
      // and token is within 15 minutes of expiration (or expired), refresh it
      if (timeSinceLastActive < 60 * 60 * 1000 || document.visibilityState === 'visible') {
        if (isTokenExpiringSoon(token, 15 * 60)) {
          await refreshAuthToken();
        }
      }
    };

    // Listen to tab visibility & focus to refresh when user returns to tab
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        lastActiveRef.current = Date.now();
        checkAndRefreshToken();
      }
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    // Periodic check every 2 minutes
    const interval = setInterval(checkAndRefreshToken, 2 * 60 * 1000);

    return () => {
      activityEvents.forEach((evt) => {
        window.removeEventListener(evt, handleUserActivity);
      });
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      clearInterval(interval);
    };
  }, []);

  return null;
}
