// app/user_app/auth/callback/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    // Simple redirect - let the reset password page handle auth
    setTimeout(() => {
      router.push('/user_app/reset-password');
    }, 1000);
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-blue-600">Redirection...</h2>
      </div>
    </div>
  );
}
