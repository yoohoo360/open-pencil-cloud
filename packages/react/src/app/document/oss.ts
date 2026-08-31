import { apiClient } from '#react/lib/client'

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
