'use client'

import * as React from 'react'
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
      <Button
        variant="outline"
        size="sm"
        onClick={() => setModalOpen(true)}
        className="shrink-0"
      >
        Resumo
      </Button>

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
