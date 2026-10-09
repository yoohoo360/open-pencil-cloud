import { SlotInstancePicker } from '#react/components/properties/component-properties/SlotInstancePicker'
import { FloatingMenu } from '#react/components/properties/variables/FloatingMenu'
import { useI18n } from '#react/i18n'
import { ChevronDown, Component } from 'lucide-react'
import { useRef, useState } from 'react'

import { useEditor } from '#react/editor/context'

/** Instance-swap picker showing the current component, matching Vue's AppPickerField. */
export function InstanceSwapControl({
  propertyId,
  value,
  preferredValues,
  mixed,
  mixedPlaceholder,
  onSelect
}: {
  propertyId: string
  value: string
  preferredValues?: string[]
  mixed?: boolean
  mixedPlaceholder?: string
  onSelect: (componentId: string, sourceLibraryKey?: string) => void
}) {
  const editor = useEditor()
  const { panels } = useI18n()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const current = value ? editor.graph.getNode(value) : undefined
  const label = mixed
    ? (mixedPlaceholder ?? panels.mixed)
    : (current?.name ?? (value ? value : panels.searchInstances))

  return (
    <span className="relative inline-flex min-w-0 flex-1">
      <button
        ref={triggerRef}
        type="button"
        data-property={propertyId}
        data-test-id="instance-swap"
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex h-6 min-w-0 flex-1 items-center gap-1.5 rounded-md bg-field px-2 text-xs text-surface hover:bg-hover"
        onClick={() => setOpen((currentOpen) => !currentOpen)}
      >
        <Component className="size-3.5 shrink-0 text-component" />
        <span className={`min-w-0 flex-1 truncate text-left ${mixed ? 'text-muted' : ''}`}>
          {label}
        </span>
        <ChevronDown className="size-3 shrink-0 text-muted" />
      </button>
      <FloatingMenu
        open={open}
        triggerRef={triggerRef}
        align="end"
        onClose={() => setOpen(false)}
        className="z-[100] overflow-hidden rounded-xl bg-panel shadow-[0_8px_30px_rgb(0_0_0/0.4)]"
      >
        <SlotInstancePicker
          preferredValues={preferredValues}
          selectedId={mixed ? undefined : value || undefined}
          onSelect={(componentId, sourceLibraryKey) => {
            onSelect(componentId, sourceLibraryKey)
            setOpen(false)
          }}
        />
      </FloatingMenu>
    </span>
  )
}
