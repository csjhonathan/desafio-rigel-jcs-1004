import { SyncLogsTable } from '@/components/organisms/sync-logs-table'

export default function SyncLogsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Logs de sincronização</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Histórico das execuções do job de sincronização com a API do PJE. Atualiza automaticamente enquanto houver sincronizações em andamento.
        </p>
      </div>
      <SyncLogsTable />
    </div>
  )
}
