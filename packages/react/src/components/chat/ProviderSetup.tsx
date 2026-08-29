import { Sparkles } from 'lucide-react'

import { openSettingsDialog } from '#react/app/settings/dialog'
import { AppPlaceholder } from '#react/components/ui/AppPlaceholder'
import { useI18n } from '#react/i18n'

export function ProviderSetup() {
  const { dialogs } = useI18n()
  return (
    <AppPlaceholder
      data-test-id="provider-setup"
      label={dialogs.connectAIProvider}
      icon={<Sparkles className="size-5" />}
      action={
        <button
          type="button"
          data-test-id="provider-setup-open-settings"
          className="w-full rounded bg-accent py-1.5 text-xs font-medium text-white hover:bg-accent/90"
          onClick={() => openSettingsDialog('ai')}
        >
          {dialogs.openProviderSettings}
        </button>
      }
    />
  )
}
