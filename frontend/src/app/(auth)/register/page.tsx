'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { AuthForm } from '@/components/organisms/auth-form'

export default function RegisterPage() {
  const router = useRouter()
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)

  async function handleSubmit({
    name,
    email,
    password,
  }: {
    name?: string
    email: string
    password: string
  }) {
    setError(null)
    setLoading(true)

    try {
      await api.auth.register(name ?? '', email, password)
      router.push('/login?registered=true')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <div className="w-full max-w-md bg-background rounded-lg border shadow-sm p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Criar conta</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Registre-se para acessar as comunicações processuais
          </p>
        </div>

        <AuthForm
          mode="register"
          onSubmit={handleSubmit}
          error={error}
          loading={loading}
        />

        <p className="text-sm text-center text-muted-foreground mt-6">
          Já tem uma conta?{' '}
          <Link href="/login" className="text-primary hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}
