'use client'

import * as React from 'react'
import { useSession } from 'next-auth/react'
import { CommunicationTable } from '@/components/organisms/communication-table'
import { FilterBar } from '@/components/molecules/filter-bar'
import { Pagination } from '@/components/molecules/pagination'
import { api } from '@/lib/api'
import { Communication, CommunicationFilters, PaginatedResponse } from '@/types'

const DEFAULT_FILTERS: CommunicationFilters = {
  page: 1,
  limit: 20,
}

export default function CommunicationsPage() {
  const { data: session } = useSession()
  const [filters, setFilters] = React.useState<CommunicationFilters>(DEFAULT_FILTERS)
  const [tribunals, setTribunals] = React.useState<string[]>([])
  const [tribunals_loading, setTribunalsLoading] = React.useState(false)
  const [result, setResult] = React.useState<PaginatedResponse<Communication> | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const token = (session as any)?.access_token

  React.useEffect(() => {
    if (!token) return
    fetchTribunals()
  }, [token])

  React.useEffect(() => {
    if (!token) return
    fetchCommunications()
  }, [filters, token])

  async function fetchTribunals() {
    setTribunalsLoading(true)
    try {
      const data = await api.communications.listUniqueTribunals(token)
      setTribunals(data)
    } catch {
      setTribunals([])
    } finally {
      setTribunalsLoading(false)
    }
  }

  async function fetchCommunications() {
    setLoading(true)
    setError(null)
    try {
      const data = await api.communications.list(filters, token)
      setResult(data)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Cabeçalho da página */}
      <div className="bg-white border rounded-lg p-5">
        <h1 className="text-xl font-bold text-gray-900">Comunicações</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Acompanhe as comunicações processuais obtidas do Diário de Justiça Eletrônico Nacional,
          organizadas e salvas automaticamente para sua consulta.
        </p>
      </div>

      {/* Barra de filtros */}
      <FilterBar
        filters={filters}
        tribunals={tribunals}
        tribunals_loading={tribunals_loading}
        onChange={setFilters}
        onReset={() => setFilters(DEFAULT_FILTERS)}
      />

      {/* Lista de comunicações */}
      <CommunicationTable
        data={result?.data ?? []}
        loading={loading}
        error={error}
      />

      {/* Paginação */}
      {result && result.meta.total_pages > 1 && (
        <Pagination
          page={result.meta.page}
          total_pages={result.meta.total_pages}
          total={result.meta.total}
          limit={result.meta.limit}
          onPageChange={(page) => setFilters((f) => ({ ...f, page }))}
        />
      )}
    </div>
  )
}
