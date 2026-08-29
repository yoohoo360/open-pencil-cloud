import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useStore } from '@nanostores/react'
import { Plug, Sparkles, Settings, X } from 'lucide-react'

import { IS_BROWSER, IS_TAURI } from '@open-pencil/core/constants'

import {
  closeSettingsDialog,
  settingsDialogSection,
  type SettingsSection
} from '#react/app/settings/dialog'
import { AISettingsPanel } from '#react/components/settings/ai/AISettingsPanel'
import { GeneralSettingsPanel } from '#react/components/settings/general/GeneralSettingsPanel'
import { MCPSettingsPanel } from '#react/components/settings/mcp/MCPSettingsPanel'
import { useDialogUI } from '#react/components/ui/dialog'
import { useI18n } from '#react/i18n'

const navigationClass =
  'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-muted transition-colors hover:bg-hover hover:text-surface data-[state=active]:bg-hover data-[state=active]:text-surface'

export function SettingsDialog() {
  const { dialogs } = useI18n()
  const section = useStore(settingsDialogSection)
  const cls = useDialogUI({ footer: 'justify-between' }, { size: 'lg', height: 'tall' })

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape' || event.code === 'Escape') closeSettingsDialog()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!IS_BROWSER) return null

  return createPortal(
    <>
      <div data-slot="dialog-overlay" className={cls.overlay} onClick={closeSettingsDialog} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-settings-title"
        data-slot="dialog-content"
        data-test-id="app-settings-dialog"
        className={cls.content}
      >
        <header data-slot="dialog-header" className={cls.header}>
          <div className={cls.heading}>
            <h2 id="app-settings-title" data-slot="dialog-title" className={cls.title}>
              {dialogs.settings}
            </h2>
            <p data-slot="dialog-description" className={`${cls.description} mt-0.5`}>
              {dialogs.settingsDescription}
            </p>
          </div>
          <button
            type="button"
            data-slot="dialog-close"
            className={cls.close}
            aria-label={dialogs.close}
            onClick={closeSettingsDialog}
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="flex min-h-0 flex-1">
          <nav className="w-40 shrink-0 border-r border-border p-2" aria-label={dialogs.settings}>
            <SettingsNavButton
              section="general"
              active={section === 'general'}
              icon={<Settings className="size-3.5" />}
              testId="settings-section-general"
            >
              {dialogs.settingsGeneral}
            </SettingsNavButton>
            <SettingsNavButton
              section="ai"
              active={section === 'ai'}
              icon={<Sparkles className="size-3.5" />}
              testId="settings-section-ai"
            >
              {dialogs.settingsAIAndAgents}
            </SettingsNavButton>
            <SettingsNavButton
              section="mcp"
              active={section === 'mcp'}
              icon={<Plug className="size-3.5" />}
              testId="settings-section-mcp"
            >
              {dialogs.settingsMCP}
            </SettingsNavButton>
          </nav>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {section === 'general' ? <GeneralSettingsPanel /> : null}
            {section === 'ai' ? <AISettingsPanel /> : null}
            {section === 'mcp' ? (
              <section className="flex flex-col" data-test-id="settings-mcp-panel">
                <MCPSettingsPanel />
              </section>
            ) : null}
          </div>
        </div>

        <footer data-slot="dialog-footer" className={cls.footer}>
          <p className="mr-auto text-[10px] text-muted" data-test-id="settings-credential-backend">
            {dialogs.credentialStorage({
              backend: IS_TAURI ? dialogs.credentialBackendNative : dialogs.credentialBackendBrowser
            })}
          </p>
          <button
            type="button"
            className="rounded bg-accent px-3 py-1.5 text-[11px] font-medium text-white hover:bg-accent/90"
            data-test-id="app-settings-done"
            onClick={closeSettingsDialog}
          >
            {dialogs.done}
          </button>
        </footer>
      </div>
    </>,
    document.body
  )
}

function SettingsNavButton({
  section,
  active,
  icon,
  testId,
  children
}: {
  section: SettingsSection
  active: boolean
  icon: ReactNode
  testId: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      className={navigationClass}
      data-state={active ? 'active' : 'inactive'}
      data-test-id={testId}
      onClick={() => settingsDialogSection.set(section)}
    >
      {icon}
      {children}
    </button>
  )
}
