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
import { TextWithMarkdownBold } from '@/components/atoms/text-with-markdown-bold'
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

  /** Evita que um pedido antigo (falha) sobrescreva estado após um pedido mais recente ter sucesso. */
  const generate_generation_ref = React.useRef(0)

  React.useEffect(() => {
    if (summary) return
    const ac = new AbortController()
    void generateSummary(ac.signal)
    return () => {
      ac.abort()
    }
  }, [])

  function isAbortError(err: unknown): boolean {
    return err instanceof Error && err.name === 'AbortError'
  }

  async function generateSummary(signal?: AbortSignal) {
    const generation = ++generate_generation_ref.current
    setLoading(true)
    setError(null)
    try {
      const result = await api.communications.generateAiSummary(communication_id, token, {
        signal,
      })
      if (generation !== generate_generation_ref.current) return

      const text = result.ai_summary
      if (typeof text !== 'string' || !text.trim()) {
        setError('Resumo vazio ou inválido na resposta da API.')
        return
      }
      setSummary(text)
      setError(null)
    } catch (err) {
      if (generation !== generate_generation_ref.current) return
      if (isAbortError(err)) return

      const msg =
        err instanceof Error
          ? err.message
          : typeof err === 'string'
            ? err
            : 'Falha ao gerar resumo.'
      setError(msg)
    } finally {
      if (generation === generate_generation_ref.current) {
        setLoading(false)
      }
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
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                Gerando resumo com IA… Em caso de limite da API, o servidor pode demorar cerca de um
                minuto até concluir.
              </p>
            </div>
          )}

          {error && !loading && !summary && (
            <div className="flex flex-col items-center gap-4 py-6">
              <p className="text-destructive text-sm text-center">{error}</p>
              <Button variant="outline" size="sm" onClick={() => void generateSummary()}>
                Tentar novamente
              </Button>
            </div>
          )}

          {summary && !loading && (
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              <TextWithMarkdownBold text={summary} />
            </p>
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
