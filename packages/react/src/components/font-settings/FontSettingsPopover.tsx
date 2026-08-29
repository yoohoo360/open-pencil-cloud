import { Settings, Type } from 'lucide-react'
import { useEffect, useRef } from 'react'

import { useFontSettings } from '#react/components/font-settings/use'
import { AppButton } from '#react/components/ui/AppButton'
import { IconButton } from '#react/components/ui/IconButton'
import { usePopoverUI } from '#react/components/ui/popover'
import { useI18n } from '#react/i18n'

export function FontSettingsPopover() {
  const { dialogs } = useI18n()
  const settings = useFontSettings()
  const { open, setPopoverOpen } = settings
  const rootRef = useRef<HTMLDivElement>(null)
  const cls = usePopoverUI({ content: 'absolute right-0 top-full z-[51] mt-1 w-80 p-3' })

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      if (rootRef.current?.contains(event.target as Node)) return
      setPopoverOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setPopoverOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, setPopoverOpen])

  return (
    <div ref={rootRef} className="relative shrink-0">
      <IconButton
        label={dialogs.fontSettings}
        data-test-id="font-settings-trigger"
        onClick={() => setPopoverOpen(!open)}
      >
        <Settings className="size-3.5" />
      </IconButton>
      {open ? (
        <div data-test-id="font-settings-panel" className={cls.content}>
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-2">
              <div className="flex size-8 shrink-0 items-center justify-center rounded bg-input text-muted">
                <Type className="size-4" />
              </div>
              <div>
                <h3 className="text-[11px] font-semibold text-surface">{dialogs.fontSettings}</h3>
                <p className="mt-0.5 text-[10px] leading-relaxed text-muted">
                  {dialogs.fontSettingsLocalDescription}
                </p>
              </div>
            </div>

            <div className="grid gap-1.5 rounded border border-border bg-input/40 p-2 text-[10px]">
              <div className="flex justify-between gap-3 text-muted">
                <span>{dialogs.localFonts}</span>
                <span className="text-surface">{settings.accessStateLabel}</span>
              </div>
            </div>

            <div className="grid grid-cols-[1fr_auto] gap-2 rounded border border-border p-2">
              <div>
                <p className="text-[10px] font-medium text-surface">{dialogs.systemFontAccess}</p>
                <p className="mt-0.5 text-[10px] leading-relaxed text-muted">
                  {settings.accessState === 'granted'
                    ? dialogs.systemFontsAvailable
                    : dialogs.allowBrowserFontAccess}
                </p>
              </div>
              <AppButton
                type="button"
                data-test-id="font-settings-request-access"
                color="neutral"
                variant="soft"
                size="xs"
                disabled={settings.busy || !settings.canRequestLocalFonts}
                onClick={() => void settings.requestAccess()}
              >
                {settings.busy ? dialogs.requesting : dialogs.allow}
              </AppButton>
            </div>

            {settings.status ? (
              <p className="rounded bg-input px-2 py-1.5 text-[10px] leading-relaxed text-muted">
                {settings.status}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
