import { loginPathWithRedirect } from '#react/app/auth/redirect'
import { writeStoredUserJSON } from '#react/app/auth/storage'
import axios, {
  type AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig
} from 'axios'
import Cookies from 'js-cookie'

export const API_BASE_URL = 'http://localhost:8000'
const ACCESS_TOKEN_COOKIE = 'access_token'
const REFRESH_TOKEN_COOKIE = 'refresh_token'

const AUTH_REFRESH_SKIP_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/auth/forgot-password',
  '/api/auth/reset-password'
]

export type APIResponse<T = unknown> = {
  data: T
  success: boolean
  message?: string
  total?: number
}

export type PencilDocument = {
  id: string
  key: string
  name: string
  description?: string
  url?: string
  team_id?: string
  project_id?: string
  thumbnail_url?: string
  version?: string
  schema_version?: number | string
  is_deleted?: number
  created_at?: string | number
  updated_at?: string | number
}

type AccountUser = {
  id: string
  email: string
  name: string
  avatar?: string
  username?: string
  status?: string
}

type AuthTokens = {
  access_token: string
  refresh_token: string
  user?: AccountUser
}

export type LoginRequest = {
  username_or_email: string
  password: string
}

export type CreateDocumentRequest = {
  name: string
  description?: string
  team_id?: string
  project_id?: string
}

export type RemoteLibraryCatalogItem = {
  id?: string
  key: string
  name: string
  url: string
  version?: string
  thumbnail_url?: string
}

export type AttachDocumentLibraryRequest = {
  library_key: string
  document_version?: string
  library_version?: string
}

type RetryRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean }

const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20_000,
  headers: {
    'Content-Type': 'application/json'
  }
})

let isRefreshing = false
let refreshPromise: Promise<AuthTokens> | null = null
const pendingRequests: Array<{
  resolve: (token: string) => void
  reject: (error: unknown) => void
}> = []

export function hasAccessToken(): boolean {
  return Boolean(Cookies.get(ACCESS_TOKEN_COOKIE))
}

function setTokens(accessToken: string, refreshToken: string): void {
  Cookies.set(ACCESS_TOKEN_COOKIE, accessToken, { expires: 7 })
  Cookies.set(REFRESH_TOKEN_COOKIE, refreshToken, { expires: 30 })
}

function clearTokens(): void {
  Cookies.remove(ACCESS_TOKEN_COOKIE)
  Cookies.remove(REFRESH_TOKEN_COOKIE)
  writeStoredUserJSON(null)
}

function clearTokensAndRedirect(): void {
  clearTokens()
  if (typeof window === 'undefined') return
  if (window.location.pathname.includes('/login')) return
  window.location.href = loginPathWithRedirect(window.location.pathname, window.location.search)
}

function requestPath(config?: AxiosRequestConfig): string {
  const url = config?.url ?? ''
  try {
    return new URL(url, 'http://local.invalid').pathname
  } catch {
    return url
  }
}

function shouldSkipRefresh(config?: AxiosRequestConfig): boolean {
  const path = requestPath(config)
  return AUTH_REFRESH_SKIP_PATHS.some((skipPath) => path === skipPath || path.endsWith(skipPath))
}

function unwrapAuthTokens(payload: unknown): AuthTokens {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid auth response')
  }
  const body = payload as Partial<AuthTokens> & { data?: Partial<AuthTokens> }
  const data = body.data ?? body
  if (!data.access_token || !data.refresh_token) {
    throw new Error('Invalid auth response')
  }
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    user: data.user
  }
}

async function refreshAccessToken(): Promise<AuthTokens> {
  const refreshToken = Cookies.get(REFRESH_TOKEN_COOKIE)
  if (!refreshToken) throw new Error('No refresh token available')

  const response = await axios.post<APIResponse<AuthTokens>>(
    `${API_BASE_URL}/api/auth/refresh`,
    { refresh_token: refreshToken },
    { headers: { 'Content-Type': 'application/json' } }
  )
  const tokens = unwrapAuthTokens(response.data)
  setTokens(tokens.access_token, tokens.refresh_token)
  return tokens
}

