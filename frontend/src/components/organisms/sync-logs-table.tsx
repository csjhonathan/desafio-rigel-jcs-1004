'use client'

import * as React from 'react'
import { useSession } from 'next-auth/react'
import { AlertCircle } from 'lucide-react'
import { Spinner } from '@/components/atoms/spinner'
import { api } from '@/lib/api'
import { SyncLog } from '@/types'
import { cn } from '@/lib/utils'

const POLL_INTERVAL_MS = 5_000

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function formatDuration(started_at: string, ended_at: string | null, now?: Date): string {
  const end = ended_at ? new Date(ended_at) : (now ?? new Date())
  const s = Math.round((end.getTime() - new Date(started_at).getTime()) / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const rem = s % 60
  return rem > 0 ? `${m}m ${rem}s` : `${m}m`
}

function StatusBadge({ log }: { log: SyncLog }) {
  if (!log.ended_at) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
        </span>
        Em andamento
      </span>
    )
  }
  if (log.success) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700">
        <span className="h-2 w-2 rounded-full bg-green-500" />
        Sucesso
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700">
      <span className="h-2 w-2 rounded-full bg-red-500" />
      Erro
    </span>
  )
}

export function SyncLogsTable() {
  const { data: session } = useSession()
  const token = (session as any)?.access_token ?? ''

  const [logs, setLogs] = React.useState<SyncLog[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [now, setNow] = React.useState(() => new Date())

  async function fetchLogs() {
    try {
      const data = await api.sync.logs(token)
      setLogs(data)
      setError(null)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    if (!token) return
    fetchLogs()
  }, [token])

  const has_running = logs.some((log) => !log.ended_at)

  React.useEffect(() => {
    if (!has_running || !token) return
    const id = setInterval(fetchLogs, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [has_running, token])

  // Atualiza 'now' a cada segundo para a duração ao vivo das execuções em andamento
  React.useEffect(() => {
    if (!has_running) return
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [has_running])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-destructive">
        <AlertCircle className="h-8 w-8" />
        <p className="text-sm">{error}</p>
      </div>
    )
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
        <p className="text-sm">Nenhum log de sincronização encontrado.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
            <th className="px-4 py-3 whitespace-nowrap">Status</th>
            <th className="px-4 py-3 whitespace-nowrap">Iniciado em</th>
            <th className="px-4 py-3 whitespace-nowrap">Finalizado em</th>
            <th className="px-4 py-3 whitespace-nowrap">Duração</th>
            <th className="px-4 py-3 whitespace-nowrap text-right">Obtidos</th>
            <th className="px-4 py-3 whitespace-nowrap text-right">Novos</th>
            <th className="px-4 py-3">Erro</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {logs.map((log) => (
            <tr
              key={log.id}
              className={cn('hover:bg-gray-50 transition-colors', {
                'bg-blue-50/40 hover:bg-blue-50/60': !log.ended_at,
              })}
            >
              <td className="px-4 py-3 whitespace-nowrap">
                <StatusBadge log={log} />
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                {formatDateTime(log.started_at)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                {log.ended_at ? formatDateTime(log.ended_at) : (
                  <span className="italic text-blue-500">Em andamento...</span>
                )}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-gray-500 tabular-nums">
                {formatDuration(log.started_at, log.ended_at, log.ended_at ? undefined : now)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-right tabular-nums text-gray-700">
                {log.total_fetched}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-right tabular-nums font-medium text-gray-900">
                {log.total_stored}
              </td>
              <td className="px-4 py-3 max-w-xs text-red-600 text-xs truncate">
                {log.error_message ?? '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
