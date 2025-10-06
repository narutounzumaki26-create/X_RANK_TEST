'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

function ResetPasswordFormContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsReady(true)
        setMessage('Veuillez entrer votre nouveau mot de passe')
      } else if (event === 'SIGNED_IN') {
        setIsReady(true)
        setMessage('Veuillez entrer votre nouveau mot de passe')
      }
    })

    // Check current session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setIsReady(true)
        setMessage('Veuillez entrer votre nouveau mot de passe')
      } else {
        setMessage('Veuillez utiliser le lien de réinitialisation depuis votre email')
      }
    }

    checkSession()

    return () => subscription.unsubscribe()
  }, [])

  const handleReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setMessage('')
    setIsLoading(true)

    if (!newPassword || !confirmPassword) {
      setMessage('Veuillez remplir tous les champs.')
      setIsLoading(false)
      return
    }

    if (newPassword !== confirmPassword) {
      setMessage('Les mots de passe ne correspondent pas.')
      setIsLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) {
        setMessage('Erreur: ' + error.message)
      } else {
        setMessage('Mot de passe réinitialisé avec succès ! Redirection...')
        setTimeout(() => router.push('/login'), 2000)
      }
    } catch (error) {
      setMessage('Une erreur inattendue est survenue.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-50">
      <div className="w-full max-w-md bg-white p-6 rounded-2xl shadow space-y-4">
        <h1 className="text-2xl font-bold text-center">Réinitialisation du mot de passe</h1>
        
        {message && (
          <div className={`p-3 rounded ${
            message.includes('Erreur') || message.includes('invalide') 
              ? 'bg-red-100 border border-red-400 text-red-700'
              : message.includes('succès')
              ? 'bg-green-100 border border-green-400 text-green-700'
              : 'bg-blue-100 border border-blue-400 text-blue-700'
          }`}>
            {message}
          </div>
        )}

        {isReady && (
          <form onSubmit={handleReset} className="space-y-3">
            <input 
              type="password" 
              placeholder="Nouveau mot de passe" 
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full border rounded-lg p-2 focus:border-blue-500 focus:outline-none"
              minLength={6}
              required
            />
            <input 
              type="password" 
              placeholder="Confirmer le mot de passe" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full border rounded-lg p-2 focus:border-blue-500 focus:outline-none"
              minLength={6}
              required
            />
            
            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Réinitialisation...' : 'Réinitialiser'}
            </button>
          </form>
        )}

        {!isReady && (
          <div className="text-center">
            <p className="text-gray-600 mb-4">Veuillez cliquer sur le lien de réinitialisation dans votre email.</p>
            <button 
              onClick={() => router.push('/forgot-password')}
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Renvoyer un lien de réinitialisation
            </button>
          </div>
        )}
      </div>
    </main>
  )
}

export default function ResetPasswordForm() {
  return (
    <Suspense fallback={
      <main className="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-50">
        <div className="w-full max-w-md bg-white p-6 rounded-2xl shadow">
          <p className="text-center">Chargement...</p>
        </div>
      </main>
    }>
      <ResetPasswordFormContent />
    </Suspense>
  )
}
