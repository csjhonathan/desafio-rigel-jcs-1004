'use client'

import * as React from 'react'
import Link from 'next/link'
import { Badge } from '@/components/atoms/badge'
import { Spinner } from '@/components/atoms/spinner'
import { Communication } from '@/types'
import { formatDate } from '@/lib/utils'

interface CommunicationTableProps {
  data: Communication[]
  loading: boolean
  error: string | null
}

export function CommunicationTable({ data, loading, error }: CommunicationTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-2 text-destructive">
        <p className="font-medium">Erro ao carregar comunicações</p>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-2">
        <p className="font-medium text-muted-foreground">Nenhuma comunicação encontrada</p>
        <p className="text-sm text-muted-foreground">Tente ajustar os filtros de busca</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr className="border-b">
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Processo</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tribunal</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Disponível em</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tipo</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Destinatários</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {data.map((comm) => (
            <tr
              key={comm.id}
              className="hover:bg-muted/30 transition-colors"
            >
              <td className="px-4 py-3">
                <Link
                  href={`/communications/${comm.id}`}
                  className="font-mono text-primary hover:underline"
                >
                  {comm.process_number}
                </Link>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{comm.tribunal}</td>
              <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                {formatDate(comm.available_at)}
              </td>
              <td className="px-4 py-3">
                <Badge variant="secondary">{comm.kind}</Badge>
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {comm.recipients.length > 0
                  ? comm.recipients.map((r) => r.name).join(', ')
                  : '—'}
              </td>
              <td className="px-4 py-3">
                {comm.has_res_judicata && (
                  <Badge variant="warning">Transitado em julgado</Badge>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
