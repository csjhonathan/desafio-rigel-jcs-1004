import { ReactNode } from 'react'
import { getServerSession } from 'next-auth'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, Users, FileText } from 'lucide-react'
import { authOptions } from '@/lib/auth'
import { api } from '@/lib/api'
import { Badge } from '@/components/atoms/badge'
import { CommunicationDetailClient } from './communication-detail-client'
import { formatDate } from '@/lib/utils'
import { Recipient } from '@/types'

interface Props {
  params: { id: string }
}

export default async function CommunicationDetailPage({ params }: Props) {
  const session = await getServerSession(authOptions)
  const token = (session as any)?.access_token ?? ''

  let communication
  try {
    communication = await api.communications.getById(params.id, token)
  } catch {
    notFound()
  }

  const recipient_names = communication.recipients.map((r: Recipient) => r.name).join(', ')

  return (
    <div className="flex flex-col gap-4">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/communications" className="hover:text-foreground transition-colors">
          Diário Oficial
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">Detalhes do processo</span>
      </nav>

      {/* Cabeçalho do processo */}
      <div className="bg-white border rounded-lg p-5">
        <h1 className="text-lg font-bold text-gray-900 mb-3">
          {communication.process_number}
          {communication.kind ? ` - ${communication.kind}` : ''}
        </h1>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="font-mono text-xs">
            {communication.tribunal}
          </Badge>

          {communication.recipients.slice(0, 3).map((r: Recipient) => (
            <div
              key={r.id}
              title={r.name}
              className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-700"
            >
              {r.name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()}
            </div>
          ))}

          {communication.has_res_judicata && (
            <Badge variant="warning">Transitou em julgado</Badge>
          )}
        </div>
      </div>

      {/* Entrada de comunicação */}
      <div className="bg-white border rounded-lg p-5">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-500">
            <span>Data: {formatDate(communication.available_at)}</span>
          </div>

          <CommunicationDetailClient
            communication_id={communication.id}
            initial_summary={communication.ai_summary}
            token={token}
          />
        </div>

        {/* Destinatários */}
        {recipient_names && (
          <div className="mb-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              <Users className="h-3.5 w-3.5" />
              Destinatários
            </div>
            <p className="text-sm text-gray-700">{recipient_names}</p>
          </div>
        )}

        {/* Conteúdo */}
        {communication.content && (
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              <FileText className="h-3.5 w-3.5" />
              Conteúdo de movimentação
            </div>
            <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {communication.has_res_judicata
                ? highlightResJudicata(communication.content)
                : communication.content}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function highlightResJudicata(content: string): ReactNode {
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
