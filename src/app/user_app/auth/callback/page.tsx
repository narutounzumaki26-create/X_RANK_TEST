// app/user_app/auth/callback/page.tsx
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams?.get('code');
        const error = searchParams?.get('error');
        const errorDescription = searchParams?.get('error_description');

        console.log('Callback params:', { code, error, errorDescription });

        if (error) {
          console.error('Auth error from URL:', error, errorDescription);
          setErrorMessage(errorDescription || 'Erreur d\'authentification');
          setStatus('error');
          return;
        }

        if (!code) {
          console.error('No code found in URL');
          setErrorMessage('Aucun code de vérification trouvé');
          setStatus('error');
          return;
        }

        // Exchange the code for a session
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        
        console.log('Exchange result:', { data, exchangeError });

        if (exchangeError) {
          console.error('Error exchanging code:', exchangeError);
          
          if (exchangeError.message?.includes('expired') || exchangeError.message?.includes('invalid')) {
            setErrorMessage('Le lien de réinitialisation a expiré ou est invalide');
          } else {
            setErrorMessage(`Erreur: ${exchangeError.message}`);
          }
          setStatus('error');
        } else {
          console.log('Session exchange successful, user:', data.user);
          setStatus('success');
          // Redirect to reset password page after a short delay
          setTimeout(() => {
            router.push('/user_app/reset-password');
          }, 1500);
        }
      } catch (error) {
        console.error('Unexpected error in callback:', error);
        setErrorMessage('Une erreur inattendue est survenue');
        setStatus('error');
      }
    };

    handleCallback();
  }, [router, searchParams]);

  const handleRequestNewLink = () => {
    router.push('/user_app/forgot-password');
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-full max-w-md mx-4 bg-white rounded-lg shadow-lg p-6">
          <div className="text-center space-y-4">
            <div className="text-2xl font-semibold text-blue-600">
              Traitement en cours...
            </div>
            <p className="text-gray-600">Vérification de votre lien de réinitialisation</p>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-full max-w-md mx-4 bg-white rounded-lg shadow-lg p-6">
          <div className="text-center space-y-4">
            <div className="text-2xl font-semibold text-green-600">
              Succès !
            </div>
            <p className="text-gray-600">Redirection vers la page de réinitialisation...</p>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md mx-4 bg-white rounded-lg shadow-lg p-6">
        <div className="text-center space-y-4">
          <div className="text-2xl font-semibold text-red-600">
            Erreur
          </div>
          <p className="text-gray-600">{errorMessage}</p>
          
          <button 
            onClick={handleRequestNewLink}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium"
          >
            Demander un nouveau lien
          </button>

          <div className="text-sm text-gray-500 mt-4">
            <p>Si le problème persiste, vérifiez que :</p>
            <ul className="list-disc list-inside text-left mt-2 space-y-1">
              <li>Vous utilisez le lien le plus récent</li>
              <li>Le lien n'a pas expiré (24h maximum)</li>
              <li>Vous n'avez pas déjà utilisé ce lien</li>
            </ul>
          </div>
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