function flushPendingRequests(error: unknown, token?: string): void {
  for (const request of pendingRequests) {
    if (error != null) request.reject(error)
    else if (token) request.resolve(token)
  }
  pendingRequests.length = 0
}

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = Cookies.get(ACCESS_TOKEN_COOKIE)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryRequestConfig | undefined
    const status = error.response?.status
    if (status === 401) {
      clearTokensAndRedirect()
      return
    }

    if (
      !originalRequest ||
      shouldSkipRefresh(originalRequest) ||
      (status !== 401 && status !== 403)
    ) {
      throw error
    }

    if (originalRequest._retry) {
      clearTokensAndRedirect()
      throw error
    }

    originalRequest._retry = true

    if (isRefreshing && refreshPromise) {
      return new Promise((resolve, reject) => {
        pendingRequests.push({
          resolve: (token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            resolve(http(originalRequest))
          },
          reject
        })
      })
    }

    isRefreshing = true
    refreshPromise = refreshAccessToken()

    try {
      const { access_token } = await refreshPromise
      originalRequest.headers.Authorization = `Bearer ${access_token}`
      flushPendingRequests(null, access_token)
      return await http(originalRequest)
    } catch (refreshError) {
      flushPendingRequests(
        refreshError instanceof Error ? refreshError : new Error(String(refreshError))
      )
      clearTokensAndRedirect()
      throw refreshError
    } finally {
      isRefreshing = false
      refreshPromise = null
    }
  }
)

export function getAPIErrorMessage(error: unknown, fallback = 'Request failed'): string {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as { message?: string } | string | undefined
    if (typeof body === 'string' && body.trim()) return body
    if (
      body &&
      typeof body === 'object' &&
      typeof body.message === 'string' &&
      body.message.trim()
    ) {
      return body.message
    }
    return error.message || fallback
  }
  if (error instanceof Error && error.message) return error.message
  return fallback
}

function isBinaryConfig(config?: AxiosRequestConfig): boolean {
  return config?.responseType === 'arraybuffer' || config?.responseType === 'blob'
}

async function unwrap<T>(
  request: Promise<{ data: unknown }>,
  config?: AxiosRequestConfig
): Promise<APIResponse<T>> {
  const res = await request
  if (isBinaryConfig(config)) {
    return { data: res.data as T, success: true }
  }
  return res.data as APIResponse<T>
}

export const apiClient = {
  get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<APIResponse<T>> {
    return unwrap<T>(http.get(url, config), config)
  },
  post<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<APIResponse<T>> {
    return unwrap<T>(http.post(url, data, config), config)
  },
  put<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<APIResponse<T>> {
    return unwrap<T>(http.put(url, data, config), config)
  },
  delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<APIResponse<T>> {
    return unwrap<T>(http.delete(url, config), config)
  }
}

export const authAPI = {
  async login(data: LoginRequest): Promise<AuthTokens> {
    const response = await apiClient.post<AuthTokens>('/api/auth/login', {
      username_or_email: data.username_or_email,
      password: data.password
    })
    const tokens = unwrapAuthTokens(response)
    setTokens(tokens.access_token, tokens.refresh_token)
    if (tokens.user) writeStoredUserJSON(JSON.stringify(tokens.user))
    return tokens
  },

  async logout(): Promise<void> {
    const refreshToken = Cookies.get(REFRESH_TOKEN_COOKIE)
    try {
      if (refreshToken) {
        await apiClient.post('/api/auth/logout', { refresh_token: refreshToken })
      }
    } finally {
      clearTokens()
    }
  }
}

export const documentAPI = {
  list(): Promise<APIResponse<PencilDocument[]>> {
    return apiClient.get<PencilDocument[]>('/api/document/list')
  },
  get(key: string): Promise<APIResponse<PencilDocument>> {
    return apiClient.get<PencilDocument>(`/api/document/${key}`)
  },
  create(data: CreateDocumentRequest): Promise<APIResponse<PencilDocument>> {
    return apiClient.post<PencilDocument>('/api/document', data)
  },
  delete(key: string): Promise<APIResponse<void>> {
    return apiClient.delete(`/api/document/${key}`)
  },
  listLibraries(
    fileKey: string,
    documentVersion?: string
  ): Promise<APIResponse<RemoteLibraryCatalogItem[]>> {
    return apiClient.get<RemoteLibraryCatalogItem[]>(`/api/document/${fileKey}/library`, {
      params: documentVersion ? { document_version: documentVersion } : undefined
    })
  },
  attachLibrary(fileKey: string, data: AttachDocumentLibraryRequest): Promise<APIResponse<void>> {
    return apiClient.put(`/api/document/${fileKey}/library`, data)
  }
}

export const libraryAPI = {
  list(): Promise<APIResponse<RemoteLibraryCatalogItem[]>> {
    return apiClient.get<RemoteLibraryCatalogItem[]>('/api/libraries/list')
  }
}

export default apiClient
