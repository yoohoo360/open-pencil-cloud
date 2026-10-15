import { atom } from 'nanostores'

import { IS_BROWSER } from '@open-pencil/core/constants'
import { randomHex } from '@open-pencil/scene-graph/random'

const TOKEN_STORAGE_KEY = 'open-pencil:mcp:bearer-token'

/**
 * Plaintext shown only right after Generate / Regenerate.
 * Never reloaded from storage for display after dismiss.
 */
export const revealedLocalMCPAuthToken = atom<string | null>(null)

function readStoredToken(): string | null {
  if (!IS_BROWSER) return null
  try {
    const raw = localStorage.getItem(TOKEN_STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return typeof parsed === 'string' && parsed.trim() ? parsed.trim() : null
  } catch {
    return null
  }
}

function writeStoredToken(token: string | null): void {
  if (!IS_BROWSER) return
  if (!token) localStorage.removeItem(TOKEN_STORAGE_KEY)
  else localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(token))
}

/** Whether a bearer token is stored (value is never exposed to the UI after dismiss). */
export function localMCPAuthTokenConfigured(): boolean {
  return Boolean(readStoredToken())
}

/** Resolve the stored token for MCP restart; not for display. */
export function resolveLocalMCPAuthToken(): string | null {
  return readStoredToken()
}

export function dismissRevealedLocalMCPAuthToken(): void {
  revealedLocalMCPAuthToken.set(null)
}

/** Create or replace the token and reveal the plaintext once. */
export function generateLocalMCPAuthToken(): string {
  const token = randomHex(32)
  writeStoredToken(token)
  revealedLocalMCPAuthToken.set(token)
  return token
}

export function clearLocalMCPAuthToken(): void {
  writeStoredToken(null)
  revealedLocalMCPAuthToken.set(null)
}
