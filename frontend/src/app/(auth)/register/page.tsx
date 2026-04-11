'use client'

import * as React from 'react'
import Link from 'next/link'
import { AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { Button } from '@/components/atoms/button'
import { TextInput } from '@/components/atoms/text-input'
import { Spinner } from '@/components/atoms/spinner'

interface FieldErrors {
  email?: string
  password?: string
  confirm?: string
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [confirm_password, setConfirmPassword] = React.useState('')
  const [field_errors, setFieldErrors] = React.useState<FieldErrors>({})
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)

  function clearFieldError(field: keyof FieldErrors) {
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const errors: FieldErrors = {}

    if (!isValidEmail(email)) {
      errors.email = 'Informe um e-mail válido.'
    }
    if (password.length < 8) {
      errors.password = 'A senha deve ter no mínimo 8 caracteres.'
    }
    if (password !== confirm_password) {
      errors.confirm = 'As senhas não coincidem.'
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setFieldErrors({})
    setError(null)
    setLoading(true)

    try {
      await api.auth.register(name, email, password)
      router.push('/login?registered=true')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Criar conta</h1>
        <p className="text-sm text-muted-foreground mt-1">Preencha os dados para se cadastrar</p>
      </div>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <TextInput
          id="name"
          label="Nome completo"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Seu nome"
          required
          disabled={loading}
        />

        <TextInput
          id="email"
          label="E-mail"
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); clearFieldError('email') }}
          placeholder="seu@email.com"
          required
          disabled={loading}
          autoComplete="email"
          errorText={field_errors.email}
        />

        <TextInput
          id="password"
          label="Senha"
          type="password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); clearFieldError('password') }}
          placeholder="••••••••"
          required
          disabled={loading}
          autoComplete="new-password"
          errorText={field_errors.password}
          hintText="Mínimo de 8 caracteres"
        />

        <TextInput
          id="confirm_password"
          label="Confirme sua senha"
          type="password"
          value={confirm_password}
          onChange={(e) => { setConfirmPassword(e.target.value); clearFieldError('confirm') }}
          placeholder="••••••••"
          required
          disabled={loading}
          autoComplete="new-password"
          errorText={field_errors.confirm}
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
              Criando conta...
            </span>
          ) : (
            'Criar conta'
          )}
        </Button>
      </form>

      <p className="text-sm text-center text-muted-foreground mt-5">
        Já tem conta?{' '}
        <Link href="/login" className="text-primary font-medium hover:underline">
          Entrar
        </Link>
      </p>
    </>
  )
}
