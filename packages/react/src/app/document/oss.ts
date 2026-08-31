import { apiClient } from '#react/lib/client'

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

export async function uploadOSSImage(file: File): Promise<string> {
  const id = crypto.randomUUID()
  const fileName = `${id}.${extensionForImage(file)}`
  const form = new FormData()
  form.append('file', file, fileName)
  await apiClient.post('/api/oss/upload', form, {
    params: { path: id },
    timeout: 120_000
  })
  return `${id}/${fileName}`
}

export function splitOSSFigURL(url: string): { path: string; fileName: string } {
  const normalized = url.replace(/^\/+/, '').replace(/\/+$/, '')
  const slash = normalized.lastIndexOf('/')
  if (slash === -1) {
    return { path: '', fileName: normalized || 'document.fig' }
  }
  return {
    path: normalized.slice(0, slash),
    fileName: normalized.slice(slash + 1) || 'document.fig'
  }
}

export async function uploadOSSFig(url: string, data: Uint8Array): Promise<void> {
  const { path, fileName } = splitOSSFigURL(url)
  const copy = new Uint8Array(data.byteLength)
  copy.set(data)
  const form = new FormData()
  form.append('file', new Blob([copy], { type: 'application/octet-stream' }), fileName)
  await apiClient.post('/api/oss/upload', form, {
    params: path ? { path } : undefined,
    timeout: 120_000
  })
}
