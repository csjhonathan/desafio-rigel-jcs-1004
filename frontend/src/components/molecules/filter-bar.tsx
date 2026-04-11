'use client'

import * as React from 'react'
import { Button } from '@/components/atoms/button'
import { Input } from '@/components/atoms/input'
import { Label } from '@/components/atoms/label'
import { SearchField } from './search-field'
import { CommunicationFilters } from '@/types'

interface FilterBarProps {
  filters: CommunicationFilters
  onChange: (filters: CommunicationFilters) => void
  onReset: () => void
}

export function FilterBar({ filters, onChange, onReset }: FilterBarProps) {
  return (
    <div className="flex flex-wrap gap-4 items-end p-4 bg-card border rounded-lg">
      <div className="flex flex-col gap-1.5 min-w-[180px]">
        <Label htmlFor="process_number">Número do processo</Label>
        <SearchField
          value={filters.process_number ?? ''}
          onChange={(v) => onChange({ ...filters, process_number: v, page: 1 })}
          placeholder="0000000-00.0000.0.00.0000"
        />
      </div>

      <div className="flex flex-col gap-1.5 min-w-[160px]">
        <Label htmlFor="tribunal">Tribunal</Label>
        <Input
          id="tribunal"
          value={filters.tribunal ?? ''}
          onChange={(e) => onChange({ ...filters, tribunal: e.target.value, page: 1 })}
          placeholder="Ex: TJSP"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="start_date">Data inicial</Label>
        <Input
          id="start_date"
          type="date"
          value={filters.start_date ?? ''}
          onChange={(e) => onChange({ ...filters, start_date: e.target.value, page: 1 })}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="end_date">Data final</Label>
        <Input
          id="end_date"
          type="date"
          value={filters.end_date ?? ''}
          onChange={(e) => onChange({ ...filters, end_date: e.target.value, page: 1 })}
        />
      </div>

      <Button variant="outline" onClick={onReset} size="sm">
        Limpar filtros
      </Button>
    </div>
  )
}
