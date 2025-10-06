'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

function ResetPasswordFormContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const accessToken = searchParams?.get('access_token')
  
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isTokenValid, setIsTokenValid] = useState(false)

  useEffect(() => {
    if (accessToken) {
      void (async () => {
        setIsLoading(true)
        const { error } = await supabase.auth.exchangeCodeForSession(accessToken)
        if (error) {
          setMessage('Invalid or expired reset link: ' + error.message)
        } else {
          setIsTokenValid(true)
          setMessage('Please enter your new password')
        }
        setIsLoading(false)
      })()
    } else {
      setMessage('Invalid reset link: missing token')
    }
  }, [accessToken])

  const handleReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setMessage('')
    setIsLoading(true)

    if (!newPassword || !confirmPassword) {
      setMessage('Please fill in all fields.')
      setIsLoading(false)
      return
    }

    if (newPassword !== confirmPassword) {
      setMessage('Passwords do not match.')
      setIsLoading(false)
      return
    }

    if (newPassword.length < 6) {
      setMessage('Password must be at least 6 characters long.')
      setIsLoading(false)
      return
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (error) {
      setMessage('Error: ' + error.message)
    } else {
      setMessage('Password reset successfully!')
      setTimeout(() => router.push('/login'), 2000)
    }
    setIsLoading(false)
  }

  if (isLoading) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-50">
        <div className="w-full max-w-md bg-white p-6 rounded-2xl shadow space-y-4">
          <p className="text-center">Verifying reset link...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-50">
      <div className="w-full max-w-md bg-white p-6 rounded-2xl shadow space-y-4">
        <h1 className="text-2xl font-bold text-center">Reset Password</h1>
        
        {!isTokenValid && message && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {message}
          </div>
        )}

        {isTokenValid && (
          <form onSubmit={handleReset} className="space-y-3">
            <input 
              type="password" 
              placeholder="New password" 
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full border rounded-lg p-2"
              minLength={6}
              required
            />
            <input 
              type="password" 
              placeholder="Confirm password" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full border rounded-lg p-2"
              minLength={6}
              required
            />
            
            {message && (
              <p className={`text-sm ${
                message.includes('Error') || message.includes('invalid') 
                  ? 'text-red-600' 
                  : 'text-green-600'
              }`}>
                {message}
              </p>
            )}
            
            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}

// Wrap with Suspense to handle useSearchParams
export default function ResetPasswordForm() {
  return (
    <Suspense fallback={
      <main className="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-50">
        <div className="w-full max-w-md bg-white p-6 rounded-2xl shadow">
          <p className="text-center">Loading...</p>
        </div>
      </main>
    }>
      <ResetPasswordFormContent />
    </Suspense>
  )
}
