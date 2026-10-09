import { loginPathWithRedirect } from '#react/app/auth/redirect'
import { writeStoredUserJSON } from '#react/app/auth/storage'
import type {
  DocumentAccessSnapshot,
  DocumentPermissionRequest
} from '#react/app/document/access'
import type {
  DocumentComment,
  DocumentCommentList,
  DocumentCommentThread
} from '#react/app/document/comments/types'
import type {
  DocumentVersion,
  DocumentVersionKind,
  DocumentVersionList
} from '#react/app/document/version-history/types'
import axios, {
  type AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig
} from 'axios'
import Cookies from 'js-cookie'

import config from '../config'
import { AUTH_ERROR_CODE, readAuthErrorCode, shouldAttemptTokenRefresh } from './auth-error'

const ACCESS_TOKEN_COOKIE = 'access_token'
const REFRESH_TOKEN_COOKIE = 'refresh_token'

export const getHttpClientBaseUrl = () => {
  return config.API_BASE_URL
}

const AUTH_REFRESH_SKIP_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/verify-email',
  '/api/auth/resend-verification',
  '/api/oauth/session'
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
  owner_id?: string
  allow_copy?: boolean
  personal?: boolean
  my_role?: 'read' | 'write' | 'admin' | 'view' | 'edit' | 'manage'
  capabilities?: string[]
  thumbnail_url?: string
  version?: string
  schema_version?: number | string
  is_deleted?: number
  created_at?: string | number
  updated_at?: string | number
  last_opened_at?: string | number
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

export type RegisterRequest = {
  username: string
  email: string
  password: string
  name: string
}

export type RegisterResponse = {
  requires_verification: boolean
  email: string
}

export type CreateDocumentRequest = {
  name: string
  description?: string
  team_id?: string
  project_id?: string
}

export type TeamSummary = {
  id: string
  name: string
  description?: string
  avatar?: string
  owner_id?: string
  parent_id?: string
  approval_status?: string
  member_count?: number
}

export type OrganizationSummary = {
  id: string
  name: string
  org_code?: string
  description?: string
  avatar?: string
  owner_id?: string
  base_permission?: string
  approval_status?: string
  member_count?: number
  team_count?: number
  created_at?: string | number
  updated_at?: string | number
}

export type MembershipInvitation = {
  id: string
  target_type: 'organization' | 'team' | 'document'
  target_id: string
  target_key?: string
  target_name?: string
  invitee_id: string
  invitee_name?: string
  invitee_username?: string
  invitee_email?: string
  inviter_id: string
  inviter_name?: string
  inviter_username?: string
  role: string
  status: string
  message?: string
  created_at?: number
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

export type PublishLibraryRequest = {
  key: string
  name: string
  url: string
  description?: string
  thumbnail_url?: string
  version?: string
  schema_version?: string
  project_id?: string
}

type RetryRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean }
const http = axios.create({
  baseURL: getHttpClientBaseUrl(),
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
    `${getHttpClientBaseUrl()}/api/auth/refresh`,
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
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    config.headers.delete('Content-Type')
  }
  return config
})

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryRequestConfig | undefined
    const status = error.response?.status
    const authCode = readAuthErrorCode(error.response?.data)
    if (!originalRequest || shouldSkipRefresh(originalRequest)) {
      throw error
    }
    if (!shouldAttemptTokenRefresh(status, authCode)) {
      if (authCode === AUTH_ERROR_CODE.INVALID_TOKEN) {
        clearTokensAndRedirect()
      }
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
  },
  patch<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<APIResponse<T>> {
    return unwrap<T>(http.patch(url, data, config), config)
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

  async register(data: RegisterRequest): Promise<RegisterResponse> {
    const response = await apiClient.post<RegisterResponse>('/api/auth/register', data)
    return {
      requires_verification: Boolean(response.data?.requires_verification),
      email: response.data?.email ?? data.email
    }
  },

  async verifyEmail(data: { email: string; code: string }): Promise<AuthTokens> {
    const response = await apiClient.post<AuthTokens>('/api/auth/verify-email', data)
    const tokens = unwrapAuthTokens(response)
    setTokens(tokens.access_token, tokens.refresh_token)
    if (tokens.user) writeStoredUserJSON(JSON.stringify(tokens.user))
    return tokens
  },

  async resendVerification(email: string): Promise<void> {
    await apiClient.post('/api/auth/resend-verification', { email })
  },

  async oauthSession(ticket: string): Promise<AuthTokens> {
    const response = await apiClient.post<AuthTokens>('/api/oauth/session', {
      ticket
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
        await apiClient.post('/api/auth/logout', {
          refresh_token: refreshToken
        })
      }
    } finally {
      clearTokens()
    }
  }
}

