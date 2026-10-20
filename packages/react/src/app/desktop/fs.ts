import { desktopInvoke, isElectronShell, isNativeTauriShell } from '#react/app/desktop/bridge'

export type DesktopDirEntry = {
  name: string
  isDirectory: boolean
  isFile: boolean
}

export async function desktopReadFile(path: string): Promise<Uint8Array> {
  if (isElectronShell()) {
    const bytes = await desktopInvoke<Uint8Array>('fs_readFile', { path })
    return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  }
  if (isNativeTauriShell()) {
    const { readFile } = await import('@tauri-apps/plugin-fs')
    return readFile(path)
  }
  throw new Error('Not running in a desktop shell')
}

export async function desktopReadDir(path: string): Promise<DesktopDirEntry[]> {
  if (isElectronShell()) {
    return desktopInvoke<DesktopDirEntry[]>('fs_readDir', { path })
  }
  if (isNativeTauriShell()) {
    const { readDir } = await import('@tauri-apps/plugin-fs')
    const listing = await readDir(path)
    return listing.map((entry) => ({
      name: entry.name ?? '',
      isDirectory: entry.isDirectory,
      isFile: entry.isFile
    }))
  }
  throw new Error('Not running in a desktop shell')
}

export async function desktopMkdir(path: string): Promise<void> {
  if (isElectronShell()) {
    await desktopInvoke('fs_mkdir', { path })
    return
  }
  if (isNativeTauriShell()) {
    const { mkdir } = await import('@tauri-apps/plugin-fs')
    await mkdir(path, { recursive: true })
    return
  }
  throw new Error('Not running in a desktop shell')
}

export async function desktopWriteFile(path: string, contents: Uint8Array): Promise<void> {
  if (isElectronShell()) {
    await desktopInvoke('fs_writeFile', { path, contents: [...contents] })
    return
  }
  if (isNativeTauriShell()) {
    const { writeFile } = await import('@tauri-apps/plugin-fs')
    await writeFile(path, contents)
    return
  }
  throw new Error('Not running in a desktop shell')
}

export async function desktopRemove(path: string, options?: { recursive?: boolean }): Promise<void> {
  if (isElectronShell()) {
    await desktopInvoke('fs_remove', { path, recursive: options?.recursive === true })
    return
  }
  if (isNativeTauriShell()) {
    const { remove } = await import('@tauri-apps/plugin-fs')
    await remove(path, { recursive: options?.recursive })
    return
  }
  throw new Error('Not running in a desktop shell')
}
