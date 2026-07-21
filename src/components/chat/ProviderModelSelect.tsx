import IconLucideBot from '~icons/lucide/bot'
import IconLucideChevronDown from '~icons/lucide/chevron-down'
import * as Select from '@radix-ui/react-select'
import { memo, type ReactNode } from 'react'

import { useAIChat } from '@/app/ai/chat/use'
import AppBadge from '@/components/ui/AppBadge'
import { useSelectUI } from '@/components/ui/select'
import { useVueRefValue } from '@/shared/useVueRefValue'

export type ProviderModelSelectProps = {
  children?: ReactNode
}

export const ProviderModelSelect = memo(function ProviderModelSelect({
  children
}: ProviderModelSelectProps) {
  const { modelID: modelIDRef, providerDef: providerDefRef } = useAIChat()
  const modelID = useVueRefValue(modelIDRef)
  const providerDef = useVueRefValue(providerDefRef)
  const selectCls = useSelectUI({
    trigger: 'gap-1 rounded border-none bg-transparent px-1.5 py-0.5 text-[10px] text-muted',
    content: 'max-h-60 overflow-y-auto',
    item: 'gap-2 rounded px-2 py-1.5 text-[11px]'
  })

  return (
    <Select.Root
      value={modelID}
      onValueChange={(value) => {
        modelIDRef.value = value
      }}
    >
      <Select.Trigger data-test-id="chat-model-selector" className={selectCls.trigger}>
        <IconLucideBot className="size-3" />
        {children}
        <IconLucideChevronDown className="size-2.5" />
      </Select.Trigger>
      <Select.Portal>
        <Select.Content position="popper" side="top" sideOffset={4} className={selectCls.content}>
          <Select.Viewport>
            {providerDef.models.map((model) => (
              <Select.Item key={model.id} value={model.id} className={selectCls.item}>
                <Select.ItemText className="flex-1">{model.name}</Select.ItemText>
                {model.tag ? <AppBadge>{model.tag}</AppBadge> : null}
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  )
})

ProviderModelSelect.displayName = 'ProviderModelSelect'
export default ProviderModelSelect
