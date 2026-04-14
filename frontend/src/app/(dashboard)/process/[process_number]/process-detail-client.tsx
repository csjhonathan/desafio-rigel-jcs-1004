'use client'

import * as React from 'react'
import { Calendar, FileText, Sparkles, Users } from 'lucide-react'
import { Button } from '@/components/atoms/button'
import { AiSummaryModal } from '@/components/organisms/ai-summary-modal'
import { Communication, Recipient } from '@/types'
import { cn, formatDate } from '@/lib/utils'

interface ProcessDetailClientProps {
  communications: Communication[]
  token: string
}

export function ProcessDetailClient({ communications, token }: ProcessDetailClientProps) {
  const [modal_comm, setModalComm] = React.useState<Communication | null>(null)

  return (
    <>
      <div className="flex flex-col gap-3">
        {communications.map((comm) => (
          <CommunicationEntry
            key={comm.id}
            communication={comm}
            onResume={() => setModalComm(comm)}
          />
        ))}
      </div>

      {modal_comm && (
        <AiSummaryModal
          communication_id={modal_comm.id}
          initial_summary={modal_comm.ai_summary ?? null}
          token={token}
          onClose={() => setModalComm(null)}
        />
      )}
    </>
  )
}

function highlightResJudicata(content: string): React.ReactNode {
  const parts = content.split(/(transit(?:ou|ada)\s+em\s+julgado)/gi)
  return (
    <>
      {parts.map((part, i) =>
        /transit(?:ou|ada)\s+em\s+julgado/i.test(part) ? (
          <mark key={i} className="bg-amber-100 text-amber-900 rounded px-0.5 font-medium">
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  )
}

function CommunicationEntry({
  communication: c,
  onResume,
}: {
  communication: Communication
  onResume: () => void
}) {
  const recipient_names = c.recipients.map((r: Recipient) => r.name).join(', ')

  return (
    <div className="bg-white border rounded-lg p-5">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col-reverse md:flex-row items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              <Calendar className="h-3.5 w-3.5" />
              Data
            </div>
            <p className="text-sm text-gray-700">{formatDate(c.available_at)}</p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={onResume}
            className={cn('flex items-center gap-1.5 shrink-0', {
              'c.ai_summary': 'text-green-500',
              '!text-green-500': c.ai_summary,
            })}
          >
            <Sparkles className="h-3.5 w-3.5" />
            {c.ai_summary ? 'Ver resumo' : 'Resumir'}
          </Button>
        </div>        

        {/* Destinatários */}
        {recipient_names && (
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              <Users className="h-3.5 w-3.5" />
              Destinatários
            </div>
            <p className="text-sm text-gray-700">{recipient_names}</p>
          </div>
        )}

        {/* Conteúdo */}
        {c.content && (
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              <FileText className="h-3.5 w-3.5" />
              Conteúdo de movimentação
            </div>
            <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]">
              {c.has_res_judicata ? highlightResJudicata(c.content) : c.content}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
