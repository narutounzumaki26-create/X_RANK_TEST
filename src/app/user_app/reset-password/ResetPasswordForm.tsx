// app/user_app/reset-password/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';


export default function ResetPasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    // Check if user is authenticated (came from the reset link)
    const checkUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
          console.error('Error getting user:', error);
          setMessage('Erreur de vérification de session.');
          setCheckingAuth(false);
          return;
        }
        
        if (!user) {
          setMessage('❌ Session invalide ou expirée. Veuillez demander un nouveau lien de réinitialisation.');
          setCheckingAuth(false);
          return;
        }
        
        setUser(user);
        setCheckingAuth(false);
      } catch (error) {
        console.error('Unexpected error:', error);
        setMessage('Erreur inattendue lors de la vérification.');
        setCheckingAuth(false);
      }
    };

    checkUser();
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    if (!user) {
      setMessage('Session invalide. Veuillez demander un nouveau lien.');
      return;
    }

    if (!newPassword || !confirmPassword) {
      setMessage('Veuillez remplir tous les champs.');
      return;
    }

    if (newPassword.length < 6) {
      setMessage('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage('Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        setMessage(`Erreur : ${error.message}`);
      } else {
        setMessage('✅ Mot de passe réinitialisé avec succès ! Redirection vers la page de connexion...');
        
        // Sign out and redirect to login after delay
        setTimeout(async () => {
          await supabase.auth.signOut();
          router.push('/user_app/login');
        }, 3000);
      }
    } catch (err) {
      console.error(err);
      setMessage('Une erreur inattendue est survenue.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="text-xl font-semibold text-blue-600">
                Vérification en cours...
              </div>
              <p className="text-gray-600">Vérification de votre session</p>
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4">
          <CardTitle className="text-2xl font-bold text-center">
            Nouveau mot de passe
          </CardTitle>
          <CardDescription className="text-center">
            {user 
              ? "Choisissez votre nouveau mot de passe" 
              : "Session invalide"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!user ? (
            <div className="text-center space-y-4">
              <p className="text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
                {message}
              </p>
              <Button 
                onClick={() => router.push('/user_app/forgot-password')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                Demander un nouveau lien
              </Button>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-sm font-medium">
                  Nouveau mot de passe
                </Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Saisissez votre nouveau mot de passe"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full"
                />
                <p className="text-xs text-gray-500">Minimum 6 caractères</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">
                  Confirmer le mot de passe
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirmez votre nouveau mot de passe"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full"
                />
              </div>
              
              <Button 
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                disabled={loading}
              >
                {loading ? "Réinitialisation..." : "Réinitialiser le mot de passe"}
              </Button>
              
              {message && (
                <div className={`p-3 rounded-lg text-center text-sm ${
                  message.includes('✅') 
                    ? 'bg-green-100 text-green-700 border border-green-200' 
                    : 'bg-red-100 text-red-700 border border-red-200'
                }`}>
                  {message}
                </div>
              )}
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
