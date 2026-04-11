'use client'

import * as React from 'react'
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

interface AiSummaryModalProps {
  communication_id: string
  initial_summary: string | null
  token: string
  onClose: () => void
}

export function AiSummaryModal({
  communication_id,
  initial_summary,
  token,
  onClose,
}: AiSummaryModalProps) {
  const [summary, setSummary] = React.useState<string | null>(initial_summary)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!summary) {
      generateSummary()
    }
  }, [])

  async function generateSummary() {
    setLoading(true)
    setError(null)
    try {
      const result = await api.communications.generateAiSummary(communication_id, token)
      setSummary(result.ai_summary)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Resumo com IA</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-2">
          {loading && (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <Spinner size="lg" />
              <p className="text-sm text-muted-foreground">Gerando resumo com IA...</p>
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center gap-4 py-6">
              <p className="text-destructive text-sm text-center">{error}</p>
              <Button variant="outline" size="sm" onClick={generateSummary}>
                Tentar novamente
              </Button>
            </div>
          )}

          {summary && !loading && (
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{summary}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
