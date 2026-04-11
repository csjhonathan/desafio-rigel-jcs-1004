'use client'

import * as React from 'react'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/atoms/button'
import { AiSummaryModal } from '@/components/organisms/ai-summary-modal'

interface CommunicationDetailClientProps {
  communication_id: string
  initial_summary: string | null
  token: string
}

export function CommunicationDetailClient({
  communication_id,
  initial_summary,
  token,
}: CommunicationDetailClientProps) {
  const [modal_open, setModalOpen] = React.useState(false)

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={() => setModalOpen(true)} className="gap-2">
          <Sparkles className="h-4 w-4" />
          {initial_summary ? 'Ver resumo por IA' : 'Gerar resumo por IA'}
        </Button>
      </div>

      {modal_open && (
        <AiSummaryModal
          communication_id={communication_id}
          initial_summary={initial_summary}
          token={token}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  )
}
