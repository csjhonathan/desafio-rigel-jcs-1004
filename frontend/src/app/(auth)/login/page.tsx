'use client'

import * as React from 'react'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { AuthForm } from '@/components/organisms/auth-form'

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)

  async function handleSubmit({ email, password }: { email: string; password: string }) {
    setError(null)
    setLoading(true)

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError('E-mail ou senha inválidos')
      return
    }

    router.push('/communications')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <div className="w-full max-w-md bg-background rounded-lg border shadow-sm p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Entrar</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Acesse as comunicações processuais do DJE
          </p>
        </div>

        <AuthForm
          mode="login"
          onSubmit={handleSubmit}
          error={error}
          loading={loading}
        />

        <p className="text-sm text-center text-muted-foreground mt-6">
          Não tem uma conta?{' '}
          <Link href="/register" className="text-primary hover:underline">
            Cadastre-se
          </Link>
        </p>
      </div>
    </div>
  )
}
