import { setOpenPencilOpenFileHandler } from '@/app/browser-bridge'
import { openFileInNewTab } from '@/app/tabs'
import { isTauri } from '@/app/tauri/env'
import { IS_BROWSER } from '@/constants'

if (IS_BROWSER && 'window' in globalThis) {
  setOpenPencilOpenFileHandler(async (path: string) => {
    const response = await fetch(path)
    const blob = await response.blob()
    const name = path.split('/').pop() ?? 'file.fig'
    const file = new File([blob], name, { type: 'application/octet-stream' })
    await openFileInNewTab(file, undefined, path)
  })
}

export async function readTauriDesignFile(path: string): Promise<File> {
  const { readFile } = await import('@tauri-apps/plugin-fs')
  const bytes = await readFile(path)
  return new File([bytes], path.split('/').pop() ?? 'file.fig')
}

export async function chooseTauriOpenPath(): Promise<string | null> {
  const { open } = await import('@tauri-apps/plugin-dialog')
  const path = await open({
    filters: [{ name: 'Design file', extensions: ['fig', 'pen', 'html', 'htm', 'xhtml'] }],
    multiple: false
  })
  return typeof path === 'string' ? path : null
}

export async function openFileFromPath(path: string) {
  if (!isTauri()) return
  const file = await readTauriDesignFile(path)
  await openFileInNewTab(file, undefined, path)
}

export async function openFileDialog() {
  if (isTauri()) {
    const path = await chooseTauriOpenPath()
    if (!path) return
    await openFileFromPath(path)
    return
  }

  if (window.showOpenFilePicker) {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [
          {
            description: 'Design file',
            accept: {
              'application/octet-stream': ['.fig'],
              'application/json': ['.pen'],
              'text/html': ['.html', '.htm'],
              'application/xhtml+xml': ['.xhtml'],
              'text/plain': ['.pen']
            }
          }
        ]
      })
      const file = await handle.getFile()
      await openFileInNewTab(file, handle)
      return
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
    }
  }

  await openBrowserFileDialog()
}

export async function importFileDialog() {
  await openFileDialog()
}

function openBrowserFileDialog(): Promise<void> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.fig,.pen,.html,.htm,.xhtml'
    input.addEventListener(
      'change',
      () => {
        const file = input.files?.[0]
        input.remove()
        if (file) void openFileInNewTab(file).finally(resolve)
        else resolve()
      },
      { once: true }
    )
    input.addEventListener(
      'cancel',
      () => {
        input.remove()
        resolve()
      },
      { once: true }
    )
    input.click()
  })
}
