'use client'

import * as React from 'react'
import { CalendarIcon } from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

function parseLocalDate(str: string): Date {
  const [year, month, day] = str.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function toDateString(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function formatDisplay(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

export interface DateRangePickerProps {
  start_date?: string
  end_date?: string
  onChange: (start_date: string | undefined, end_date: string | undefined) => void
  className?: string
}

export function DateRangePicker({
  start_date,
  end_date,
  onChange,
  className,
}: DateRangePickerProps) {
  const range: DateRange = {
    from: start_date ? parseLocalDate(start_date) : undefined,
    to: end_date ? parseLocalDate(end_date) : undefined,
  }

  function handleSelect(selected: DateRange | undefined) {
    onChange(
      selected?.from ? toDateString(selected.from) : undefined,
      selected?.to ? toDateString(selected.to) : undefined,
    )
  }

  const label = range.from
    ? range.to
      ? `${formatDisplay(range.from)} — ${formatDisplay(range.to)}`
      : `${formatDisplay(range.from)} — ...`
    : 'Selecionar período'

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn('justify-start text-left font-normal', !range.from && 'text-muted-foreground', className)}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={range}
          onSelect={handleSelect}
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  )
}
