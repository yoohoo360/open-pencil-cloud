import { readStoredUser } from '#react/app/auth/storage'
import {
  asFigObjectPath,
  legacyJsonObjectPath,
  ossObjectDirectory,
  splitOSSObjectURL,
  withCacheBust
} from '#react/app/document/oss-path'
import config from '#react/config'
import { apiClient } from '#react/lib/client'
import { v4 as uuid } from 'uuid'

type OssPresignResponse = {
  url?: string
  headers?: Record<string, string>
  key?: string
}

type OssFileInfo = {
  path?: string
}

function extensionForImage(file: File): string {
  const fromName = file.name.split('.').pop()?.toLowerCase()
  if (fromName && /^[a-z0-9]{2,4}$/.test(fromName)) return fromName
  if (file.type === 'image/jpeg') return 'jpg'
  if (file.type === 'image/png') return 'png'
  if (file.type === 'image/webp') return 'webp'
  if (file.type === 'image/gif') return 'gif'
  if (file.type === 'image/avif') return 'avif'
  return 'png'
}

function storageUsername(): string {
  const user = readStoredUser()
  return user?.username || user?.email?.split('@')[0] || user?.id || 'anonymous'
}

function ossObjectPath(path: string): string {
  return path.replace(/^\/+/, '')
}

async function uploadViaProxy(file: Blob, fileName: string, path: string): Promise<string> {
  const form = new FormData()
  form.append('file', file, fileName)
  const res = await apiClient.post<OssFileInfo>('/api/oss/upload', form, {
    params: path ? { path } : undefined,
    timeout: 120_000
  })
  const stored = res.data?.path
  if (!stored) throw new Error('Invalid OSS upload response')
  return stored
}

async function uploadViaDirect(
  file: Blob,
  fileName: string,
  path: string,
  contentType: string
): Promise<string> {
  const res = await apiClient.post<OssPresignResponse>('/api/oss/presign', {
    path: path || undefined,
    file_name: fileName,
    content_type: contentType || undefined
  })
  const signed = res.data
  if (!signed?.url) throw new Error('Invalid OSS presign response')
  const put = await fetch(signed.url, {
    method: 'PUT',
    body: file,
    headers: signed.headers
  })
  if (!put.ok) {
    throw new Error(`OSS direct upload failed (${put.status})`)
  }
  return signed.key || `${path}/${fileName}`.replace(/^\/+/, '')
}

async function uploadOSSObject(file: Blob, fileName: string, path: string): Promise<string> {
  if (config.OSS_UPLOAD_MODE === 'direct') {
    return uploadViaDirect(file, fileName, path, file.type || 'application/octet-stream')
  }
  return uploadViaProxy(file, fileName, path)
}

export function ossPublicUrl(path: string): string | undefined {
  const base = config.OSS_PUBLIC_BASE_URL?.replace(/\/+$/, '')
  if (!base) return undefined
  return `${base}/${ossObjectPath(path)}`
}

async function directReadUrl(path: string, options?: { public?: boolean }): Promise<string> {
  if (options?.public !== false) {
    const publicUrl = ossPublicUrl(path)
    if (publicUrl) return publicUrl
  }
  const res = await apiClient.post<OssPresignResponse>('/api/oss/presign-download', {
    path: ossObjectPath(path)
  })
  const url = res.data?.url
  if (!url) throw new Error('Invalid OSS download presign')
  return url
}

export async function resolveOssReadUrl(path: string, revision?: string | number): Promise<string> {
  if (/^https?:\/\//i.test(path)) return withCacheBust(path, revision)
  if (path.startsWith('/')) {
    return withCacheBust(`${config.API_BASE_URL}${path}`, revision)
  }
  if (config.OSS_READ_MODE === 'direct') {
    const url = await directReadUrl(path)
    return ossPublicUrl(path) ? withCacheBust(url, revision) : url
  }
  const res = await apiClient.get<Blob>('/api/oss/preview', {
    params: { path: ossObjectPath(path) },
    responseType: 'blob',
    timeout: 60_000
  })
  if (!res.data) throw new Error('Empty OSS preview')
  return URL.createObjectURL(res.data)
}

/** Server-side fetch for cross-origin images (avoids browser CORS). */
export async function fetchRemoteImageViaApi(url: string): Promise<Uint8Array> {
  const res = await apiClient.get<ArrayBuffer>('/api/common/fetch-url', {
    params: { url },
    responseType: 'arraybuffer',
    timeout: 60_000
  })
  if (!res.data) throw new Error('Empty remote image response')
  return new Uint8Array(res.data)
}

/** Authenticated download through the API — used for private keys and filesystem OSS backends. */
export async function downloadOSSObjectViaProxy(objectPath: string): Promise<Uint8Array> {
  const res = await apiClient.get<ArrayBuffer>('/api/oss/download', {
    params: { path: ossObjectPath(objectPath) },
    responseType: 'arraybuffer',
    timeout: 120_000
  })
  if (!res.data) throw new Error('Empty OSS download')
  return new Uint8Array(res.data)
}

async function downloadFromUrl(url: string): Promise<Uint8Array | number> {
  const response = await fetch(url)
  if (response.ok) return new Uint8Array(await response.arrayBuffer())
  return response.status
}

export async function downloadOSSObject(path: string): Promise<Uint8Array> {
  const objectPath = ossObjectPath(path)
  if (!objectPath) throw new Error('Empty OSS path')
  // Absolute URLs (library covers, signed links) skip the object-key pipeline.
  if (/^https?:\/\//i.test(objectPath)) {
    const result = await downloadFromUrl(objectPath)
    if (typeof result !== 'number') return result
    throw new Error(`OSS download failed (${result})`)
  }
  if (config.OSS_READ_MODE === 'direct') {
    const publicUrl = ossPublicUrl(objectPath)
    if (publicUrl) {
      const result = await downloadFromUrl(publicUrl)
      if (typeof result !== 'number') return result
    }
    // Private objects (e.g. `libraries/*.fig`) need a signed URL; the public base 404s.
    try {
      const signed = await directReadUrl(objectPath, { public: false })
      const result = await downloadFromUrl(signed)
      if (typeof result !== 'number') return result
    } catch {
      // Fall through to the authenticated download proxy.
    }
    return downloadOSSObjectViaProxy(objectPath)
  }
  return downloadOSSObjectViaProxy(objectPath)
}

/** Download a cloud document object, preferring `.fig` over legacy `.json`. */
export async function downloadOSSFig(url: string): Promise<Uint8Array> {
  const figPath = asFigObjectPath(url)
  try {
    return await downloadOSSObject(figPath)
  } catch (error) {
    const legacy = legacyJsonObjectPath(figPath)
    if (!legacy || legacy === figPath) throw error
    return downloadOSSObject(legacy)
  }
}

export async function uploadOSSImage(file: File): Promise<string> {
  const id = uuid()
  const dir = ossObjectDirectory('img', storageUsername())
  const fileName = `${id}.${extensionForImage(file)}`
  return uploadOSSObject(file, fileName, dir)
}

export function splitOSSFigURL(url: string): {
  path: string
  fileName: string
} {
  return splitOSSObjectURL(url)
}

export async function uploadOSSFig(url: string, data: Uint8Array): Promise<string> {
  const { path, fileName } = splitOSSObjectURL(asFigObjectPath(url))
  const copy = new Uint8Array(data.byteLength)
  copy.set(data)
  // Returns the full object key (e.g. `pencil-dev/libraries/web_lib_button.fig`).
  return uploadOSSObject(new Blob([copy], { type: 'application/octet-stream' }), fileName, path)
}
