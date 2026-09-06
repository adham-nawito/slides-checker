import axios from 'axios'
import type { Tag, Submission, SlideIssue } from '@/types'

export const apiClient = axios.create({
  baseURL: '/api',
  timeout: 60_000,
})

// Attach token from localStorage on every request
apiClient.interceptors.request.use((config) => {
  try {
    const raw = localStorage.getItem('pptx-auth')
    if (raw) {
      const { token } = JSON.parse(raw)
      if (token) config.headers.Authorization = `Bearer ${token}`
    }
  } catch { /* ignore */ }
  return config
})

apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    const message = err.response?.data?.error ?? err.message ?? 'Unexpected error'
    return Promise.reject(new Error(message))
  },
)

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (username: string, password: string) =>
    apiClient.post<{ token: string; role: string; username: string }>('/auth/login', { username, password })
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
  fileName: string
  fileSize: number
  tagId: string
  tagName: string
  passPercent: number
  slideCount: number
  summary: { errors: number; warnings: number; infos: number; passing: number }
  issues: SlideIssue[]
}

export const submissionsApi = {
  /** Upload the file + JSON metadata as multipart/form-data */
  submit: (payload: SubmitPayload, file: File) => {
    const fd = new FormData()
    fd.append('file', file, file.name)
    fd.append('metadata', JSON.stringify(payload))
    return apiClient.post<Submission>('/submissions', fd).then((r) => r.data)
  },

  list: () =>
    apiClient.get<Submission[]>('/submissions').then((r) => r.data),

  markReviewed: (id: string) =>
    apiClient.patch<Submission>(`/submissions/${id}/review`).then((r) => r.data),

  /** Returns a download URL for a submission file (admin only) */
  downloadUrl: (id: string) => `/api/submissions/${id}/download`,
}
