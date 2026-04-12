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

type SyncState = 'running' | 'success' | 'error'

export function SyncTriggerModal({ onClose }: SyncTriggerModalProps) {
  const { data: session } = useSession()
  const token = (session as any)?.access_token ?? ''

  const [state, setState] = React.useState<SyncState>('running')
  const [result, setResult] = React.useState<{
    total_synced: number
    date: string
    message: string
  } | null>(null)
  const [error_message, setErrorMessage] = React.useState<string | null>(null)

  React.useEffect(() => {
    runSync()
  }, [])

  async function runSync() {
    setState('running')
    setResult(null)
    setErrorMessage(null)

    try {
      const data = await api.sync.trigger(token)
      setResult({ total_synced: data.total_synced, date: data.date, message: data.message })
      setState(data.success ? 'success' : 'error')
    } catch (err) {
      setErrorMessage((err as Error).message)
      setState('error')
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Sincronização manual</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {state === 'running' && (
            <div className="flex flex-col items-center gap-3 py-4">
              <Spinner size="lg" />
              <p className="text-sm text-muted-foreground text-center">
                Sincronizando comunicações de ontem com a PJE...
              </p>
            </div>
          )}

          {state === 'success' && result && (
            <div className="flex flex-col items-center gap-3 py-2">
              <CheckCircle className="h-10 w-10 text-green-500" />
              <div className="text-center">
                <p className="font-semibold text-gray-900">{result.total_synced} comunicações salvas</p>
                <p className="text-sm text-muted-foreground mt-1">Data: {result.date}</p>
              </div>
            </div>
          )}

          {state === 'error' && (
            <div className="flex flex-col items-center gap-3 py-2">
              <XCircle className="h-10 w-10 text-destructive" />
              <div className="text-center">
                <p className="font-semibold text-destructive">Erro na sincronização</p>
                {(error_message || result?.message) && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {error_message ?? result?.message}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {state === 'error' && (
            <Button variant="outline" size="sm" onClick={runSync}>
              Tentar novamente
            </Button>
          )}
          <Button variant="outline" onClick={onClose} disabled={state === 'running'}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
