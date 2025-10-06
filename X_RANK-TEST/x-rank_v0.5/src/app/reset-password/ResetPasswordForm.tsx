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
  const [hasValidSession, setHasValidSession] = useState(false)

  // Function to get cookies
  const getCookie = (name: string) => {
    if (typeof document === 'undefined') return null
    const value = `; ${document.cookie}`
    const parts = value.split(`; ${name}=`)
    if (parts.length === 2) return parts.pop()?.split(';').shift()
    return null
  }

  // Function to check if token is expired
  const isTokenExpired = (token: string | null) => {
    if (!token) return true
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      return payload.exp * 1000 < Date.now()
    } catch {
      return true
    }
  }

  // Function to restore session from cookies
  const restoreSessionFromCookies = async () => {
    try {
      const accessToken = getCookie('sb-access-token')
      const refreshToken = getCookie('sb-refresh-token')

      if (!accessToken || !refreshToken) {
        return false
      }

      // Check if tokens are expired
      if (isTokenExpired(accessToken) && isTokenExpired(refreshToken)) {
        return false
      }

      // Set session using the tokens
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      })

      if (error) {
        console.error('Session restoration failed:', error)
        return false
      }

      return !!data.session
    } catch (error) {
      console.error('Error restoring session:', error)
      return false
    }
  }

  // Function to check and maintain session
  const checkAndMaintainSession = async () => {
    // First, check current session
    const { data: { session } } = await supabase.auth.getSession()
    
    if (session) {
      setHasValidSession(true)
      return true
    }

    // If no session, try to restore from cookies
    const restored = await restoreSessionFromCookies()
    if (restored) {
      setHasValidSession(true)
      return true
    }

    setHasValidSession(false)
    return false
  }

  useEffect(() => {
    const initializeSession = async () => {
      setIsLoading(true)
      const hasSession = await checkAndMaintainSession()
      
      if (hasSession) {
        setMessage('Veuillez entrer votre nouveau mot de passe')
      } else {
        setMessage('Session invalide. Veuillez utiliser le lien de réinitialisation depuis votre email.')
      }
      setIsLoading(false)
    }

    initializeSession()

    // Set up interval to continuously check session
    const intervalId = setInterval(async () => {
      await checkAndMaintainSession()
    }, 2000) // Check every 2 seconds

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setHasValidSession(true)
        setMessage('Veuillez entrer votre nouveau mot de passe')
      } else if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        setHasValidSession(false)
      }
    })

    return () => {
      clearInterval(intervalId)
      subscription.unsubscribe()
    }
  }, [])

  const handleReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setMessage('')
    setIsLoading(true)

    // Double-check session before proceeding
    const hasSession = await checkAndMaintainSession()
    if (!hasSession) {
      setMessage('Erreur: Session perdue. Veuillez rafraîchir la page ou utiliser le lien de réinitialisation à nouveau.')
      setIsLoading(false)
      return
    }

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
        // Clear cookies and redirect
        document.cookie = 'sb-access-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
        document.cookie = 'sb-refresh-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
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
          <p className="text-center">Vérification de la session...</p>
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
            message.includes('Erreur') || message.includes('invalide') || message.includes('Session') 
              ? 'bg-red-100 border border-red-400 text-red-700'
              : message.includes('succès')
              ? 'bg-green-100 border border-green-400 text-green-700'
              : 'bg-blue-100 border border-blue-400 text-blue-700'
          }`}>
            {message}
          </div>
        )}

        {hasValidSession ? (
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
        ) : (
          <div className="text-center">
            <p className="text-gray-600 mb-4">Si vous n&apos;avez pas reçu de lien valide, vous pouvez :</p>
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
