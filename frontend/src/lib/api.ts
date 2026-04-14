import {
  AuthResponse,
  Communication,
  CommunicationFilters,
  PaginatedResponse,
  SyncLog,
  SyncStatus,
} from '@/types'

/** Browser: URL no host. Servidor (RSC, NextAuth): dentro do Docker use API_URL_INTERNAL (ex.: http://backend:3001). */
function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
  }
  return (
    process.env.API_URL_INTERNAL ??
    process.env.NEXT_PUBLIC_API_URL ??
    'http://localhost:3001'
  )
}

/**
 * O Nest pode devolver `message` como string ou como objeto (ex. HttpException com corpo `{ error, message }`).
 */
function extractApiErrorMessage(body: unknown): string {
  if (!body || typeof body !== 'object') return 'Erro desconhecido'
  const b = body as Record<string, unknown>
  const m = b.message
  if (typeof m === 'string') return m
  if (m && typeof m === 'object' && !Array.isArray(m)) {
    const o = m as Record<string, unknown>
    if (typeof o.message === 'string') return o.message
    if (typeof o.error === 'string' && typeof o.message === 'string') return o.message
  }
  if (typeof b.statusCode === 'number') {
    return `Erro HTTP ${b.statusCode}`
  }
  return 'Pedido falhou'
}

async function request<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, ...rest } = options
  const base = getApiBaseUrl()
  const api_prefix = `${base}/api/v1`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(rest.headers as Record<string, string>),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${api_prefix}${path}`, {
    ...rest,
    headers,
  })

  if (!response.ok) {
    const error_body = await response.json().catch(() => null)
    throw new Error(extractApiErrorMessage(error_body ?? { statusCode: response.status }))
  }

  return response.json()
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),

    register: (name: string, email: string, password: string) =>
      request<AuthResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      }),
  },

  communications: {
    list: (filters: CommunicationFilters, token: string) => {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, val]) => {
        if (val !== undefined && val !== '') params.set(key, String(val))
      })
      const query = params.toString()
      return request<PaginatedResponse<Communication>>(
        `/communications${query ? `?${query}` : ''}`,
        { token },
      )
    },

    getById: (id: string, token: string) =>
      request<Communication>(`/communications/${id}`, { token }),

    getByProcessNumber: (process_number: string, token: string) =>
      request<Communication[]>(
        `/communications/process/${encodeURIComponent(process_number)}`,
        { token },
      ),

    listUniqueTribunals: (token: string) =>
      request<string[]>('/communications/tribunals', { token }),

    generateAiSummary: (
      id: string,
      token: string,
      options?: { signal?: AbortSignal },
    ) =>
      request<{ ai_summary: string }>(`/communications/${id}/ai-summary`, {
        method: 'POST',
        token,
        signal: options?.signal,
      }),
  },

  sync: {
    status: (token: string) =>
      request<SyncStatus>('/sync/status', { token }),

    trigger: (date: string, token: string) =>
      request<{ success: boolean; date: string; message: string }>(
        '/sync/trigger',
        { method: 'POST', token, body: JSON.stringify({ date }) },
      ),

    logs: (token: string) =>
      request<SyncLog[]>('/sync/logs', { token }),
  },
}
