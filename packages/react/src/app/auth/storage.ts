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
