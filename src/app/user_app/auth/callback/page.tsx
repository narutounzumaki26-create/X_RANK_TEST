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

  const getStatusMessage = () => {
    switch (status) {
      case 'loading':
        return {
          title: "Traitement en cours...",
          message: "Vérification de votre lien de réinitialisation",
          color: "text-blue-600",
          action: null
        };
      case 'success':
        return {
          title: "Succès !",
          message: "Redirection vers la page de réinitialisation...",
          color: "text-green-600",
          action: null
        };
      case 'error':
        return {
          title: "Erreur",
          message: "Lien invalide ou erreur de traitement.",
          color: "text-red-600",
          action: "request_new"
        };
      default:
        return {
          title: "Traitement en cours...",
          message: "Veuillez patienter",
          color: "text-blue-600",
          action: null
        };
    }
  };

  const statusInfo = getStatusMessage();

  const handleRequestNewLink = () => {
    router.push('/user_app/forgot-password');
  };

  // ✅ RETURN JSX properly
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md mx-4 bg-white rounded-lg shadow-lg p-6">
        <div className="text-center space-y-4">
          <div className={`text-2xl font-semibold ${statusInfo.color}`}>
            {statusInfo.title}
          </div>
          <p className="text-gray-600">{statusInfo.message}</p>
          
          {status === 'loading' && (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}
          
          {status === 'error' && (
            <button 
              onClick={handleRequestNewLink}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg mt-4"
            >
              Demander un nouveau lien
            </button>
          )}
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
