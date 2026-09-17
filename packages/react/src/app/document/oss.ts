import { readStoredUser } from '#react/app/auth/storage'
import {
  cloudDocumentLayout,
  ossBlobObjectPath,
  ossObjectDirectory,
  splitOSSObjectURL,
  unusedBlobObjectPaths,
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

async function directReadUrl(path: string): Promise<string> {
  const publicUrl = ossPublicUrl(path)
  if (publicUrl) return publicUrl
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

export async function downloadOSSObject(path: string): Promise<Uint8Array> {
  const objectPath = ossObjectPath(path)
  if (!objectPath) throw new Error('Empty OSS path')
  if (config.OSS_READ_MODE === 'direct') {
    const url = await directReadUrl(objectPath)
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`OSS direct download failed (${response.status})`)
    }
    return new Uint8Array(await response.arrayBuffer())
  }
  const res = await apiClient.get<ArrayBuffer>('/api/oss/download', {
    params: { path: objectPath },
    responseType: 'arraybuffer',
    timeout: 120_000
  })
  if (!res.data) throw new Error('Empty OSS download')
  return new Uint8Array(res.data)
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

export async function uploadOSSFig(url: string, data: Uint8Array): Promise<void> {
  const { path, fileName } = splitOSSObjectURL(url)
  const copy = new Uint8Array(data.byteLength)
  copy.set(data)
  await uploadOSSObject(new Blob([copy], { type: 'application/json' }), fileName, path)
}

export async function uploadOSSBinary(
  documentUrl: string,
  hash: string,
  data: Uint8Array
): Promise<void> {
  const objectPath = ossBlobObjectPath(documentUrl, hash)
  const slash = objectPath.lastIndexOf('/')
  const path = objectPath.slice(0, slash)
  const fileName = objectPath.slice(slash + 1)
  const copy = new Uint8Array(data.byteLength)
  copy.set(data)
  await uploadOSSObject(new Blob([copy], { type: 'application/octet-stream' }), fileName, path)
}

export async function downloadOSSBinary(documentUrl: string, hash: string): Promise<Uint8Array> {
  return downloadOSSObject(ossBlobObjectPath(documentUrl, hash))
}

export async function uploadOSSBinaries(
  documentUrl: string,
  binaries: ReadonlyMap<string, Uint8Array>
): Promise<void> {
  await Promise.all([...binaries].map(([hash, bytes]) => uploadOSSBinary(documentUrl, hash, bytes)))
}

export async function listOSSObjects(prefix: string): Promise<string[]> {
  const res = await apiClient.get<string[]>('/api/oss/list', {
    params: { path: ossObjectPath(prefix) }
  })
  return Array.isArray(res.data) ? res.data.filter((item) => typeof item === 'string') : []
}

export async function deleteOSSObject(path: string): Promise<void> {
  const objectPath = ossObjectPath(path)
  if (!objectPath) return
  await apiClient.delete('/api/oss/delete', { params: { path: objectPath } })
}

export async function deleteUnusedOSSBinaries(
  documentUrl: string,
  keepHashes: ReadonlySet<string>
): Promise<void> {
  const { blobDirectory } = cloudDocumentLayout(documentUrl)
  let existing: string[]
  try {
    existing = await listOSSObjects(blobDirectory)
  } catch (error) {
    console.warn('[Document] Failed to list unused blobs', error)
    return
  }
  const unused = unusedBlobObjectPaths(existing, keepHashes)
  await Promise.all(
    unused.map(async (path) => {
      try {
        await deleteOSSObject(path)
      } catch (error) {
        console.warn('[Document] Failed to delete unused blob', path, error)
      }
    })
  )
}
