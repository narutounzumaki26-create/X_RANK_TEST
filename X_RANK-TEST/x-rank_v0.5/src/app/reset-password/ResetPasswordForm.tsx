'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // 👇 get the correct token from the URL
  const accessToken = searchParams.get('access_token')

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  // 👇 exchange the access token for a session
  useEffect(() => {
    const initSession = async () => {
      if (accessToken) {
        const { error } = await supabase.auth.exchangeCodeForSession(accessToken)
        if (error) {
          setMessage('Erreur : ' + error.message)
        }
      } else {
        setMessage('Lien invalide ou manquant.')
      }
      setLoading(false)
    }
    initSession()
  }, [accessToken])

  const handleReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setMessage('')

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
      setMessage('Mot de passe réinitialisé avec succès !')
      setTimeout(() => router.push('/login'), 2000)
    }
  }

  if (loading) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-50">
        <p>Chargement...</p>
      </main>
    )
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-50">
      <div className="w-full max-w-md bg-white p-6 rounded-2xl shadow space-y-4">
        <h1 className="text-2xl font-bold text-center">Réinitialisation du mot de passe</h1>
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
          {message && <p className="text-red-600 text-sm">{message}</p>}
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
