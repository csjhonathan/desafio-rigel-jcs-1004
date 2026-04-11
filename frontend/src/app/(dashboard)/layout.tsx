import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Link from 'next/link'
import { Home, Send, Clock } from 'lucide-react'
import { UserMenu } from '@/components/molecules/user-menu'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  const user_name = session.user?.name ?? ''
  const initials = user_name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="h-14 border-b bg-white sticky top-0 z-20 flex items-center justify-between px-6">
        <Link href="/communications" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
            <Clock className="w-4 h-4 text-primary" />
          </div>
          <span className="font-bold text-gray-900 text-lg">JusCash</span>
        </Link>

        <UserMenu initials={initials} />
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-14 border-r bg-white flex flex-col items-center pt-4 gap-1 sticky top-14 self-start h-[calc(100vh-3.5rem)]">
          <Link
            href="/communications"
            className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            title="Início"
          >
            <Home className="w-5 h-5" />
          </Link>
          <Link
            href="/communications"
            className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            title="Comunicações"
          >
            <Send className="w-5 h-5" />
          </Link>
        </aside>

        {/* Conteúdo principal */}
        <main className="flex-1 min-w-0 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
