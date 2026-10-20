import { dialog, type BrowserWindow } from 'electron'

export async function openDirectory(
  window: BrowserWindow | null,
  title?: string
): Promise<string | null> {
  const result = await dialog.showOpenDialog(window ?? undefined, {
    title: title ?? 'Choose skill workspace',
    properties: ['openDirectory', 'createDirectory']
  })
  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0] ?? null
}
