// app/user_app/forgot-password/page.tsx
'use client';

import { useState } from "react";
import { supabasepwd } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const supabase = supabasepwd;
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    
    if (!email) {
      setMessage("Veuillez entrer votre email.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setMessage("Veuillez entrer une adresse email valide.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://x-rank-test.vercel.app/user_app/auth/callback',
      });

      if (error) {
        setMessage(`Erreur: ${error.message}`);
      } else {
        setMessage("✅ Email envoyé! Utilisez le lien dans votre email.");
      }
    } catch (err) {
      console.error(err);
      setMessage("Une erreur inattendue est survenue.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4">
          <CardTitle className="text-2xl font-bold text-center">
            Mot de passe oublié ?
          </CardTitle>
          <CardDescription className="text-center">
            Entrez votre adresse email pour recevoir un lien de réinitialisation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-gray-700 block">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full"
              />
            </div>
            
            <Button 
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              disabled={loading}
            >
              {loading ? "Envoi en cours..." : "Envoyer le lien de réinitialisation"}
            </Button>
            
            {message && (
              <div className={`p-3 rounded-lg text-center text-sm ${
                message.includes("✅") 
                  ? "bg-green-100 text-green-700 border border-green-200" 
                  : "bg-red-100 text-red-700 border border-red-200"
              }`}>
                {message}
              </div>
            )}
            
            <div className="text-center pt-4 border-t">
              <Link 
                href="/user_app/login" 
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                ← Retour à la connexion
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
