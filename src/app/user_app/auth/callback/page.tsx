// app/user_app/auth/callback/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams?.get('code');
        const error = searchParams?.get('error');
        const errorDescription = searchParams?.get('error_description');

        if (error) {
          console.error('Auth error:', error, errorDescription);
          setStatus('error');
          setTimeout(() => {
            router.push('/user_app/forgot-password?error=auth_failed');
          }, 2000);
          return;
        }

        if (code) {
          // Exchange the code for a session
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          
          if (exchangeError) {
            console.error('Error exchanging code:', exchangeError);
            setStatus('error');
            setTimeout(() => {
              router.push('/user_app/forgot-password?error=invalid_link');
            }, 2000);
          } else {
            // Successfully authenticated, redirect to reset password page
            setStatus('success');
            setTimeout(() => {
              router.push('/user_app/reset-password');
            }, 1000);
          }
        } else {
          // No code found
          setStatus('error');
          setTimeout(() => {
            router.push('/user_app/forgot-password');
          }, 2000);
        }
      } catch (error) {
        console.error('Unexpected error:', error);
        setStatus('error');
        setTimeout(() => {
          router.push('/user_app/forgot-password?error=unexpected_error');
        }, 2000);
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
          color: "text-blue-600"
        };
      case 'success':
        return {
          title: "Succès !",
          message: "Redirection vers la page de réinitialisation...",
          color: "text-green-600"
        };
      case 'error':
        return {
          title: "Erreur",
          message: "Lien invalide ou expiré. Redirection...",
          color: "text-red-600"
        };
      default:
        return {
          title: "Traitement en cours...",
          message: "Veuillez patienter",
          color: "text-blue-600"
        };
    }
  };

  const statusInfo = getStatusMessage();

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
