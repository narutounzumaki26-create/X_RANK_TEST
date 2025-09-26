'use client'

import dynamic from 'next/dynamic'

const ResetPasswordForm = dynamic(
  () => import('./ResetPasswordForm'),
  { ssr: false } // ⚠️ ça doit être dans un client component, pas dans un server component
)

export default function ResetPasswordPage() {
  return <ResetPasswordForm />
}