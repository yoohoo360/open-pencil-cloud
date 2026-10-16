import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { chmod, mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import * as v from 'valibot'

import { getPlatformDir } from '#mcp/transport/paths'

const AUTH_STORE_FILENAME = 'auth.sealed'
const AUTH_KEY_FILENAME = 'auth.key'
const TOKEN_BYTES = 16
const KEY_BYTES = 32
const IV_BYTES = 12
const ALGORITHM = 'aes-256-gcm'

const SealedAuthTokenJSON = v.pipe(
  v.string(),
  v.parseJson(),
  v.object({
    v: v.literal(1),
    iv: v.pipe(v.string(), v.hexadecimal(), v.minLength(IV_BYTES * 2)),
    tag: v.pipe(v.string(), v.hexadecimal(), v.minLength(32)),
    ct: v.pipe(v.string(), v.hexadecimal(), v.minLength(2))
  })
)

export interface PersistedAuthToken {
  token: string
  /** True when this call created and sealed a new token. */
  created: boolean
}

/**
 * Paths for the sealed auth token and its AES key.
 *
 * Defaults to the platform OpenPencil directory. When
 * `OPENPENCIL_MCP_DISCOVERY_PATH` relocates discovery for tests, the sealed
 * store sits next to that file so workers never touch the user store. Set
 * `OPENPENCIL_MCP_AUTH_STORE_PATH` to pin the sealed file explicitly.
 */
export async function getAuthStorePaths(): Promise<{ sealedPath: string; keyPath: string }> {
  const storeOverride = process.env.OPENPENCIL_MCP_AUTH_STORE_PATH?.trim()
  if (storeOverride) {
    const dir = dirname(storeOverride)
    await mkdir(dir, { recursive: true, mode: 0o700 })
    if (process.platform !== 'win32') await chmod(dir, 0o700).catch(() => undefined)
    return { sealedPath: storeOverride, keyPath: `${storeOverride}.key` }
  }

  const discoveryOverride = process.env.OPENPENCIL_MCP_DISCOVERY_PATH?.trim()
  if (discoveryOverride) {
    const dir = dirname(discoveryOverride)
    await mkdir(dir, { recursive: true, mode: 0o700 })
    if (process.platform !== 'win32') await chmod(dir, 0o700).catch(() => undefined)
    return {
      sealedPath: join(dir, AUTH_STORE_FILENAME),
      keyPath: join(dir, AUTH_KEY_FILENAME)
    }
  }

  const dir = await getPlatformDir()
  return {
    sealedPath: join(dir, AUTH_STORE_FILENAME),
    keyPath: join(dir, AUTH_KEY_FILENAME)
  }
}

async function readOrCreateKey(keyPath: string): Promise<Buffer> {
  try {
    const existing = await readFile(keyPath)
    if (existing.length === KEY_BYTES) return existing
  } catch (error) {
    if (!isEnoent(error)) throw error
  }

  const key = randomBytes(KEY_BYTES)
  await writeFileAtomic(keyPath, key)
  return key
}

function sealToken(token: string, key: Buffer): string {
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const ciphertext = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${JSON.stringify({
    v: 1 as const,
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
    ct: ciphertext.toString('hex')
  })}\n`
}

function openToken(sealed: string, key: Buffer): string | null {
  const parsed = v.safeParse(SealedAuthTokenJSON, sealed)
  if (!parsed.success) return null
  try {
    const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(parsed.output.iv, 'hex'))
    decipher.setAuthTag(Buffer.from(parsed.output.tag, 'hex'))
    return Buffer.concat([
      decipher.update(Buffer.from(parsed.output.ct, 'hex')),
      decipher.final()
    ]).toString('utf8')
  } catch {
    return null
  }
}

async function writeFileAtomic(path: string, data: string | Buffer): Promise<void> {
  const random = randomBytes(6).toString('hex')
  const tmpPath = `${path}.${process.pid}.${random}.tmp`
  await writeFile(tmpPath, data, { mode: 0o600 })
  try {
    await rename(tmpPath, path)
  } catch (error) {
    await unlink(tmpPath).catch(() => undefined)
    throw error
  }
  if (process.platform !== 'win32') await chmod(path, 0o600).catch(() => undefined)
}

/**
 * Writes an encrypted auth token for reuse on later startups.
 * No-op when the token is empty.
 */
export async function persistAuthToken(token: string): Promise<void> {
  const trimmed = token.trim()
  if (!trimmed) return
  const { sealedPath, keyPath } = await getAuthStorePaths()
  const key = await readOrCreateKey(keyPath)
  await writeFileAtomic(sealedPath, sealToken(trimmed, key))
}

/**
 * Loads the sealed token, or creates and seals a new one when missing/unreadable.
 */
export async function loadOrCreatePersistedAuthToken(): Promise<PersistedAuthToken> {
  const { sealedPath, keyPath } = await getAuthStorePaths()
  const key = await readOrCreateKey(keyPath)

  try {
    const sealed = await readFile(sealedPath, 'utf8')
    const token = openToken(sealed, key)?.trim()
    if (token) return { token, created: false }
  } catch (error) {
    if (!isEnoent(error)) {
      process.stderr.write(
        `  Auth store: read warning (${error instanceof Error ? error.message : String(error)})\n`
      )
    }
  }

  const token = randomBytes(TOKEN_BYTES).toString('hex')
  await writeFileAtomic(sealedPath, sealToken(token, key))
  return { token, created: true }
}

/**
 * Resolves the effective auth token for a server start.
 *
 * - `undefined`: load or create the sealed global token
 * - `null`: auth disabled (sealed store left unchanged)
 * - string: use it and update the sealed store so the next auto start matches
 */
export async function resolveAuthTokenOption(
  option: string | null | undefined
): Promise<PersistedAuthToken & { token: string | null }> {
  if (option === null) return { token: null, created: false }
  if (option !== undefined) {
    await persistAuthToken(option)
    return { token: option, created: false }
  }
  return loadOrCreatePersistedAuthToken()
}

function isEnoent(error: unknown): boolean {
  return error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT'
}
