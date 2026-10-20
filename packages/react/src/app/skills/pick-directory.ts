import { IS_TAURI } from '@open-pencil/core/constants'

import { desktopInvoke, isElectronShell, isNativeTauriShell } from '#react/app/desktop/bridge'

export type PickedSkillWorkspace = {
  path: string
  directoryHandle?: FileSystemDirectoryHandle
}

export type PickSkillWorkspaceDirectoryOptions = {
  title?: string
  help?: string
  placeholder?: string
  confirmLabel?: string
  cancelLabel?: string
}

/**
 * Choose a project folder without Agent Server.
 * - Desktop: native folder dialog → absolute path
 * - Browser: File System Access directory picker when available; otherwise path dialog
 */
export async function pickSkillWorkspaceDirectory(
  options?: PickSkillWorkspaceDirectoryOptions
): Promise<PickedSkillWorkspace | null> {
  if (IS_TAURI) {
    if (isElectronShell()) {
      const directory = await desktopInvoke<string | null>('dialog_openDirectory', {
        title: options?.title ?? 'Choose skill workspace'
      })
      if (typeof directory !== 'string') return null
      return { path: directory }
    }
    if (isNativeTauriShell()) {
      const { open } = await import('@tauri-apps/plugin-dialog')
      const directory = await open({
        directory: true,
        multiple: false,
        title: options?.title ?? 'Choose skill workspace'
      })
      if (typeof directory !== 'string') return null
      return { path: directory }
    }
  }

  if (typeof window.showDirectoryPicker === 'function') {
    try {
      const directoryHandle = await window.showDirectoryPicker({ mode: 'readwrite' })
      return { path: directoryHandle.name, directoryHandle }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return null
      // Fall through to path dialog when picker is blocked.
    }
  }

  const path = await pickBrowserDirectoryPath(options)
  return path ? { path } : null
}

function pickBrowserDirectoryPath(
  options?: PickSkillWorkspaceDirectoryOptions
): Promise<string | null> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div')
    overlay.setAttribute('data-skill-workspace-path-dialog', '')
    overlay.style.cssText =
      'position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.45)'

    const panel = document.createElement('div')
    panel.setAttribute('role', 'dialog')
    panel.setAttribute('aria-modal', 'true')
    panel.style.cssText =
      'width:min(440px,calc(100vw - 32px));border-radius:12px;border:1px solid rgba(127,127,127,.35);background:canvas;color:CanvasText;padding:16px;box-shadow:0 16px 48px rgba(0,0,0,.28)'

    const title = document.createElement('h2')
    title.textContent = options?.title ?? 'Choose skill workspace'
    title.style.cssText = 'margin:0 0 8px;font-size:14px;font-weight:600'

    const hint = document.createElement('p')
    hint.textContent =
      options?.help ??
      'Enter an absolute project folder path. Prefer “Add workspace” with folder access when available.'
    hint.style.cssText = 'margin:0 0 12px;font-size:11px;line-height:1.45;opacity:.7'

    const input = document.createElement('input')
    input.type = 'text'
    input.spellcheck = false
    input.autocomplete = 'off'
    input.placeholder = options?.placeholder ?? '/absolute/path/to/project'
    input.style.cssText =
      'width:100%;box-sizing:border-box;height:36px;border-radius:8px;border:1px solid rgba(127,127,127,.4);background:transparent;color:inherit;padding:0 10px;font:12px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace'

    const actions = document.createElement('div')
    actions.style.cssText = 'display:flex;justify-content:flex-end;gap:8px;margin-top:12px'

    const cancel = document.createElement('button')
    cancel.type = 'button'
    cancel.textContent = options?.cancelLabel ?? 'Cancel'
    cancel.style.cssText =
      'height:32px;border-radius:8px;border:1px solid rgba(127,127,127,.35);background:transparent;color:inherit;padding:0 12px;font-size:12px;cursor:pointer'

    const confirm = document.createElement('button')
    confirm.type = 'button'
    confirm.textContent = options?.confirmLabel ?? 'Add'
    confirm.style.cssText =
      'height:32px;border-radius:8px;border:0;background:#0d99ff;color:#fff;padding:0 12px;font-size:12px;font-weight:500;cursor:pointer'

    function finish(value: string | null) {
      overlay.remove()
      window.removeEventListener('keydown', onKeyDown, true)
      resolve(value)
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        finish(null)
      }
      if (event.key === 'Enter') {
        event.preventDefault()
        const next = input.value.trim()
        finish(next || null)
      }
    }

    cancel.addEventListener('click', () => finish(null))
    confirm.addEventListener('click', () => {
      const next = input.value.trim()
      finish(next || null)
    })
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) finish(null)
    })
    window.addEventListener('keydown', onKeyDown, true)

    actions.append(cancel, confirm)
    panel.append(title, hint, input, actions)
    overlay.append(panel)
    document.body.append(overlay)
    input.focus()
  })
}
