const USER_STORAGE_KEY = 'open-pencil:auth-user'
const REMEMBERED_USERNAME_KEY = 'open-pencil:remembered-username'

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && Boolean(window.localStorage)
}

export function readRememberedUsername(): string {
  if (!canUseStorage()) return ''
  return window.localStorage.getItem(REMEMBERED_USERNAME_KEY) ?? ''
}

export function writeRememberedUsername(username: string): void {
  if (!canUseStorage()) return
  if (username) window.localStorage.setItem(REMEMBERED_USERNAME_KEY, username)
  else window.localStorage.removeItem(REMEMBERED_USERNAME_KEY)
}

export function writeStoredUserJSON(value: string | null): void {
  if (!canUseStorage()) return
  if (value) window.localStorage.setItem(USER_STORAGE_KEY, value)
  else window.localStorage.removeItem(USER_STORAGE_KEY)
}

export function readStoredUserName(): string {
  const user = readStoredUser()
  if (!user) return ''
  return user.name || user.username || user.email || ''
}

export type StoredAccountUser = {
  id?: string
  name?: string
  username?: string
  email?: string
  avatar?: string
}

export function readStoredUser(): StoredAccountUser | null {
  if (!canUseStorage()) return null
  const raw = window.localStorage.getItem(USER_STORAGE_KEY)
  if (!raw) return null
  try {
    const user = JSON.parse(raw) as StoredAccountUser
    if (!user || typeof user !== 'object') return null
    return user
  } catch {
    return null
  }
}
