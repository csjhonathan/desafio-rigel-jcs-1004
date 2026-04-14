'use client'

import * as React from 'react'
import { CheckCircle, Clock3, XCircle } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/atoms/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/atoms/dialog'
import { Spinner } from '@/components/atoms/spinner'
import { api } from '@/lib/api'

interface SyncTriggerModalProps {
  onClose: () => void
}

type SyncState = 'idle' | 'running' | 'success' | 'error'

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function yesterdayBrtYmd(): string {
  const brt_now = new Date(Date.now() - 3 * 60 * 60 * 1000)
  brt_now.setUTCDate(brt_now.getUTCDate() - 1)
  return brt_now.toISOString().split('T')[0]
}

function todayBrtYmd(): string {
  return new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().split('T')[0]
}

export function SyncTriggerModal({ onClose }: SyncTriggerModalProps) {
  const { data: session } = useSession()
  const token = (session as any)?.access_token ?? ''

  const [state, setState] = React.useState<SyncState>('idle')
  const [selected_date, setSelectedDate] = React.useState(yesterdayBrtYmd())
  const [error_message, setErrorMessage] = React.useState<string | null>(null)
  const [checking_status, setCheckingStatus] = React.useState(true)
  const [has_running_sync, setHasRunningSync] = React.useState(false)
  const [running_started_at, setRunningStartedAt] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!token) return

    let mounted = true
    setCheckingStatus(true)

    api.sync.status(token)
      .then((status) => {
        if (!mounted) return
        setHasRunningSync(status.has_running_sync)
        setRunningStartedAt(status.running_sync?.started_at ?? null)
      })
      .catch(() => {
        if (!mounted) return
        setHasRunningSync(false)
        setRunningStartedAt(null)
      })
      .finally(() => {
        if (!mounted) return
        setCheckingStatus(false)
      })

    return () => {
      mounted = false
    }
  }, [token])

  async function handleStart() {
    if (has_running_sync || checking_status) return

    setState('running')
    setErrorMessage(null)

    try {
      await api.sync.trigger(selected_date, token)
      setState('success')
      setTimeout(onClose, 3000)
    } catch (err) {
      const message = (err as Error).message
      setErrorMessage(message)
      if (message.toLowerCase().includes('sincronização em andamento')) {
        setHasRunningSync(true)
      }
      setState('error')
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open && state !== 'running') onClose() }}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-md p-5 sm:p-6">
        <DialogHeader>
          <DialogTitle>Sincronização manual</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {checking_status && state === 'idle' && (
            <div className="flex flex-col items-center gap-3 py-4">
              <Spinner size="lg" />
              <p className="text-sm text-muted-foreground text-center">
                Verificando status da sincronização...
              </p>
            </div>
          )}

          {!checking_status && has_running_sync && state === 'idle' && (
            <div className="rounded-md border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-start gap-3">
                <Clock3 className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-blue-800">Sincronização em andamento</p>
                  <p className="text-sm text-blue-700 mt-1">
                    Já existe uma sincronização ativa. Aguarde a conclusão para iniciar uma nova.
                  </p>
                  {running_started_at && (
                    <p className="text-xs text-blue-700/80 mt-2">
                      Iniciada em {formatDateTime(running_started_at)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {state === 'idle' && (
            <div className="flex flex-col gap-3 mt-4">
              <label className="text-sm font-medium text-gray-700">
                Data para sincronizar
              </label>
              <input
                type="date"
                value={selected_date}
                max={todayBrtYmd()}
                onChange={(e) => setSelectedDate(e.target.value)}
                disabled={has_running_sync}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              />
            </div>
          )}

          {state === 'running' && (
            <div className="flex flex-col items-center gap-3 py-4">
              <Spinner size="lg" />
              <p className="text-sm text-muted-foreground text-center">
                Iniciando sincronização...
              </p>
            </div>
          )}

          {state === 'success' && (
            <div className="flex flex-col items-center gap-3 py-2">
              <CheckCircle className="h-10 w-10 text-green-500" />
              <div className="text-center">
                <p className="font-semibold text-gray-900">Sincronização iniciada!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  As comunicações de {selected_date} estão sendo importadas em segundo plano.
                </p>
                <p className="text-xs text-muted-foreground mt-2">Fechando em 3s...</p>
              </div>
            </div>
          )}

          {state === 'error' && (
            <div className="flex flex-col items-center gap-3 py-2">
              <XCircle className="h-10 w-10 text-destructive" />
              <div className="text-center">
                <p className="font-semibold text-destructive">Erro ao iniciar sincronização</p>
                {error_message && (
                  <p className="text-sm text-muted-foreground mt-1">{error_message}</p>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 flex-col-reverse sm:flex-row">
          {state === 'idle' && (
            <>
              <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
                Cancelar
              </Button>
              <Button
                onClick={handleStart}
                disabled={!selected_date || has_running_sync || checking_status}
                className="w-full sm:w-auto"
              >
                Iniciar sincronização
              </Button>
            </>
          )}

          {state === 'error' && (
            <>
              <Button variant="outline" size="sm" onClick={handleStart} className="w-full sm:w-auto">
                Tentar novamente
              </Button>
              <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
                Fechar
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
