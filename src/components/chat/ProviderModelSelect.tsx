import { useStore } from '@nanostores/react'
import { SelectContent, SelectItem, SelectItemText, SelectPortal, Root as SelectRoot, SelectTrigger, SelectViewport } from '@radix-ui/react-select'
import IconBot from '~icons/lucide/bot'
import IconChevronDown from '~icons/lucide/chevron-down'

import type { ReactNode } from 'react'
import { AppBadge } from '@/components/ui/AppBadge'
import { useSelectUI } from '@/components/ui/select'
import { useAIChat } from '@/app/ai/chat/use'

interface ProviderModelSelectProps {
  children?: ReactNode
}

export function ProviderModelSelect({ children }: ProviderModelSelectProps) {
  const { modelID, providerDef } = useAIChat()
  const currentModelID = useStore(modelID)
  const currentProviderDef = useStore(providerDef) as { models: Array<{ id: string; name: string; tag?: string }> }
  const selectCls = useSelectUI({
    trigger: 'gap-1 rounded border-none bg-transparent px-1.5 py-0.5 text-[10px] text-muted',
    content: 'max-h-60 overflow-y-auto',
    item: 'gap-2 rounded px-2 py-1.5 text-[11px]'
  })

  return (
    <SelectRoot value={currentModelID} onValueChange={(v) => modelID.set(v)}>
      <SelectTrigger data-test-id="chat-model-selector" className={selectCls.trigger}>
        <IconBot className="size-3" />
        {children}
        <IconChevronDown className="size-2.5" />
      </SelectTrigger>
      <SelectPortal>
        <SelectContent position="popper" side="top" sideOffset={4} className={selectCls.content}>
          <SelectViewport>
            {currentProviderDef.models.map((model) => (
              <SelectItem key={model.id} value={model.id} className={selectCls.item}>
                <SelectItemText className="flex-1">{model.name}</SelectItemText>
                {model.tag && <AppBadge>{model.tag}</AppBadge>}
              </SelectItem>
            ))}
          </SelectViewport>
        </SelectContent>
      </SelectPortal>
    </SelectRoot>
  )
}