export const documentAPI = {
  list(params?: {
    team_id?: string
    personal?: boolean
    recent?: boolean
  }): Promise<APIResponse<PencilDocument[]>> {
    return apiClient.get<PencilDocument[]>('/api/document/list', { params })
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
  getAccess(key: string): Promise<APIResponse<DocumentAccessSnapshot>> {
    return apiClient.get(`/api/resources/document/${key}/access`)
  },
  updateAccessSettings(
    key: string,
    data: { allow_copy?: boolean }
  ): Promise<APIResponse<DocumentAccessSnapshot>> {
    return apiClient.put(`/api/resources/document/${key}/access/settings`, data)
  },
  grantAccess(
    key: string,
    data: { principal_type?: string; principal_id: string; role: string }
  ): Promise<APIResponse<DocumentAccessSnapshot>> {
    return apiClient.put(`/api/resources/document/${key}/access/grants`, {
      principal_type: data.principal_type ?? 'user',
      principal_id: data.principal_id,
      role: data.role
    })
  },
  revokeAccess(
    key: string,
    principalId: string,
    principalType = 'user'
  ): Promise<APIResponse<DocumentAccessSnapshot>> {
    return apiClient.delete(
      `/api/resources/document/${key}/access/grants/${principalType}/${principalId}`
    )
  },
  requestAccess(
    key: string,
    data: { role: string; message?: string }
  ): Promise<APIResponse<DocumentPermissionRequest>> {
    return apiClient.post(`/api/resources/document/${key}/access/requests`, data)
  },
  listAccessRequests(key: string): Promise<APIResponse<DocumentPermissionRequest[]>> {
    return apiClient.get(`/api/resources/document/${key}/access/requests`)
  },
  approveAccessRequest(
    key: string,
    requestId: string
  ): Promise<APIResponse<DocumentPermissionRequest>> {
    return apiClient.post(`/api/resources/document/${key}/access/requests/${requestId}/approve`)
  },
  rejectAccessRequest(
    key: string,
    requestId: string
  ): Promise<APIResponse<DocumentPermissionRequest>> {
    return apiClient.post(`/api/resources/document/${key}/access/requests/${requestId}/reject`)
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
  },
  detachLibrary(fileKey: string, data: AttachDocumentLibraryRequest): Promise<APIResponse<void>> {
    return apiClient.delete(`/api/document/${fileKey}/library`, {
      params: {
        library_key: data.library_key,
        document_version: data.document_version
      }
    })
  },
  updateThumbnail(fileKey: string, file: File): Promise<APIResponse<boolean>> {
    const form = new FormData()
    form.append('file', file)
    return apiClient.put<boolean>(`/api/document/${fileKey}/thumbnail`, form, {
      timeout: 60_000
    })
  },
  listVersions(
    fileKey: string,
    params?: { named_before?: number; named_limit?: number }
  ): Promise<APIResponse<DocumentVersionList>> {
    return apiClient.get<DocumentVersionList>(`/api/document/${fileKey}/versions`, { params })
  },
  createVersion(
    fileKey: string,
    data: {
      kind: DocumentVersionKind
      title?: string
      description?: string
    }
  ): Promise<APIResponse<DocumentVersion>> {
    return apiClient.post<DocumentVersion>(`/api/document/${fileKey}/versions`, {
      kind: data.kind,
      title: data.title,
      description: data.description
    })
  },
  updateVersion(
    fileKey: string,
    versionId: string,
    data: { title?: string; description?: string }
  ): Promise<APIResponse<DocumentVersion>> {
    return apiClient.patch<DocumentVersion>(`/api/document/${fileKey}/versions/${versionId}`, data)
  },
  restoreVersion(fileKey: string, versionId: string): Promise<APIResponse<DocumentVersion>> {
    return apiClient.post<DocumentVersion>(`/api/document/${fileKey}/versions/${versionId}/restore`)
  },
  listComments(
    fileKey: string,
    params?: { page_id?: string; resolved?: boolean }
  ): Promise<APIResponse<DocumentCommentList>> {
    return apiClient.get<DocumentCommentList>(`/api/document/${fileKey}/comments`, { params })
  },
  createCommentThread(
    fileKey: string,
    data: {
      page_id: string
      node_id?: string
      x: number
      y: number
      body: string
    }
  ): Promise<APIResponse<DocumentCommentThread>> {
    return apiClient.post<DocumentCommentThread>(`/api/document/${fileKey}/comments`, data)
  },
  replyToComment(
    fileKey: string,
    threadId: string,
    data: { body: string }
  ): Promise<APIResponse<DocumentComment>> {
    return apiClient.post<DocumentComment>(
      `/api/document/${fileKey}/comments/${threadId}/replies`,
      data
    )
  },
  resolveCommentThread(
    fileKey: string,
    threadId: string,
    data: { resolved: boolean }
  ): Promise<APIResponse<DocumentCommentThread>> {
    return apiClient.patch<DocumentCommentThread>(
      `/api/document/${fileKey}/comments/${threadId}`,
      data
    )
  },
  deleteComment(fileKey: string, threadId: string, commentId: string): Promise<APIResponse<void>> {
    return apiClient.delete(`/api/document/${fileKey}/comments/${threadId}/messages/${commentId}`)
  }
}

export const libraryAPI = {
  list(): Promise<APIResponse<RemoteLibraryCatalogItem[]>> {
    return apiClient.get<RemoteLibraryCatalogItem[]>('/api/libraries/list')
  },
  publish(data: PublishLibraryRequest): Promise<APIResponse<RemoteLibraryCatalogItem>> {
    return apiClient.post<RemoteLibraryCatalogItem>('/api/libraries', data)
  }
}

export type PencilSkill = {
  id: string
  skill_key: string
  name: string
  description?: string
  content: string
  owner_id?: string
  group_id: string
  org_id?: string
  team_id?: string | null
  created_at?: string | number
  updated_at?: string | number
}

export type PencilSkillGroup = {
  id: string
  group_key: string
  name: string
  description?: string
  owner_id?: string
  owned_by_me?: boolean
  sort_order?: number
  skill_count?: number
  team_ids?: string[]
  skills?: PencilSkill[]
  created_at?: string | number
  updated_at?: string | number
}

export type SkillCatalogCategory = {
  kind: 'personal' | 'team'
  team_id?: string
  team_name?: string
  groups: PencilSkillGroup[]
}

export type UpsertSkillRequest = {
  skill_key: string
  name: string
  description?: string
  content?: string
  group_id: string
  org_id?: string
}

export type SkillMergeRequest = {
  id: string
  org_id: string
  source_skill_id: string
  target_team_id: string
  target_skill_id?: string
  skill_key: string
  title: string
  message?: string
  status: 'pending' | 'approved' | 'rejected' | 'merged' | 'cancelled' | string
  created_by: string
  reviewed_by?: string
  review_note?: string
  created_at?: number
  updated_at?: number
  merged_at?: number
  source_skill_name?: string
  target_team_name?: string
}

export type UpsertSkillGroupRequest = {
  name: string
  description?: string
  group_key?: string
  team_ids?: string[]
}

export type SkillEntryKind = 'file' | 'directory'

export type SkillEntry = {
  id: string
  skill_id: string
  parent_id?: string
  kind: SkillEntryKind
  name: string
  path: string
  content?: string | null
  sort_order?: number
  children?: SkillEntry[]
  created_at?: string | number
  updated_at?: string | number
}

export type CreateSkillEntryRequest = {
  kind: SkillEntryKind
  name: string
  parent_id?: string
  content?: string
}

export type UpdateSkillEntryRequest = {
  name?: string
  content?: string
}

export const skillAPI = {
  catalog(params?: { org_id?: string }): Promise<APIResponse<SkillCatalogCategory[]>> {
    return apiClient.get<SkillCatalogCategory[]>('/api/skills/catalog', { params })
  },
  list(params?: { group_id?: string; org_id?: string }): Promise<APIResponse<PencilSkill[]>> {
    return apiClient.get<PencilSkill[]>('/api/skills', { params })
  },
  get(id: string): Promise<APIResponse<PencilSkill>> {
    return apiClient.get<PencilSkill>(`/api/skills/${id}`)
  },
  create(data: UpsertSkillRequest): Promise<APIResponse<PencilSkill>> {
    return apiClient.post<PencilSkill>('/api/skills', data)
  },
  update(id: string, data: UpsertSkillRequest): Promise<APIResponse<PencilSkill>> {
    return apiClient.put<PencilSkill>(`/api/skills/${id}`, data)
  },
  remove(id: string): Promise<APIResponse<void>> {
    return apiClient.delete(`/api/skills/${id}`)
  },
  tree(skillId: string): Promise<APIResponse<SkillEntry[]>> {
    return apiClient.get<SkillEntry[]>(`/api/skills/${skillId}/tree`)
  },
  createEntry(skillId: string, data: CreateSkillEntryRequest): Promise<APIResponse<SkillEntry>> {
    return apiClient.post<SkillEntry>(`/api/skills/${skillId}/entries`, data)
  },
  updateEntry(entryId: string, data: UpdateSkillEntryRequest): Promise<APIResponse<SkillEntry>> {
    return apiClient.put<SkillEntry>(`/api/skills/entries/${entryId}`, data)
  },
  removeEntry(entryId: string): Promise<APIResponse<void>> {
    return apiClient.delete(`/api/skills/entries/${entryId}`)
  },
  download(skillId: string): Promise<APIResponse<Blob>> {
    return apiClient.get<Blob>(`/api/skills/${skillId}/download`, { responseType: 'blob' })
  },
  upload(skillId: string, file: File | Blob): Promise<APIResponse<PencilSkill>> {
    const form = new FormData()
    form.append('file', file, file instanceof File ? file.name : 'skill.zip')
    return apiClient.post<PencilSkill>(`/api/skills/${skillId}/upload`, form, { timeout: 120_000 })
  },
  share(
    skillId: string,
    data: { team_id: string; title?: string; message?: string }
  ): Promise<APIResponse<SkillMergeRequest>> {
    return apiClient.post<SkillMergeRequest>(`/api/skills/${skillId}/share`, data)
  },
  fetch(data: {
    team_id: string
    skill_key: string
    group_id: string
    org_id: string
  }): Promise<APIResponse<PencilSkill>> {
    return apiClient.post<PencilSkill>('/api/skills/fetch', data)
  },
  listMergeRequests(params: {
    org_id: string
    status?: string
  }): Promise<APIResponse<SkillMergeRequest[]>> {
    return apiClient.get<SkillMergeRequest[]>('/api/skills/merge-requests', { params })
  },
  approveMergeRequest(
    id: string,
    data?: { review_note?: string }
  ): Promise<APIResponse<SkillMergeRequest>> {
    return apiClient.post<SkillMergeRequest>(`/api/skills/merge-requests/${id}/approve`, data ?? {})
  },
  rejectMergeRequest(
    id: string,
    data?: { review_note?: string }
  ): Promise<APIResponse<SkillMergeRequest>> {
    return apiClient.post<SkillMergeRequest>(`/api/skills/merge-requests/${id}/reject`, data ?? {})
  },
  mergeMergeRequest(
    id: string,
    data?: { review_note?: string }
  ): Promise<APIResponse<SkillMergeRequest>> {
    return apiClient.post<SkillMergeRequest>(`/api/skills/merge-requests/${id}/merge`, data ?? {})
  },
  cancelMergeRequest(id: string): Promise<APIResponse<SkillMergeRequest>> {
    return apiClient.post<SkillMergeRequest>(`/api/skills/merge-requests/${id}/cancel`)
  },
  createGroup(
    data: UpsertSkillGroupRequest,
    params?: { org_id?: string }
  ): Promise<APIResponse<PencilSkillGroup>> {
    return apiClient.post<PencilSkillGroup>('/api/skills/groups', data, { params })
  },
  updateGroup(
    id: string,
    data: UpsertSkillGroupRequest,
    params?: { org_id?: string }
  ): Promise<APIResponse<PencilSkillGroup>> {
    return apiClient.put<PencilSkillGroup>(`/api/skills/groups/${id}`, data, { params })
  },
  setGroupTeams(
    id: string,
    teamIds: string[],
    params?: { org_id?: string }
  ): Promise<APIResponse<PencilSkillGroup>> {
    return apiClient.put<PencilSkillGroup>(
      `/api/skills/groups/${id}/teams`,
      { team_ids: teamIds },
      { params }
    )
  },
  removeGroup(id: string): Promise<APIResponse<void>> {
    return apiClient.delete(`/api/skills/groups/${id}`)
  }
}

export const teamAPI = {
  myTeams(params?: { org_id?: string }): Promise<APIResponse<TeamSummary[]>> {
    return apiClient.get<TeamSummary[]>('/api/teams/my-teams', { params })
  },
  create(data: {
    name: string
    description?: string
    parent_id: string
    member_ids?: string[]
  }): Promise<APIResponse<TeamSummary>> {
    return apiClient.post<TeamSummary>('/api/teams', data)
  },
  update(
    id: string,
    data: { name?: string; description?: string; avatar?: string }
  ): Promise<APIResponse<TeamSummary>> {
    return apiClient.put<TeamSummary>(`/api/teams/${id}`, data)
  },
  delete(id: string): Promise<APIResponse<void>> {
    return apiClient.delete(`/api/teams/${id}`)
  }
}

export const orgAPI = {
  mine(): Promise<APIResponse<OrganizationSummary[]>> {
    return apiClient.get<OrganizationSummary[]>('/api/orgs/mine')
  },
  create(data: {
    name: string
    description?: string
  }): Promise<APIResponse<OrganizationSummary>> {
    return apiClient.post<OrganizationSummary>('/api/orgs', data)
  },
  update(
    id: string,
    data: {
      name?: string
      description?: string
      base_permission?: string
      approval_status?: string
    }
  ): Promise<APIResponse<OrganizationSummary>> {
    return apiClient.put<OrganizationSummary>(`/api/orgs/${id}`, data)
  },
  transfer(id: string, newOwner: string): Promise<APIResponse<OrganizationSummary>> {
    return apiClient.post<OrganizationSummary>(`/api/orgs/${id}/transfer`, {
      new_owner: newOwner
    })
  },
  adminList(params?: {
    search?: string
    page?: number
    size?: number
    created_from?: string
    created_to?: string
  }): Promise<APIResponse<OrganizationSummary[]>> {
    return apiClient.get<OrganizationSummary[]>('/api/orgs/admin', { params })
  },
  adminUpdate(
    id: string,
    data: {
      name?: string
      description?: string
      approval_status?: string
    }
  ): Promise<APIResponse<OrganizationSummary>> {
    return apiClient.put(`/api/orgs/admin/${id}`, data)
  }
}

export const invitationAPI = {
  mine(): Promise<APIResponse<MembershipInvitation[]>> {
    return apiClient.get<MembershipInvitation[]>('/api/invitations/mine')
  },
  create(data: {
    target_type: 'organization' | 'team' | 'document'
    target_id: string
    invitee: string
    role?: string
    message?: string
  }): Promise<APIResponse<MembershipInvitation>> {
    return apiClient.post<MembershipInvitation>('/api/invitations', data)
  },
  accept(id: string): Promise<APIResponse<MembershipInvitation>> {
    return apiClient.post(`/api/invitations/${id}/accept`)
  },
  reject(id: string): Promise<APIResponse<MembershipInvitation>> {
    return apiClient.post(`/api/invitations/${id}/reject`)
  }
}

export type UserLookup = {
  id: string
  email: string
  username?: string
  name?: string
  avatar?: string
  is_admin?: boolean
}

export const userAPI = {
  lookup(query: string): Promise<APIResponse<UserLookup>> {
    return apiClient.get<UserLookup>('/api/users/lookup', { params: { q: query } })
  },
  me(): Promise<APIResponse<UserLookup>> {
    return apiClient.get<UserLookup>('/api/users/me')
  }
}

export const inboxAPI = {
  pendingAccessRequests(): Promise<APIResponse<DocumentPermissionRequest[]>> {
    return apiClient.get<DocumentPermissionRequest[]>('/api/inbox/access-requests')
  }
}

export default apiClient
