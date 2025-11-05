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
    const handleAuth = async () => {
      try {
        // Get the code from URL parameters
        const code = searchParams?.get('code');
        
        if (!code) {
          console.error('No code found in URL');
          setStatus('error');
          return;
        }

        console.log('Processing auth code:', code);

        // Exchange the code for a session
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          console.error('Auth error:', error);
          setStatus('error');
          return;
        }

        console.log('Auth successful, user:', data.user);
        
        // Success - redirect to reset password
        setStatus('success');
        setTimeout(() => {
          router.push('/user_app/reset-password');
        }, 1000);

      } catch (error) {
        console.error('Unexpected error:', error);
        setStatus('error');
      }
    };

    handleAuth();
  }, [router, searchParams]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-blue-600 mb-2">Traitement en cours...</h2>
          <p>Vérification de votre lien</p>
          <div className="mt-4 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-green-600 mb-2">Succès !</h2>
          <p>Redirection vers la page de réinitialisation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center max-w-md mx-4">
        <h2 className="text-xl font-semibold text-red-600 mb-2">Erreur</h2>
        <p className="mb-4">Le lien est invalide ou a expiré.</p>
        <button 
          onClick={() => router.push('/user_app/forgot-password')}
          className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg"
        >
          Demander un nouveau lien
        </button>
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
