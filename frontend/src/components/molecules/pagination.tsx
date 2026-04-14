'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/atoms/button'

interface PaginationProps {
  page: number
  total_pages: number
  total: number
  limit: number
  onPageChange: (page: number) => void
}

export function Pagination({ page, total_pages, total, limit, onPageChange }: PaginationProps) {
  const start = (page - 1) * limit + 1
  const end = Math.min(page * limit, total)
  const next_page = page + 1

  return (
    <nav
      className="flex flex-col items-center gap-3 px-2 sm:flex-row sm:items-center sm:justify-between"
      aria-label="Paginação de comunicações"
    >
      <p className="text-sm text-muted-foreground text-center sm:text-left">
        Exibindo {start}–{end} de {total} comunicações
      </p>
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Página anterior"
            className="px-2 text-sm"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Anterior
          </Button>

          <Button
            variant="outline"
            size="sm"
            aria-label={`Página ${page}, atual`}
            disabled
            className="min-w-9 h-9 px-3 text-sm font-medium"
          >
            {page}
          </Button>

          {next_page <= total_pages && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onPageChange(next_page)}
              aria-label={`Ir para página ${next_page}`}
              className="min-w-9 h-9 px-3 text-sm font-medium"
            >
              {next_page}
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= total_pages}
            aria-label="Próxima página"
            className="px-2 text-sm"
          >
            Próximo
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center" aria-live="polite">
          Página {page} de {total_pages}
        </p>
      </div>
    </nav>
  )
}
