import axios, { type AxiosRequestConfig } from 'axios'
import type { AxiosError, InternalAxiosRequestConfig } from 'axios'
import Cookies from 'js-cookie'

// Mock 模式使用 Vite 开发服务器代理 /api
// 真实模式使用完整的后端地址（环境变量配置，如 http://localhost:3000/api）
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const _apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

_apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => Promise.reject(error)
)

type Response<T> = {
  data: T
  success: boolean
  message?: string
  total?: number
}

interface BackendrefreshTokenResponse {
  access_token: string
  refresh_token: string
}
// ============================================================================
// Token 刷新机制
// ============================================================================

let isRefreshing = false
let refreshPromise: Promise<BackendrefreshTokenResponse> | null = null

interface PendingRequest {
  resolve: (token: string) => void
  reject: (error: unknown) => void
}
const pendingRequests: PendingRequest[] = []

function enqueueRequest(resolve: (token: string) => void, reject: (error: unknown) => void) {
  pendingRequests.push({ resolve, reject })
}

function flushPendingRequests(error: unknown | null, token?: string) {
  pendingRequests.forEach((request) => {
    if (error) {
      request.reject(error)
    } else if (token) {
      request.resolve(token)
    }
  })
  pendingRequests.length = 0
}

// 清理令牌并跳转登录页
function clearTokensAndRedirect() {
  Cookies.remove('access_token')
  Cookies.remove('refresh_token')
  if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
    // const {logout} = useAuthStore.getState()
    // logout()
    window.location.href = '/login'
  }
}

async function refreshaccess_token(): Promise<BackendrefreshTokenResponse> {
  const refresh_token = Cookies.get('refresh_token')

  if (!refresh_token) {
    throw new Error('No refresh token available')
  }

  // 使用独立的 axios 实例，避免触发拦截器造成循环
  const response = await axios.post<BackendrefreshTokenResponse>(
    `${API_BASE_URL}/api/auth/refresh`,
    { refresh_token },
    {
      headers: {
        'Content-Type': 'application/json'
      }
    }
  )
  const data = response?.data?.data || {}
  if (response?.status === 401 || response?.status === 403) {
    clearTokensAndRedirect()
    return data
  }

  const { access_token, refresh_token: newrefresh_token } = data

  // 存储新的 tokens
  Cookies.set('access_token', access_token, { expires: 7 })
  Cookies.set('refresh_token', newrefresh_token, { expires: 30 })

  return data
}

// ============================================================================
// 请求拦截器
// ============================================================================

_apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = Cookies.get('access_token')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error: AxiosError) => {
    return Promise.reject(error)
  }
)

// ============================================================================
// 响应拦截器
// ============================================================================

_apiClient.interceptors.response.use(
  (response) => {
    return response
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    // 真实 API 模式：实现 token 刷新
    if (
      (error.response?.status !== 401 && error.response?.data?.code === 'TOKEN_EXPIRED') ||
      !originalRequest
    ) {
      return Promise.reject(error)
    }

    if (originalRequest._retry) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        // 已经尝试过刷新但仍失败，不再重试
        clearTokensAndRedirect(error.response?.status)
      }

      return Promise.reject(error)
    }

    originalRequest._retry = true

    if (isRefreshing && refreshPromise) {
      // 正在刷新中，将当前请求加入队列
      return new Promise((resolve, reject) => {
        enqueueRequest(
          (token: string) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`
            }
            resolve(apiClient(originalRequest))
          },
          (err: unknown) => {
            reject(err)
          }
        )
      })
    }
    // 真实 API 模式：实现 token 刷新
    if (
      error.response?.status &&
      error.response?.status !== 401 &&
      error.response?.status !== 403
    ) {
      return Promise.reject(error)
    }

    isRefreshing = true

    refreshPromise = refreshaccess_token()

    try {
      const { access_token } = await refreshPromise

      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${access_token}`
      }

      flushPendingRequests(null, access_token)

      return _apiClient(originalRequest)
    } catch (refreshError) {
      // 刷新失败，清理所有待处理请求并清除令牌
      if (refreshError && refreshError.toString().includes('failed with status code 401')) {
        flushPendingRequests(refreshError)
        clearTokensAndRedirect()
      }

      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
      refreshPromise = null
    }
  }
)

