import { getServerSession } from 'next-auth'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
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
        <h1 className="text-lg font-bold text-gray-900 mb-3">{process_number}</h1>
        <div className="flex flex-wrap items-center gap-2">
          {unique_tribunals.length === 1 ? (
            <Badge variant="secondary" className="font-mono text-xs">
              {unique_tribunals[0]}
            </Badge>
          ) : (
            unique_tribunals.map((t) => (
              <Badge variant="secondary" className="font-mono text-xs" key={t}>
                {t}
              </Badge>
            ))
          )}
          <Badge variant="outline" className="text-xs">
            {communications.length} {communications.length === 1 ? 'comunicação' : 'comunicações'}
          </Badge>
          {has_res_judicata && <Badge variant="warning">Transitou em julgado</Badge>}
        </div>
      </div>

      {/* Lista de comunicações */}
      <ProcessDetailClient communications={communications} token={token} />
    </div>
  )
}
