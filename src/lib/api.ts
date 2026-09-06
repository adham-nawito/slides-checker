import axios from 'axios'
import type { Tag, Submission, SlideIssue } from '@/types'
import { getStoredUser, useAuthStore } from '@/store/authStore'

export const apiClient = axios.create({
  baseURL: '/api',
  timeout: 60_000,
})

// ─── Request: attach token from the Zustand store ────────────────────────────
apiClient.interceptors.request.use((config) => {
  const token = getStoredUser()?.token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ─── Response: normalize errors + auto-logout on 401 ────────────────────────
apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    // Auto-logout when a protected endpoint returns 401 (expired/invalid token).
    // Skip the login endpoint itself — a wrong password is expected to return 401.
    if (
      err.response?.status === 401 &&
      !err.config?.url?.includes('/auth/login')
    ) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    const message = err.response?.data?.error ?? err.message ?? 'Unexpected error'
    return Promise.reject(new Error(message))
  },
)

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (username: string, password: string) =>
    apiClient
      .post<{ token: string; role: string; username: string }>('/auth/login', { username, password })
      .then((r) => r.data),
}

// ─── Tags ─────────────────────────────────────────────────────────────────────

export const tagsApi = {
  list: () =>
    apiClient.get<Tag[]>('/tags').then((r) => r.data),

  create: (payload: Omit<Tag, 'id' | 'createdAt'>) =>
    apiClient.post<Tag>('/tags', payload).then((r) => r.data),

  update: (id: string, payload: Omit<Tag, 'id' | 'createdAt'>) =>
    apiClient.put<Tag>(`/tags/${id}`, payload).then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete(`/tags/${id}`),
}

// ─── Submissions ──────────────────────────────────────────────────────────────

export interface SubmitPayload {
  fileName:    string
  fileSize:    number
  tagId:       string
  tagName:     string  // informational — server uses its own DB values
  tagColor:    string  // informational — server uses its own DB values
  passPercent: number
  slideCount:  number
  summary:     { errors: number; warnings: number; infos: number; passing: number }
  issues:      SlideIssue[]
}

export const submissionsApi = {
  /**
   * Submit validation results to the server.
   * - Pass a `file` when the presentation passed validation (admin can download it for review).
   * - Omit `file` for failed submissions — metadata is stored for the user's history only.
   */
  submit: (payload: SubmitPayload, file?: File) => {
    if (file) {
      const fd = new FormData()
      fd.append('file', file, file.name)
      fd.append('metadata', JSON.stringify(payload))
      return apiClient.post<Submission>('/submissions', fd).then((r) => r.data)
    }
    // No file — send JSON only (server stores as metadata-only, no download available)
    return apiClient.post<Submission>('/submissions', payload).then((r) => r.data)
  },

  list: () =>
    apiClient.get<Submission[]>('/submissions').then((r) => r.data),

  mine: () =>
    apiClient.get<Submission[]>('/submissions/mine').then((r) => r.data),

  markReviewed: (id: string) =>
    apiClient.patch<Submission>(`/submissions/${id}/review`).then((r) => r.data),

  remove: (id: string) =>
    apiClient.delete(`/submissions/${id}`),

  downloadUrl: (id: string) => `/api/submissions/${id}/download`,
}
