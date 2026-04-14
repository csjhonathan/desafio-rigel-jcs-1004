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

interface IRegisterValues {
  name: string
  email: string
  password: string
  confirm_password: string
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export default function RegisterPage() {
  const router = useRouter()
  const [values, setValues] = React.useState<IRegisterValues>({
    name: '',
    email: '',
    password: '',
    confirm_password: '',
  })
  const [field_errors, setFieldErrors] = React.useState<FieldErrors>({})
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)

  function clearFieldError(field: keyof FieldErrors) {
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const errors: FieldErrors = {}

    if (!isValidEmail(values.email)) {
      errors.email = 'Informe um e-mail válido.'
    }
    if (values.password.length < 8) {
      errors.password = 'A senha deve ter no mínimo 8 caracteres.'
    }
    if (values.password !== values.confirm_password) {
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
      await api.auth.register(values.name, values.email, values.password)
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
          value={values.name}
          onChange={(e) => setValues({ ...values, name: e.target.value })}
          placeholder="Seu nome"
          required
          disabled={loading}
        />

        <TextInput
          id="email"
          label="E-mail"
          type="email"
          value={values.email}
          onChange={(e) => { setValues({ ...values, email: e.target.value }); clearFieldError('email') }}
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
          value={values.password}
          onChange={(e) => { setValues({ ...values, password: e.target.value }); clearFieldError('password') }}
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
          value={values.confirm_password}
          onChange={(e) => { setValues({ ...values, confirm_password: e.target.value }); clearFieldError('confirm') }}
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
