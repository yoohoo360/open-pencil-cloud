import IconLucideSettings from '~icons/lucide/settings'
import * as Popover from '@radix-ui/react-popover'
import { memo, useState } from 'react'

import { useI18n } from '@open-pencil/react'
import ApiKeySection from '@/components/chat/ProviderSettings/ApiKeySection'
import ApiTypeSection from '@/components/chat/ProviderSettings/ApiTypeSection'
import CustomEndpointSection from '@/components/chat/ProviderSettings/CustomEndpointSection'
import MaxTokensSection from '@/components/chat/ProviderSettings/MaxTokensSection'
import ProviderSelectField from '@/components/chat/ProviderSelect/ProviderSelectField'
import StockPhotoKeysSection from '@/components/chat/ProviderSettings/StockPhotoKeysSection'
import TestConnectionSection from '@/components/chat/ProviderSettings/TestConnectionSection'
import { ProviderSettingsProvider, useProviderSettingsContext } from '@/components/chat/ProviderSettings/context'
import Tip from '@/components/ui/Tip'
import { usePopoverUI } from '@/components/ui/popover'

const ProviderSettingsContent = memo(function ProviderSettingsContent() {
  const { dialogs } = useI18n()
  const cls = usePopoverUI({ content: 'isolate z-[51] w-64 p-3' })
  const [popoverOpen, setPopoverOpen] = useState(false)
  const providerSettings = useProviderSettingsContext()

  return (
    <Popover.Root open={popoverOpen} onOpenChange={setPopoverOpen}>
      <Tip label={dialogs.providerSettings} disabled={popoverOpen}>
        <Popover.Trigger asChild>
          <button
            type="button"
            data-test-id="provider-settings-trigger"
            className="rounded p-0.5 text-muted hover:bg-hover hover:text-surface"
          >
            <IconLucideSettings className="size-3" />
          </button>
        </Popover.Trigger>
      </Tip>
      <Popover.Portal>
        <Popover.Content
          side="top"
          sideOffset={8}
          align="end"
          collisionPadding={16}
          className={cls.content}
          onInteractOutside={(event) => {
            const target = event.target as HTMLElement | null
            if (target?.closest('[role=listbox], [data-radix-popper-content-wrapper]')) {
              event.preventDefault()
              return
            }
            providerSettings.save()
          }}
        >
          <div className="flex flex-col gap-2.5">
            <h3 className="text-[11px] font-semibold text-surface">{dialogs.aiProvider}</h3>
            <ProviderSelectField />
            <MaxTokensSection />
            <StockPhotoKeysSection />
            <CustomEndpointSection />
            <ApiTypeSection />
            <ApiKeySection />
            <TestConnectionSection />
            <Popover.Close asChild>
              <button
                type="button"
                className="mt-1 w-full rounded bg-accent px-2 py-1 text-center text-[11px] font-medium text-white hover:bg-accent/90"
                data-test-id="provider-settings-done"
                onClick={providerSettings.save}
              >
                {dialogs.done}
              </button>
            </Popover.Close>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
})

ProviderSettingsContent.displayName = 'ProviderSettingsContent'

export const ProviderSettings = memo(function ProviderSettings() {
  return (
    <ProviderSettingsProvider>
      <ProviderSettingsContent />
    </ProviderSettingsProvider>
  )
})

ProviderSettings.displayName = 'ProviderSettings'
export default ProviderSettings
