'use client'

import * as React from 'react'
import Link from 'next/link'
import { Scale, Landmark, Users, FileText, Calendar, Info, Search, Sparkles } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { Badge } from '@/components/atoms/badge'
import { Button } from '@/components/atoms/button'
import { AiSummaryModal } from '@/components/organisms/ai-summary-modal'
import { Communication } from '@/types'
import { cn, formatDate } from '@/lib/utils'

interface CommunicationTableProps {
  data: Communication[]
  loading: boolean
  error: string | null
}

export function CommunicationTable({ data, loading, error }: CommunicationTableProps) {
  const { data: session } = useSession()
  const token = (session as any)?.access_token ?? ''
  const [modal_comm, setModalComm] = React.useState<Communication | null>(null)

  if (loading) {
    return <CommunicationSkeleton />
  }

  if (error) {
    return (
      <div className="bg-white border rounded-lg flex flex-col items-center justify-center py-16 gap-2">
        <p className="font-medium text-destructive">Erro ao carregar comunicações</p>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="bg-white border rounded-lg flex flex-col items-center justify-center py-16 gap-3">
        <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
          <Search className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-gray-900">Nenhuma comunicação encontrada</p>
          <p className="text-sm text-muted-foreground mt-1">
            Não encontramos resultados para os filtros aplicados. Tente ajustar os critérios de busca.
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        {data.map((comm) => (
          <CommunicationCard
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

function CommunicationCard({
  communication: c,
  onResume,
}: {
  communication: Communication
  onResume: () => void
}) {
  const recipient_names = c.recipients.map((r) => r.name).join(', ')

  return (
    <Link href={`/process/${encodeURIComponent(c.process_number)}`} className="block group">
      <div className="bg-white border rounded-lg p-5 hover:shadow-sm hover:border-gray-300 transition-all cursor-pointer">
        <div className="flex gap-6">
          {/* Coluna esquerda */}
          <div className="flex flex-col gap-4 flex-1 min-w-0">
            {/* Processo */}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                <Scale className="h-3.5 w-3.5" />
                Processo
              </div>
              <p className="text-sm font-medium text-gray-900">
                {c.process_number}
                {c.kind ? ` - ${c.kind}` : ''}
              </p>
            </div>

            {/* Tribunal */}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                <Landmark className="h-3.5 w-3.5" />
                Tribunal
              </div>
              <p className="text-sm text-gray-700">{c.tribunal}</p>
            </div>

            {/* Destinatários */}
            {recipient_names && (
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  <Users className="h-3.5 w-3.5" />
                  Destinatários
                </div>
                <p className="text-sm text-gray-700 truncate">{recipient_names}</p>
              </div>
            )}

            {/* Conteúdo */}
            {c.content && (
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  <FileText className="h-3.5 w-3.5" />
                  Conteúdo
                </div>
                <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">{c.content}</p>
              </div>
            )}
          </div>

          {/* Coluna direita */}
          <div className="flex flex-col gap-4 min-w-[180px] shrink-0">
            {/* Data */}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                <Calendar className="h-3.5 w-3.5" />
                Data
              </div>
              <p className="text-sm text-gray-700">{formatDate(c.available_at)}</p>
            </div>

            {/* Tipo da comunicação */}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                <Info className="h-3.5 w-3.5" />
                Tipo da comunicação
              </div>
              <p className="text-sm text-gray-700">{c.kind}</p>
            </div>

            {/* Badge transitou em julgado */}
            {c.has_res_judicata && (
              <Badge variant="warning" className="self-start mt-1">
                Transitou em julgado
              </Badge>
            )}
          </div>

          {/* Botão Resumir */}
          <div className="shrink-0 flex items-start">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onResume()
              }}
              className={
                cn(
                  'flex items-center gap-1.5',
                  {
                    'c.ai_summary': 'text-green-500',
                    '!text-green-500': c.ai_summary,
                  }
                )
              }
            >
              <Sparkles className="h-3.5 w-3.5" />
              {c.ai_summary ? 'Ver resumo' : 'Resumir'}
            </Button>
          </div>
        </div>
      </div>
    </Link>
  )
}

function CommunicationSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white border rounded-lg p-5 animate-pulse">
          <div className="flex gap-6">
            <div className="flex flex-col gap-4 flex-1">
              <div>
                <div className="h-3 w-16 bg-gray-200 rounded mb-2" />
                <div className="h-4 w-64 bg-gray-200 rounded" />
              </div>
              <div>
                <div className="h-3 w-14 bg-gray-200 rounded mb-2" />
                <div className="h-4 w-20 bg-gray-200 rounded" />
              </div>
              <div>
                <div className="h-3 w-20 bg-gray-200 rounded mb-2" />
                <div className="h-4 w-48 bg-gray-200 rounded" />
              </div>
              <div>
                <div className="h-3 w-16 bg-gray-200 rounded mb-2" />
                <div className="h-4 w-full bg-gray-200 rounded" />
                <div className="h-4 w-4/5 bg-gray-200 rounded mt-1" />
                <div className="h-4 w-3/4 bg-gray-200 rounded mt-1" />
              </div>
            </div>
            <div className="flex flex-col gap-4 min-w-[180px]">
              <div>
                <div className="h-3 w-10 bg-gray-200 rounded mb-2" />
                <div className="h-4 w-24 bg-gray-200 rounded" />
              </div>
              <div>
                <div className="h-3 w-28 bg-gray-200 rounded mb-2" />
                <div className="h-4 w-20 bg-gray-200 rounded" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
