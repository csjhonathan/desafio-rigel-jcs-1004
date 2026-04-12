import { AuthResponse, Communication, CommunicationFilters, PaginatedResponse } from '@/types'

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
    const error = await response.json().catch(() => ({ message: 'Erro desconhecido' }))
    throw new Error(error.message ?? `HTTP ${response.status}`)
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

    generateAiSummary: (id: string, token: string) =>
      request<{ ai_summary: string }>(`/communications/${id}/ai-summary`, {
        method: 'POST',
        token,
      }),
  },

  sync: {
    trigger: (token: string) =>
      request<{ success: boolean; total_synced: number; date: string; message: string }>(
        '/sync/trigger',
        { method: 'POST', token },
      ),
  },
}
