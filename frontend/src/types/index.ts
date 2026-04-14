export interface Recipient {
  id: string
  name: string
  kind: string
  communication_id: string
}

export interface Communication {
  id: string
  external_id: string
  process_number: string
  tribunal: string
  available_at: string
  kind: string
  content: string | null
  has_res_judicata: boolean
  ai_summary: string | null
  recipients: Recipient[]
  created_at: string
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    total_pages: number
  }
}

export interface CommunicationFilters {
  start_date?: string
  end_date?: string
  tribunal?: string
  process_number?: string
  page?: number
  limit?: number
}

export interface User {
  id: string
  name: string
  email: string
  created_at: string
}

export interface AuthResponse {
  access_token: string
  user: User
}

export interface SyncLog {
  id: string
  started_at: string
  ended_at: string | null
  success: boolean
  total_fetched: number
  total_stored: number
  error_message: string | null
}

export interface SyncStatus {
  has_running_sync: boolean
  running_sync: {
    id: string
    started_at: string
  } | null
}
