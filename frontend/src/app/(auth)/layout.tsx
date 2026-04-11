'use client'

import * as React from 'react'
import Image from 'next/image'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-[#f5f6f8]">

      <div className="lg:w-[50%] lg:flex p-4">
        <div className="hidden w-full lg:flex relative flex-col justify-start p-10 overflow-hidden rounded-2xl">
          <Image
            src="/auth-bg.png"
            alt="JusCash background"
            fill
            className="object-cover object-center"
            priority
          />

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <Image
                src="/logo.png"
                alt="JusCash logo"
                width={200}
                height={100}
                className="object-cover object-center"
                priority
              />
            </div>
            <p className="text-white/75 text-sm leading-relaxed">
              Antecipe honorários advocatícios com a JusCash
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-between ">
        <div className="flex-1 flex flex-col gap-y-8 items-center justify-center p-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-300 p-8 w-full max-w-[700px]">
            {children}
          </div>

          <div>
            <span className="text-sm text-muted-foreground">
              © 2026 • Juscash Administração de Pagamentos e Recebimentos SA
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}