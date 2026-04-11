import { ReactNode } from 'react'
import { getServerSession } from 'next-auth'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { authOptions } from '@/lib/auth'
import { api } from '@/lib/api'
import { Badge } from '@/components/atoms/badge'
import { CommunicationDetailClient } from './communication-detail-client'
import { formatDateTime } from '@/lib/utils'

interface Props {
  params: { id: string }
}

export default async function CommunicationDetailPage({ params }: Props) {
  const session = await getServerSession(authOptions)
  const token = (session as any)?.access_token

  let communication
  try {
    communication = await api.communications.getById(params.id, token)
  } catch {
    notFound()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Link
          href="/communications"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Voltar para lista
        </Link>
      </div>

      <div className="bg-background border rounded-lg p-6 flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Número do processo</p>
            <h1 className="text-xl font-mono font-bold">{communication.process_number}</h1>
          </div>
          {communication.has_res_judicata && (
            <Badge variant="warning" className="shrink-0">
              Transitado em julgado
            </Badge>
          )}
        </div>

        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <dt className="text-muted-foreground">Tribunal</dt>
            <dd className="font-medium mt-0.5">{communication.tribunal}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Disponível em</dt>
            <dd className="font-medium mt-0.5">{formatDateTime(communication.available_at)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Tipo</dt>
            <dd className="mt-0.5">
              <Badge variant="secondary">{communication.kind}</Badge>
            </dd>
          </div>
          {communication.recipients.length > 0 && (
            <div className="col-span-full">
              <dt className="text-muted-foreground">Destinatários</dt>
              <dd className="font-medium mt-0.5">
                {communication.recipients.map((r) => `${r.name} (${r.kind})`).join(' · ')}
              </dd>
            </div>
          )}
        </dl>

        {communication.content && (
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-2">Conteúdo</h2>
            <div className="bg-muted/30 rounded-md p-4 text-sm leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto">
              {communication.has_res_judicata
                ? highlightResJudicata(communication.content)
                : communication.content}
            </div>
          </div>
        )}
      </div>

      <CommunicationDetailClient
        communication_id={communication.id}
        initial_summary={communication.ai_summary}
        token={token}
      />
    </div>
  )
}

function highlightResJudicata(content: string): ReactNode {
  const parts = content.split(/(transit(?:ou|ada)\s+em\s+julgado)/gi)
  return (
    <>
      {parts.map((part, i) =>
        /transit(?:ou|ada)\s+em\s+julgado/i.test(part) ? (
          <mark key={i} className="bg-amber-200 text-amber-900 rounded px-0.5">
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  )
}
