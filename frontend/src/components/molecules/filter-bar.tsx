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

const TRIBUNAIS = [
  'STF', 'STJ', 'TST', 'TSE', 'STM',
  'TRF1', 'TRF2', 'TRF3', 'TRF4', 'TRF5', 'TRF6',
  'TJSP', 'TJRJ', 'TJMG', 'TJRS', 'TJPR', 'TJSC',
  'TJBA', 'TJPE', 'TJCE', 'TJGO', 'TJDF', 'TJMS',
  'TJMT', 'TJPA', 'TJMA', 'TJPB', 'TJPI', 'TJRN',
  'TJRO', 'TJTO', 'TJAL', 'TJAM', 'TJAP', 'TJAC',
  'TJRR', 'TJSE', 'TJES',
]

interface FilterBarProps {
  filters: CommunicationFilters
  onChange: (filters: CommunicationFilters) => void
  onReset: () => void
}

export function FilterBar({ filters, onChange, onReset }: FilterBarProps) {
  const has_dates = !!(filters.start_date || filters.end_date)

  return (
    <div className="bg-white border rounded-lg p-4 flex flex-wrap gap-3 items-center">
      {/* Busca por processo */}
      <SearchField
        value={filters.process_number ?? ''}
        onChange={(v) => onChange({ ...filters, process_number: v || undefined, page: 1 })}
        placeholder="Buscar por número do processo"
        className="flex-1 min-w-[240px]"
      />

      {/* Tribunal */}
      <Select
        value={filters.tribunal ?? '_all'}
        onValueChange={(v) =>
          onChange({ ...filters, tribunal: v === '_all' ? undefined : v, page: 1 })
        }
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Selecione um tribunal" />
        </SelectTrigger>
        <SelectContent className="max-h-[280px] overflow-y-auto">
          <SelectItem value="_all">Todos os tribunais</SelectItem>
          {TRIBUNAIS.map((t) => (
            <SelectItem key={t} value={t}>
              {t}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Intervalo de datas */}
      <DateRangePicker
        start_date={filters.start_date}
        end_date={filters.end_date}
        onChange={(start_date, end_date) =>
          onChange({ ...filters, start_date, end_date, page: 1 })
        }
      />

      {/* Limpar filtros — aparece apenas quando há algum ativo */}
      {(filters.process_number || filters.tribunal || has_dates) && (
        <button
          onClick={onReset}
          className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2 whitespace-nowrap"
        >
          Limpar filtros
        </button>
      )}
    </div>
  )
}
