'use client'

import * as React from 'react'
import { isSameDay } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import { ptBR } from 'react-day-picker/locale'
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

function committedRange(start_date?: string, end_date?: string): DateRange {
  return {
    from: start_date ? parseLocalDate(start_date) : undefined,
    to: end_date ? parseLocalDate(end_date) : undefined,
  }
}

function formatRangeLabel(range: DateRange | undefined): string {
  const from = range?.from
  const to = range?.to
  if (!from) return 'Data inicial - Data final'
  if (!to) return `${formatDisplay(from)} — ...`
  if (isSameDay(from, to)) return formatDisplay(from)
  return `${formatDisplay(from)} — ${formatDisplay(to)}`
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
  const [open, setOpen] = React.useState(false)
  const [draft, setDraft] = React.useState<DateRange | undefined>(undefined)

  const range_committed = committedRange(start_date, end_date)

  function handleOpenChange(next_open: boolean) {
    setOpen(next_open)
    if (next_open) {
      setDraft(committedRange(start_date, end_date))
    }
  }

  function handleSelect(selected: DateRange | undefined) {
    if (!selected?.from) {
      setDraft(undefined)
      return
    }

    const from = selected.from
    const to = selected.to
    const from_str = toDateString(from)

    if (!to) {
      setDraft({ from, to: undefined })
      return
    }

    if (isSameDay(from, to)) {
      const completing_single_day =
        draft?.from != null &&
        draft.to === undefined &&
        isSameDay(draft.from, from)
      if (completing_single_day) {
        setDraft({ from, to })
        onChange(from_str, from_str)
        setOpen(false)
      } else {
        setDraft({ from, to: undefined })
      }
      return
    }

    setDraft({ from, to })
    onChange(from_str, toDateString(to))
    setOpen(false)
  }

  const range_for_label = open ? draft : range_committed
  const label = formatRangeLabel(range_for_label)

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'justify-start text-left font-normal',
            !range_for_label?.from && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 mr-10" align="start">
        <Calendar
          mode="range"
          locale={ptBR}
          selected={draft}
          onSelect={handleSelect}
          numberOfMonths={2}
          fixedWeeks={true}
        />
      </PopoverContent>
    </Popover>
  )
}
