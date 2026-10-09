import { SlotInsertControl } from '#react/components/properties/component-properties/SlotInsertControl'
import { FloatingMenu } from '#react/components/properties/variables/FloatingMenu'
import { IconButton } from '#react/components/ui/IconButton'
import { menuItem, useMenuUI } from '#react/components/ui/menu'
import { PanelFieldGroup } from '#react/components/ui/panel/PanelFieldGroup'
import type { SlotLimit } from '#react/controls/component-props/slots'
import { useI18n } from '#react/i18n'
import { Ellipsis, RotateCcw, SquareDashed, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'

/** One slot property of a selected instance: its state, limits, and content actions. */
export function SlotPropertyRow({
  name,
  propertyId,
  modified,
  itemCount,
  limits = [],
  preferredValues,
  preferredOnly = false,
  onAdd,
  onReset,
  onDeleteContents,
  onSelectLayers
}: {
  name: string
  propertyId: string
  /** Whether the instance owns this slot's content instead of following its component. */
  modified: boolean
  itemCount: number
  limits?: SlotLimit[]
  preferredValues?: string[]
  preferredOnly?: boolean
  onAdd: (componentId: string) => void
  onReset: () => void
  onDeleteContents: () => void
  onSelectLayers: () => void
}) {
  const { panels } = useI18n()
  const triggerRef = useRef<HTMLSpanElement>(null)
  const [open, setOpen] = useState(false)
  const menuCls = useMenuUI({ content: 'min-w-40' })
  const itemCls = menuItem({ justify: 'start' })
  const unmet = limits.filter((limit) => !limit.met)

  return (
    <PanelFieldGroup label={name}>
      <div className="flex min-w-0 flex-1 flex-col gap-1" data-property={`slot-${name}`}>
        <div className="flex items-center gap-1">
          <div
            className="flex h-6 min-w-0 flex-1 items-center gap-1.5 rounded-md bg-field px-2 text-xs"
            data-modified={modified || undefined}
          >
            <SquareDashed className="size-3.5 shrink-0 text-component" />
            <span className={`truncate ${modified ? 'text-surface' : 'text-muted'}`}>
              {modified ? panels.slotModified : panels.slotDefault}
            </span>
            <span className="ml-auto shrink-0 text-[11px] text-muted">
              {panels.slotItemCount({ count: itemCount })}
            </span>
          </div>
          <SlotInsertControl
            propertyId={propertyId}
            preferredValues={preferredValues}
            onlyPreferredInstances={preferredOnly}
            onInsert={(componentId) => onAdd(componentId)}
          />
          <span ref={triggerRef} className="relative inline-flex">
            <IconButton
              label={panels.slotActions({ name })}
              active={open}
              onClick={() => setOpen((current) => !current)}
            >
              <Ellipsis className="size-3.5" />
            </IconButton>
            <FloatingMenu
              open={open}
              onClose={() => setOpen(false)}
              triggerRef={triggerRef}
              align="end"
              className={menuCls.content}
            >
              <button
                type="button"
                className={itemCls}
                disabled={!modified}
                onClick={() => {
                  onReset()
                  setOpen(false)
                }}
              >
                <RotateCcw className="size-3.5 shrink-0" />
                {panels.resetSlot}
              </button>
              <button
                type="button"
                className={itemCls}
                disabled={itemCount === 0}
                onClick={() => {
                  onDeleteContents()
                  setOpen(false)
                }}
              >
                <Trash2 className="size-3.5 shrink-0" />
                {panels.deleteSlotContents}
              </button>
            </FloatingMenu>
          </span>
        </div>
        {unmet.length > 0 ? (
          <button
            type="button"
            className="self-start text-[11px] text-warning"
            onClick={onSelectLayers}
          >
            {unmet
              .map((limit) => {
                if (limit.kind === 'minimum') return panels.slotMinimumLayers
                if (limit.kind === 'maximum') return panels.slotMaximumLayers
                return panels.slotOnlyPreferredInstances
              })
              .join(' · ')}
          </button>
        ) : null}
      </div>
    </PanelFieldGroup>
  )
}
