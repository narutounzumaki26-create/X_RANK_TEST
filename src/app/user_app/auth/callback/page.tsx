// app/user_app/auth/callback/page.tsx
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    // 🔥 IMMEDIATE FIX: Redirect if we're on the wrong domain
    if (window.location.hostname !== 'x-rank.vercel.app') {
      const correctUrl = new URL('https://x-rank.vercel.app/user_app/auth/callback');
      correctUrl.search = window.location.search;
      correctUrl.hash = window.location.hash;
      window.location.href = correctUrl.toString();
      return;
    }

    const handleCallback = async () => {
      try {
        const code = searchParams?.get('code');
        const error = searchParams?.get('error');

        if (error) {
          console.error('Auth error:', error);
          setStatus('error');
          return;
        }

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          
          if (exchangeError) {
            console.error('Error exchanging code:', exchangeError);
            setStatus('error');
          } else {
            setStatus('success');
            setTimeout(() => {
              router.push('/user_app/reset-password');
            }, 1000);
          }
        } else {
          setStatus('error');
        }
      } catch (error) {
        console.error('Unexpected error:', error);
        setStatus('error');
      }
    };

    handleCallback();
  }, [router, searchParams]);

  // ... rest of your component
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthCallbackContent />
    </Suspense>
  );
}
