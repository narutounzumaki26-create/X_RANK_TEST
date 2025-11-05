// app/user_app/auth/callback/page.tsx
'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleAuth = async () => {
      try {
        // Get all possible parameters Supabase might use
        const code = searchParams?.get('code');
        const token = searchParams?.get('token');
        const type = searchParams?.get('type');
        
        console.log('🔍 Auth Callback - URL Parameters:', {
          code,
          token, 
          type,
          fullUrl: window.location.href
        });

        // Use whatever parameter Supabase provided
        const authCode = code || token;

        if (!authCode) {
          console.error('❌ No auth code found in URL');
          router.push('/user_app/forgot-password?error=no_code');
          return;
        }

        console.log('🔄 Exchanging code for session...');
        
        // Exchange the code for a session
        const { data, error } = await supabase.auth.exchangeCodeForSession(authCode);

        if (error) {
          console.error('❌ Auth exchange error:', error);
          router.push('/user_app/forgot-password?error=auth_failed');
          return;
        }

        console.log('✅ Auth successful! User:', data.user);
        
        // Success - redirect to reset password
        router.push('/user_app/reset-password');
        
      } catch (error) {
        console.error('💥 Unexpected error:', error);
        router.push('/user_app/forgot-password?error=unexpected');
      }
    };

    handleAuth();
  }, [router, searchParams]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-blue-600 mb-2">Traitement en cours...</h2>
        <p>Connexion en cours, veuillez patienter</p>
        <div className="mt-4 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="text-xl font-semibold text-blue-600">Chargement...</div>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