// API 响应类型
export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}

// 用户相关类型（带权限的账号信息）
interface User {
  id: string
  email: string
  name: string
  avatar?: string
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
  createdAt: string
  lastLoginAt?: string
}

interface AccountWithToken extends User {
  token: string
}

interface LoginRequest {
  username_or_email: string
  password: string
  remember?: boolean
}

interface RegisterRequest {
  name: string
  email: string
  password: string
  confirmPassword: string
}

interface LoginResponse {
  user: AccountWithToken
  token: string
  expiresIn: number
  accounts: AccountWithToken[]
}

interface CurrentUserResponse {
  user: AccountWithToken
  accounts: AccountWithToken[]
}

// ============================================================================
// Auth API
// ============================================================================

interface BackendLoginResponse {
  access_token: string
  refresh_token: string
  user: AccountWithToken
}

interface BackendCurrentUserResponse {
  id: string
  email: string
  username?: string
  name: string
  avatar?: string
  status: string
  phone?: string
  department?: string
  position?: string
  bio?: string
  createdAt?: string
  updatedAt?: string
  lastLoginAt?: string
}

export const authApi = {
  login: async (data: LoginRequest): Promise<BackendLoginResponse> => {
    // 真实 API 调用
    const response = await apiClient.post<BackendLoginResponse>('/api/auth/login', {
      username_or_email: data.username_or_email,
      password: data.password
    })
    // 存储 tokens
    Cookies.set('access_token', response.data.access_token, { expires: 7 })
    Cookies.set('refresh_token', response.data.refresh_token, { expires: 30 })
    // 保存token到localStorage
    localStorage.setItem('user', JSON.stringify(response.data.user))
    return response.data
  },

  register: async (data: RegisterRequest): Promise<BackendLoginResponse> => {
    // 真实 API 调用
    const response = await apiClient.post<BackendLoginResponse>('/api/auth/register', {
      email: data.email,
      name: data.name,
      password: data.password
    })

    const loginResponse = response.data

    // 存储 tokens
    Cookies.set('access_token', loginResponse.access_token, { expires: 7 })
    Cookies.set('refresh_token', response.data.refresh_token, { expires: 30 })

    return loginResponse
  },

  forgotPassword: async (email: string): Promise<void> => {
    await apiClient.post('/api/auth/forgot-password', { email })
  },

  resetPassword: async (token: string, password: string): Promise<void> => {
    await apiClient.post('/api/auth/reset-password', { token, password })
  },

  logout: async (): Promise<void> => {
    try {
      await apiClient.post('/api/auth/logout')
    } finally {
      Cookies.remove('access_token')
      Cookies.remove('refresh_token')
    }
  },

  getCurrentUser: async (): Promise<CurrentUserResponse | null> => {
    const token = Cookies.get('access_token')
    if (!token) return null

    try {
      const response = await apiClient.get<BackendCurrentUserResponse>('/api/auth/me')

      return response.data
    } catch (error) {
      // 如果是 401 错误，清理 token 并跳转（拦截器会处理，这里只记录）
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        console.error('获取当前用户失败: 未授权')
      } else {
        console.error('获取当前用户失败:', error)
      }
      return null
    }
  },

  getAccounts: async (): Promise<AccountWithToken[]> => {
    // 真实 API 暂不支持多账号
    return []
  }
}

export const apiClient = {
  async get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<Response<T>> {
    const res = await _apiClient.get(url, config)
    if (res instanceof ArrayBuffer) {
      return {
        data: res,
        success: true
      }
    }
    return res
  },

  post<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<Response<T>> {
    return _apiClient.post(url, data, config)
  },

  put<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<Response<T>> {
    return _apiClient.put(url, data, config)
  },

  patch<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<Response<T>> {
    return _apiClient.patch(url, data, config)
  },

  delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<Response<T>> {
    return _apiClient.delete(url, config)
  },

  request<T = unknown>(config: AxiosRequestConfig): Promise<Response<T>> {
    return _apiClient.request(config)
  }
}
export default apiClient
