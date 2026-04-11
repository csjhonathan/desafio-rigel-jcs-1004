'use client'

import * as React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Clock } from 'lucide-react'
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
      setError('E-mail ou senha incorretos. Verifique os dados e tente novamente.')
      return
    }

    router.push('/communications')
  }

  return (
    <div className="min-h-screen flex">
      {/* Painel esquerdo — foto com overlay */}
      <div className="hidden lg:flex lg:w-[42%] relative flex-col justify-start p-10 overflow-hidden">
        <Image
          src="/auth-bg.png"
          alt="JusCash background"
          fill
          className="object-cover object-center"
          priority
        />
        <div className="absolute inset-0 bg-[#0a1f3d]/60" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Clock className="w-4 h-4 text-white" />
            </div>
            <span className="text-white text-xl font-bold">JusCash</span>
          </div>
          <p className="text-white/75 text-sm leading-relaxed">
            Antecipe honorários advocatícios com a JusCash
          </p>
        </div>
      </div>

      {/* Painel direito — formulário */}
      <div className="flex-1 flex flex-col justify-between bg-[#f5f6f8]">
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-[400px]">
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-bold text-gray-900">Bem-vindo de volta</h1>
              <p className="text-sm text-muted-foreground mt-1">Acesse sua conta para continuar</p>
            </div>

            <AuthForm
              mode="login"
              onSubmit={handleSubmit}
              error={error}
              loading={loading}
            />

            <p className="text-sm text-center text-muted-foreground mt-5">
              Não tem conta?{' '}
              <Link href="/register" className="text-primary font-medium hover:underline">
                Cadastre-se
              </Link>
            </p>
          </div>
        </div>

        <footer className="text-center text-xs text-muted-foreground py-4">
          © 2026 • Juscash Administração de Pagamentos e Recebimentos SA
        </footer>
      </div>
    </div>
  )
}
