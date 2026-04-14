'use client'

import { Button } from '@/components/atoms/button'

interface Props {
  error: Error
  reset: () => void
}

export default function ProcessDetailError({ error, reset }: Props) {
  return (
    <div className="bg-white border rounded-lg p-6">
      <p className="text-destructive text-sm mb-3">
        Falha ao carregar os detalhes do processo: {error.message || 'erro inesperado'}
      </p>
      <Button variant="outline" onClick={reset}>
        Tentar novamente
      </Button>
    </div>
  )
}
