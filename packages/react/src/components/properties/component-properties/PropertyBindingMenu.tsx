import { useRef, useState } from 'react'
import { Check } from 'lucide-react'

import { PropertyBindingIcon } from '#react/components/properties/component-properties/PropertyBindingIcon'
import { FloatingMenu } from '#react/components/properties/variables/FloatingMenu'
import { IconButton } from '#react/components/ui/IconButton'
import { menuItem, useMenuUI } from '#react/components/ui/menu'
import { useComponentPropertyBinding } from '#react/controls/component-props'
import { useI18n } from '#react/i18n'

export function PropertyBindingMenu({
  field,
  applyLabel,
  detachLabel,
  emptyLabel
}: {
  field: 'VISIBLE' | 'TEXT' | 'INSTANCE_SWAP' | 'SLOT'
  applyLabel: string
  detachLabel: string
  emptyLabel: string
}) {
  const { panels } = useI18n()
  const { active, properties, boundPropertyId, boundName, bind, unbind } =
    useComponentPropertyBinding(field)
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLSpanElement>(null)
  const menuCls = useMenuUI({ content: 'min-w-40' })
  const itemCls = menuItem({ justify: 'start' })
  if (!active) return null

  const bound = Boolean(boundPropertyId)
  const tooltip = boundName ? panels.boundToProperty({ name: boundName }) : applyLabel

  return (
    <span ref={triggerRef} className="relative inline-flex">
      <IconButton
        label={tooltip}
        data-property-binding={field}
        data-bound={bound ? '' : undefined}
        className={bound ? 'text-component' : undefined}
        onClick={() => setOpen((current) => !current)}
      >
        <PropertyBindingIcon bound={bound} />
      </IconButton>
      <FloatingMenu
        open={open}
        onClose={() => setOpen(false)}
        triggerRef={triggerRef}
        align="end"
        className={menuCls.content}
      >
        {properties.length === 0 ? (
          <div className="px-2 py-1.5 text-[11px] text-muted">{emptyLabel}</div>
        ) : (
          properties.map((property) => {
            const selected = property.id === boundPropertyId
            return (
              <button
                key={property.id}
                type="button"
                className={itemCls}
                data-property={property.id}
                onClick={() => {
                  bind(property.id)
                  setOpen(false)
                }}
              >
                <span className="min-w-0 flex-1 truncate">{property.name}</span>
                {selected ? <Check className="size-3 shrink-0 text-component" /> : null}
              </button>
            )
          })
        )}
        {boundPropertyId ? (
          <button
            type="button"
            className={itemCls}
            onClick={() => {
              unbind()
              setOpen(false)
            }}
          >
            {detachLabel}
          </button>
        ) : null}
      </FloatingMenu>
    </span>
  )
}
