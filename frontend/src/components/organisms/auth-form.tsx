'use client'

import * as React from 'react'
import { Button } from '@/components/atoms/button'
import { Spinner } from '@/components/atoms/spinner'
import { FormField } from '@/components/molecules/form-field'

type AuthMode = 'login' | 'register'

interface AuthFormProps {
  mode: AuthMode
  onSubmit: (data: { name?: string; email: string; password: string }) => Promise<void>
  error?: string | null
  loading?: boolean
}

export function AuthForm({ mode, onSubmit, error, loading }: AuthFormProps) {
  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await onSubmit({ name: mode === 'register' ? name : undefined, email, password })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {mode === 'register' && (
        <FormField
          label="Nome completo"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Seu nome"
          required
          disabled={loading}
        />
      )}

      <FormField
        label="E-mail"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="seu@email.com"
        required
        disabled={loading}
        autoComplete={mode === 'login' ? 'username' : 'email'}
      />

      <FormField
        label="Senha"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder={mode === 'register' ? 'Mínimo 8 caracteres' : '••••••••'}
        required
        minLength={mode === 'register' ? 8 : undefined}
        disabled={loading}
        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? (
          <span className="flex items-center gap-2">
            <Spinner size="sm" />
            {mode === 'login' ? 'Entrando...' : 'Criando conta...'}
          </span>
        ) : mode === 'login' ? (
          'Entrar'
        ) : (
          'Criar conta'
        )}
      </Button>
    </form>
  )
}
