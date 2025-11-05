'use client';

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    setMessage('');
    if (!email) {
      setMessage("Veuillez entrer votre email.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password` // page de saisie du nouveau mot de passe
      });

      if (error) {
        setMessage(`Erreur : ${error.message}`);
      } else {
        setMessage("Un email de réinitialisation a été envoyé !");
      }
    } catch (err) {
      console.error(err);
      setMessage("Erreur inattendue.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Réinitialiser le mot de passe</CardTitle>
          <CardDescription>Entrez votre email pour recevoir un lien de réinitialisation.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Input
            type="email"
            placeholder="Votre email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button
            className="bg-blue-500 hover:bg-blue-600"
            onClick={handleResetPassword}
            disabled={loading}
          >
            {loading ? "Chargement..." : "Envoyer"}
          </Button>
          {message && (
            <p className={`text-center ${message.includes("envoyé") ? "text-green-600" : "text-red-600"}`}>
              {message}
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
