'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';

export default function RegisterRedirectPage() {
  const router = useRouter();
  const { user, accessToken } = useAuthStore();

  useEffect(() => {
    if (user && accessToken) {
      if (user.role === 'BOOTH_ATTENDANT') {
        router.replace('/attendant');
      } else if (user.role === 'PRODUCTION') {
        router.replace('/production');
      } else {
        router.replace('/admin');
      }
    } else {
      router.replace('/login');
    }
  }, [user, accessToken, router]);

  return null;
}
