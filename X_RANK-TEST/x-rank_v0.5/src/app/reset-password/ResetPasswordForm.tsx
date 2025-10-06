'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

function ResetPasswordFormContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams?.get('token')
  const type = searchParams?.get('type')

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isVerified, setIsVerified] = useState(false)

  useEffect(() => {
    // Verify the token and type for password recovery
    if (type === 'recovery' && token) {
      const verifyToken = async () => {
        setIsLoading(true)
        try {
          // Use verifyOtp for recovery tokens
          const { error } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'recovery'
          })

          if (error) {
            setMessage('Lien de réinitialisation invalide ou expiré: ' + error.message)
          } else {
            setIsVerified(true)
            setMessage('Veuillez entrer votre nouveau mot de passe')
          }
        } catch {
          setMessage('Erreur lors de la vérification du lien')
        } finally {
          setIsLoading(false)
        }
      }

      verifyToken()
    } else {
      setMessage('Lien de réinitialisation invalide')
    }
  }, [token, type])

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

    if (newPassword.length < 6) {
      setMessage('Le mot de passe doit contenir au moins 6 caractères.')
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
    } catch {
      setMessage('Une erreur inattendue est survenue.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-50">
        <div className="w-full max-w-md bg-white p-6 rounded-2xl shadow space-y-4">
          <p className="text-center">Vérification du lien...</p>
        </div>
      </main>
    )
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

        {isVerified && (
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

        {!isVerified && !isLoading && (
          <div className="text-center">
            <p className="text-gray-600 mb-4">Si vous n&apos;avez pas de lien valide, vous pouvez :</p>
            <button 
              onClick={() => router.push('/forgot-password')}
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Demander un nouveau lien de réinitialisation
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
