'use client'

import * as React from 'react'
import Link from 'next/link'
import { AlertCircle } from 'lucide-react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/atoms/button'
import { TextInput } from '@/components/atoms/text-input'
import { Spinner } from '@/components/atoms/spinner'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError('E-mail ou senha incorretos. Verifique os dados e tente novamente.')
      return
    }

    router.push('/communications')
  }

  const field_invalid = Boolean(error)

  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Bem-vindo de volta</h1>
        <p className="text-sm text-muted-foreground mt-1">Acesse sua conta para continuar</p>
      </div>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <TextInput
          id="email"
          label="E-mail"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
          required
          disabled={loading}
          autoComplete="username"
          invalid={field_invalid}
        />

        <TextInput
          id="password"
          label="Senha"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          disabled={loading}
          autoComplete="current-password"
          invalid={field_invalid}
        />

        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Button type="submit" disabled={loading} className="w-full mt-1 bg-secondary hover:bg-secondary/80">
          {loading ? (
            <span className="flex items-center gap-2">
              <Spinner size="sm" />
              Entrando...
            </span>
          ) : (
            'Entrar'
          )}
        </Button>
      </form>

      <p className="text-sm text-center text-muted-foreground mt-5">
        Não tem conta?{' '}
        <Link href="/register" className="text-primary font-medium hover:underline">
          Cadastre-se
        </Link>
      </p>
    </>
  )
}
