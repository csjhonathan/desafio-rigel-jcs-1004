'use client'

import * as React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Home, Menu, PanelLeft, PanelRight, ScrollText, Send, X } from 'lucide-react'
import { UserMenu } from '@/components/molecules/user-menu'
import { SyncTriggerModal } from '@/components/organisms/sync-trigger-modal'
import { cn } from '@/lib/utils'

interface DashboardShellProps {
  initials: string
  children: React.ReactNode
}

function is_nav_active(pathname: string, href: string): boolean {
  if (pathname === href) return true
  if (href !== '/' && pathname.startsWith(`${href}/`)) return true
  return false
}

export function DashboardShell({ initials, children }: DashboardShellProps) {
  const pathname = usePathname()
  const [nav_open, setNavOpen] = React.useState(false)
  const [sync_modal_open, setSyncModalOpen] = React.useState(false)

  const home_href = '/communications'
  const home_active = is_nav_active(pathname, home_href)
  const logs_href = '/sync-logs'
  const logs_active = is_nav_active(pathname, logs_href)

  function closeMobileMenu(): void {
    setNavOpen(false)
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="h-16 border-b bg-white sticky top-0 z-20 flex items-center justify-between px-4 sm:px-6">
        <div className="flex items-center min-w-0 gap-1">
          <button
            type="button"
            onClick={() => setNavOpen((v) => !v)}
            className="md:hidden shrink-0 p-2 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors"
            aria-label={nav_open ? 'Fechar menu de navegação' : 'Abrir menu de navegação'}
            aria-expanded={nav_open}
            aria-controls="dashboard-mobile-menu"
          >
            {nav_open ? (
              <X className="w-5 h-5" aria-hidden />
            ) : (
              <Menu className="w-5 h-5" aria-hidden />
            )}
          </button>
          <button
            type="button"
            onClick={() => setNavOpen((v) => !v)}
            className="hidden md:inline-flex shrink-0 p-2 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors"
            aria-label={nav_open ? 'Fechar menu lateral' : 'Abrir menu lateral'}
            aria-expanded={nav_open}
            aria-controls="dashboard-sidebar"
          >
            {nav_open ? (
              <PanelLeft className="w-5 h-5" aria-hidden />
            ) : (
              <PanelRight className="w-5 h-5" aria-hidden />
            )}
          </button>

          <Link href="/communications" className="flex items-center gap-2 min-w-0">
            <Image
              src="/logo-dark.png"
              alt="JusCash logo"
              width={100}
              height={100}
              className="object-cover object-center"
              priority
            />
          </Link>
        </div>

        <UserMenu initials={initials} />
      </header>

      <div className="flex flex-1 min-h-0">
        {nav_open && (
          <div className="md:hidden fixed inset-0 z-30">
            <button
              type="button"
              className="absolute inset-0 bg-black/25"
              onClick={closeMobileMenu}
              aria-label="Fechar menu de navegação"
            />
            <aside
              id="dashboard-mobile-menu"
              className="absolute top-16 left-3 w-60 border bg-white rounded-xl shadow-xl p-2"
            >
              <nav className="flex flex-col gap-1">
                <Link
                  href={home_href}
                  onClick={closeMobileMenu}
                  aria-current={home_active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 w-full rounded-lg transition-colors',
                    {
                      'bg-gray-100 text-gray-900 font-medium': home_active,
                      'text-gray-500 hover:bg-gray-100 hover:text-gray-900': !home_active,
                    },
                  )}
                >
                  <Home className="w-5 h-5 shrink-0" aria-hidden />
                  <span className="text-sm font-medium whitespace-nowrap min-w-0 truncate">
                    Início
                  </span>
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setSyncModalOpen(true)
                    closeMobileMenu()
                  }}
                  className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg transition-colors text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                >
                  <Send className="w-5 h-5 shrink-0" aria-hidden />
                  <span className="text-sm font-medium whitespace-nowrap min-w-0 truncate">
                    Sincronizar
                  </span>
                </button>

                <Link
                  href={logs_href}
                  onClick={closeMobileMenu}
                  aria-current={logs_active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 w-full rounded-lg transition-colors',
                    {
                      'bg-gray-100 text-gray-900 font-medium': logs_active,
                      'text-gray-500 hover:bg-gray-100 hover:text-gray-900': !logs_active,
                    },
                  )}
                >
                  <ScrollText className="w-5 h-5 shrink-0" aria-hidden />
                  <span className="text-sm font-medium whitespace-nowrap min-w-0 truncate">
                    Logs de sync
                  </span>
                </Link>
              </nav>
            </aside>
          </div>
        )}

        <aside
          id="dashboard-sidebar"
          className={cn(
            'hidden md:flex border-r bg-white flex-col shrink-0 sticky top-14 self-start h-[calc(100vh-3.5rem)] transition-[width] duration-300 ease-out overflow-hidden',
            {
              'w-[72px]': !nav_open,
              'w-52': nav_open,
            },
          )}
        >
          <nav
            className={cn(
              'flex flex-col pt-4 gap-1',
              nav_open ? 'px-2' : 'px-0 items-center',
            )}
          >
            <Link
              href={home_href}
              title={nav_open ? undefined : 'Início'}
              aria-current={home_active ? 'page' : undefined}
              className={cn(
                'flex items-center rounded-lg transition-colors',
                {
                  'bg-gray-100 text-gray-900 font-medium': home_active,
                  'text-gray-500 hover:bg-gray-100 hover:text-gray-900': !home_active,
                  'gap-3 px-3 py-2.5 w-full justify-start min-w-0': nav_open,
                  'size-10 shrink-0 justify-center': !nav_open,
                },
              )}
            >
              <Home className="w-5 h-5 shrink-0" aria-hidden />
              {nav_open ? (
                <span className="text-sm font-medium whitespace-nowrap min-w-0 truncate">
                  Início
                </span>
              ) : null}
            </Link>

            <button
              type="button"
              title={nav_open ? undefined : 'Sincronizar'}
              onClick={() => setSyncModalOpen(true)}
              className={cn(
                'flex items-center rounded-lg transition-colors text-gray-500 hover:bg-gray-100 hover:text-gray-900',
                {
                  'gap-3 px-3 py-2.5 w-full justify-start min-w-0': nav_open,
                  'size-10 shrink-0 justify-center': !nav_open,
                },
              )}
            >
              <Send className="w-5 h-5 shrink-0" aria-hidden />
              {nav_open ? (
                <span className="text-sm font-medium whitespace-nowrap min-w-0 truncate">
                  Sincronizar
                </span>
              ) : null}
            </button>

            <Link
              href={logs_href}
              title={nav_open ? undefined : 'Logs de sync'}
              aria-current={logs_active ? 'page' : undefined}
              className={cn(
                'flex items-center rounded-lg transition-colors',
                {
                  'bg-gray-100 text-gray-900 font-medium': logs_active,
                  'text-gray-500 hover:bg-gray-100 hover:text-gray-900': !logs_active,
                  'gap-3 px-3 py-2.5 w-full justify-start min-w-0': nav_open,
                  'size-10 shrink-0 justify-center': !nav_open,
                },
              )}
            >
              <ScrollText className="w-5 h-5 shrink-0" aria-hidden />
              {nav_open ? (
                <span className="text-sm font-medium whitespace-nowrap min-w-0 truncate">
                  Logs de sync
                </span>
              ) : null}
            </Link>
          </nav>
        </aside>

        {sync_modal_open && (
          <SyncTriggerModal onClose={() => setSyncModalOpen(false)} />
        )}

        <main className="flex-1 min-w-0 p-6">{children}</main>
      </div>
    </div>
  )
}
