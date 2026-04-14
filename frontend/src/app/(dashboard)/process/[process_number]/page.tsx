import { getServerSession } from 'next-auth'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, Clock3, Landmark, Users } from 'lucide-react'
import { authOptions } from '@/lib/auth'
import { api } from '@/lib/api'
import { Badge } from '@/components/atoms/badge'
import { ProcessDetailClient } from './process-detail-client'

interface Props {
  params: { process_number: string }
}

export default async function ProcessPage({ params }: Props) {
  const session = await getServerSession(authOptions)
  const token = (session as any)?.access_token ?? ''

  const process_number = decodeURIComponent(params.process_number)

  let communications
  try {
    communications = await api.communications.getByProcessNumber(process_number, token)
  } catch {
    notFound()
  }

  if (!communications.length) notFound()

  const has_res_judicata = communications.some((c) => c.has_res_judicata)
  const unique_tribunals = Array.from(new Set(communications.map((c) => c.tribunal)))
  const unique_recipients = Array.from(
    new Set(communications.flatMap((c) => c.recipients.map((recipient) => recipient.name))),
  )
  const recipient_preview = unique_recipients.slice(0, 3).join(', ')

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
        <h1 className="text-lg font-bold text-gray-900 mb-3">{process_number} {communications[0].kind ? `- ${communications[0].kind}` : ''}</h1>

        <div className="hidden md:flex items-center gap-5 text-sm text-muted-foreground">
          <div className="inline-flex items-center gap-1.5">
            <Landmark className="h-3.5 w-3.5" />
            <span>{unique_tribunals.join(', ')}</span>
          </div>
          <span aria-hidden className="text-gray-300">
            |
          </span>

          {recipient_preview && (
            <div className="inline-flex items-center gap-1.5 min-w-0">
              <Users className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{recipient_preview}</span>
            </div>
          )}
          {recipient_preview && (
            <span aria-hidden className="text-gray-300">
              |
            </span>
          )}

          <div className="inline-flex items-center gap-1.5">
            <Clock3 className="h-3.5 w-3.5" />
            <span>
              {communications.length} {communications.length === 1 ? 'atualização' : 'atualizações'}
            </span>
          </div>
        </div>

        <div className="md:hidden flex flex-col gap-4 text-gray-700">
          {has_res_judicata && <Badge variant="warning" className="self-start">Transitou em julgado</Badge>}

          <div className="inline-flex items-center gap-2 text-sm">
            <Landmark className="h-4 w-4 shrink-0 text-gray-500" />
            <span>{unique_tribunals.join(', ')}</span>
          </div>

          {recipient_preview && (
            <div className="inline-flex items-start gap-2 text-sm">
              <Users className="h-4 w-4 shrink-0 text-gray-500 mt-0.5" />
              <span>{recipient_preview}</span>
            </div>
          )}

          <div className="inline-flex items-center gap-2 text-sm">
            <Clock3 className="h-4 w-4 shrink-0 text-gray-500" />
            <span>
              {communications.length} {communications.length === 1 ? 'atualização' : 'atualizações'}
            </span>
          </div>
        </div>
      </div>

      {/* Lista de comunicações */}
      <ProcessDetailClient communications={communications} token={token} />
    </div>
  )
}
