import { Spinner } from '@/components/atoms/spinner'

export default function ProcessDetailLoading() {
  return (
    <div className="bg-white border rounded-lg p-6 flex flex-col items-center justify-center gap-3">
      <Spinner size="lg" />
      <p className="text-sm text-muted-foreground">Carregando detalhes do processo...</p>
    </div>
  )
}
