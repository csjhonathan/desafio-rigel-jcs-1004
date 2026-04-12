'use client'

import * as React from 'react'
import { CheckCircle, XCircle } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/atoms/button'
import { Spinner } from '@/components/atoms/spinner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { api } from '@/lib/api'

interface SyncTriggerModalProps {
  onClose: () => void
}

type SyncState = 'idle' | 'running' | 'success' | 'error'

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

  async function handleStart() {
    setState('running')
    setErrorMessage(null)

    try {
      await api.sync.trigger(selected_date, token)
      setState('success')
      setTimeout(onClose, 3000)
    } catch (err) {
      setErrorMessage((err as Error).message)
      setState('error')
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open && state !== 'running') onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Sincronização manual</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {state === 'idle' && (
            <div className="flex flex-col gap-3">
              <label className="text-sm font-medium text-gray-700">
                Data para sincronizar
              </label>
              <input
                type="date"
                value={selected_date}
                max={todayBrtYmd()}
                onChange={(e) => setSelectedDate(e.target.value)}
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

        <DialogFooter className="gap-2">
          {state === 'idle' && (
            <>
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button onClick={handleStart} disabled={!selected_date}>
                Iniciar sincronização
              </Button>
            </>
          )}

          {state === 'error' && (
            <>
              <Button variant="outline" size="sm" onClick={handleStart}>
                Tentar novamente
              </Button>
              <Button variant="outline" onClick={onClose}>
                Fechar
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
