'use client'

import * as React from 'react'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'
import { Button } from '@/components/atoms/button'
import { Input } from '@/components/atoms/input'
import { Label } from '@/components/atoms/label'
import { Spinner } from '@/components/atoms/spinner'
import { cn } from '@/lib/utils'

type AuthMode = 'login' | 'register'

interface AuthFormProps {
  mode: AuthMode
  onSubmit: (data: { name?: string; email: string; password: string }) => Promise<void>
  error?: string | null
  loading?: boolean
}

interface FieldErrors {
  email?: string
  password?: string
  confirm?: string
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function AuthForm({ mode, onSubmit, error, loading }: AuthFormProps) {
  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [confirm_password, setConfirmPassword] = React.useState('')
  const [show_password, setShowPassword] = React.useState(false)
  const [show_confirm, setShowConfirm] = React.useState(false)
  const [field_errors, setFieldErrors] = React.useState<FieldErrors>({})

  function clearFieldError(field: keyof FieldErrors) {
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (mode === 'register') {
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
    }

    setFieldErrors({})
    await onSubmit({ name: mode === 'register' ? name : undefined, email, password })
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {mode === 'register' && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Nome completo</Label>
          <Input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seu nome"
            required
            disabled={loading}
          />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); clearFieldError('email') }}
          placeholder="seu@email.com"
          required
          disabled={loading}
          autoComplete={mode === 'login' ? 'username' : 'email'}
          className={cn(
            (error && mode === 'login') || field_errors.email
              ? 'border-destructive focus-visible:ring-destructive'
              : '',
          )}
        />
        {field_errors.email && (
          <p className="text-xs text-destructive">{field_errors.email}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Senha</Label>
        <div className="relative">
          <Input
            id="password"
            type={show_password ? 'text' : 'password'}
            value={password}
            onChange={(e) => { setPassword(e.target.value); clearFieldError('password') }}
            placeholder="••••••••"
            required
            disabled={loading}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            className={cn(
              'pr-10',
              (error && mode === 'login') || field_errors.password
                ? 'border-destructive focus-visible:ring-destructive'
                : '',
            )}
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={show_password ? 'Ocultar senha' : 'Mostrar senha'}
          >
            {show_password ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {mode === 'register' && (
          <p className={cn('text-xs', field_errors.password ? 'text-destructive' : 'text-muted-foreground')}>
            {field_errors.password ?? 'Mínimo de 8 caracteres'}
          </p>
        )}
      </div>

      {mode === 'register' && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirm_password">Confirme sua senha</Label>
          <div className="relative">
            <Input
              id="confirm_password"
              type={show_confirm ? 'text' : 'password'}
              value={confirm_password}
              onChange={(e) => { setConfirmPassword(e.target.value); clearFieldError('confirm') }}
              placeholder="••••••••"
              required
              disabled={loading}
              autoComplete="new-password"
              className={cn(
                'pr-10',
                field_errors.confirm ? 'border-destructive focus-visible:ring-destructive' : '',
              )}
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={show_confirm ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {show_confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {field_errors.confirm && (
            <p className="text-xs text-destructive">{field_errors.confirm}</p>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Button type="submit" disabled={loading} className="w-full mt-1">
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
