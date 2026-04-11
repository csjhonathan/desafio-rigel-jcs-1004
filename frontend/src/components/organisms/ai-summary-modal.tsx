'use client'

import * as React from 'react'
import { X, Sparkles } from 'lucide-react'
import { Button } from '@/components/atoms/button'
import { Spinner } from '@/components/atoms/spinner'
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative bg-background rounded-lg shadow-lg w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Resumo por IA</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar modal">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Spinner size="lg" />
              <p className="text-sm text-muted-foreground">Gerando resumo com IA...</p>
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center gap-4">
              <p className="text-destructive text-sm">{error}</p>
              <Button variant="outline" onClick={generateSummary} size="sm">
                Tentar novamente
              </Button>
            </div>
          )}

          {summary && !loading && (
            <div className="prose prose-sm max-w-none">
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{summary}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
