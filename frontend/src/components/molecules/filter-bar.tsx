'use client'

import * as React from 'react'
import { SearchField } from './search-field'
import { DateRangePicker } from './date-range-picker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/atoms/select'
import { CommunicationFilters } from '@/types'
import { Button } from '../atoms/button'

interface FilterBarProps {
  filters: CommunicationFilters
  tribunals: string[]
  tribunals_loading?: boolean
  onChange: (filters: CommunicationFilters) => void
  onReset: () => void
}

export function FilterBar({
  filters,
  tribunals,
  tribunals_loading = false,
  onChange,
  onReset,
}: FilterBarProps) {
  const has_dates = !!(filters.start_date || filters.end_date)

  return (
    <div className="bg-white border rounded-lg p-4 flex flex-col gap-3 items-stretch md:flex-row md:flex-wrap md:items-center">
      <SearchField
        value={filters.process_number ?? ''}
        onChange={(v) => onChange({ ...filters, process_number: v || undefined, page: 1 })}
        placeholder="Buscar por número do processo"
        className="w-full md:flex-1 md:min-w-[240px]"
      />

      <Select
        disabled={tribunals_loading}
        value={filters.tribunal ?? ''}
        onValueChange={(v) =>
          onChange({ ...filters, tribunal: v || undefined, page: 1 })
        }
      >
        <SelectTrigger className="w-full md:w-[200px]">
          <SelectValue placeholder={tribunals_loading ? 'Carregando tribunais...' : 'Selecione um tribunal'} />
        </SelectTrigger>
        <SelectContent className="max-h-[280px] overflow-y-auto">
          {tribunals_loading ? (
            <SelectItem value="loading-tribunals" disabled>
              Carregando tribunais...
            </SelectItem>
          ) : tribunals.length === 0 ? (
            <SelectItem value="no-tribunals" disabled>
              Nenhum tribunal encontrado
            </SelectItem>
          ) : (
            tribunals.map((tribunal) => (
              <SelectItem key={tribunal} value={tribunal}>
                {tribunal}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>

      <DateRangePicker
        start_date={filters.start_date}
        end_date={filters.end_date}
        onChange={(start_date, end_date) =>
          onChange({ ...filters, start_date, end_date, page: 1 })
        }
        className="w-full md:w-auto"
      />

      <Button
        variant="outline"
        onClick={onReset}
        disabled={!(filters.process_number || filters.tribunal || has_dates)}
        className="w-full md:w-auto"
      >
        Limpar filtros
      </Button>
    </div>
  )
}
