import { SlotInstancePicker } from '#react/components/properties/component-properties/SlotInstancePicker'
import { FloatingMenu } from '#react/components/properties/variables/FloatingMenu'
import { IconButton } from '#react/components/ui/IconButton'
import { useI18n } from '#react/i18n'
import { Plus } from 'lucide-react'
import { useRef, useState } from 'react'

export function SlotInsertControl({
  propertyId,
  preferredValues,
  onlyPreferredInstances,
  onInsert
}: {
  propertyId: string
  preferredValues?: string[]
  onlyPreferredInstances?: boolean
  onInsert: (componentId: string, sourceLibraryKey?: string) => void
}) {
  const { panels } = useI18n()
  const triggerRef = useRef<HTMLSpanElement>(null)
  const [open, setOpen] = useState(false)

  return (
    <span ref={triggerRef} className="relative inline-flex">
      <IconButton
        label={panels.addSlotInstances}
        active={open}
        data-property={propertyId}
        data-test-id="slot-insert"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <Plus className="size-3.5" />
      </IconButton>
      <FloatingMenu
        open={open}
        triggerRef={triggerRef}
        align="end"
        onClose={() => setOpen(false)}
        className="z-[100] overflow-hidden rounded-xl bg-panel shadow-[0_8px_30px_rgb(0_0_0/0.4)]"
      >
        <SlotInstancePicker
          preferredValues={preferredValues}
          onlyPreferredInstances={onlyPreferredInstances}
          onSelect={(componentId, sourceLibraryKey) => {
            onInsert(componentId, sourceLibraryKey)
            setOpen(false)
          }}
        />
      </FloatingMenu>
    </span>
  )
}
