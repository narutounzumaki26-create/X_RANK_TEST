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
  const [isTokenValid, setIsTokenValid] = useState(false)

  useEffect(() => {
    // Check if this is a valid password reset request
    if (type === 'recovery' && token) {
      setIsTokenValid(true)
      setMessage('Please enter your new password')
    } else {
      setMessage('Invalid or expired reset link')
    }
  }, [token, type])

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

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) {
        setMessage('Error: ' + error.message)
      } else {
        setMessage('Password reset successfully! Redirecting to login...')
        setTimeout(() => router.push('/login'), 2000)
      }
    } catch (error) {
      setMessage('An unexpected error occurred.')
    } finally {
      setIsLoading(false)
    }
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
