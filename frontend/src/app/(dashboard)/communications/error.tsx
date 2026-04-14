'use client'

import { Button } from '@/components/atoms/button'

interface Props {
  error: Error
  reset: () => void
}

export default function CommunicationsError({ error, reset }: Props) {
  return (
    <div className="bg-white border rounded-lg p-6">
      <p className="text-destructive text-sm mb-3">
        Falha ao carregar a página de comunicações: {error.message || 'erro inesperado'}
      </p>
      <Button variant="outline" onClick={reset}>
        Tentar novamente
      </Button>
    </div>
  )
}
