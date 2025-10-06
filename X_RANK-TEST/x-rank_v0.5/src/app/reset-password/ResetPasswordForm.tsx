'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const accessToken = searchParams.get('access_token')

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initSession = async () => {
      if (accessToken) {
        // ✅ On crée une session avec uniquement l'access_token
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: ''
        })
        if (error) setMessage('Erreur : ' + error.message)
      } else {
        setMessage('Lien invalide ou expiré.')
      }
      setLoading(false)
    }
    initSession()
  }, [accessToken])

  const handleReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!newPassword || !confirmPassword) {
      setMessage('Veuillez remplir tous les champs.')
      return
    }
    if (newPassword !== confirmPassword) {
      setMessage('Les mots de passe ne correspondent pas.')
      return
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      setMessage('Erreur : ' + error.message)
    } else {
      setMessage('✅ Mot de passe réinitialisé avec succès !')
      setTimeout(() => router.push('/login'), 2000)
    }
  }

  if (loading) {
    return (
      <main className="flex items-center justify-center min-h-screen bg-gray-50">
        <p>Chargement...</p>
      </main>
    )
  }

  return (
    <main className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md bg-white p-6 rounded-2xl shadow">
        <h1 className="text-2xl font-bold text-center mb-4">
          Réinitialisation du mot de passe
        </h1>

        <form onSubmit={handleReset} className="space-y-3">
          <input
            type="password"
            placeholder="Nouveau mot de passe"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full border rounded-lg p-2"
          />

          <input
            type="password"
            placeholder="Confirmer le mot de passe"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full border rounded-lg p-2"
          />

          {message && (
            <p
              className={`text-sm ${
                message.startsWith('Erreur') ? 'text-red-600' : 'text-green-600'
              }`}
            >
              {message}
            </p>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
          >
            Réinitialiser
          </button>
        </form>
      </div>
    </main>
  )
}
