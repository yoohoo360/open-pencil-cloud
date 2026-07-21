import IconLucideEye from '~icons/lucide/eye'
import IconLucideEyeOff from '~icons/lucide/eye-off'
import IconLucideMinus from '~icons/lucide/minus'
import { memo, type ReactNode } from 'react'
import { type ClassValue } from 'tailwind-variants'

import {
  PropertyListItem,
  PropertyListRemove,
  PropertyListVisibility,
  type PropertyListItemSlotProps,
  type PropertyListKey
} from '@open-pencil/react'
import PanelItemRow from '@/components/ui/panel/PanelItemRow'
import Tip from '@/components/ui/Tip'

export type PropertyItemRowProps<K extends PropertyListKey> = {
  propKey: K
  index: number
  visibilityLabel: string
  removeLabel: string
  showVisibility?: boolean
  className?: ClassValue
  children?: ReactNode | ((props: PropertyListItemSlotProps<K>) => ReactNode)
  rail?: (props: PropertyListItemSlotProps<K>) => ReactNode
  onRemove?: (index: number) => void
  onToggleVisibility?: (index: number) => void
}

export const PropertyItemRow = memo(function PropertyItemRow<K extends PropertyListKey>({
  propKey,
  index,
  visibilityLabel,
  removeLabel,
  showVisibility = true,
  className,
  children,
  rail,
  onRemove,
  onToggleVisibility
}: PropertyItemRowProps<K>) {
  return (
    <PropertyListItem
      propKey={propKey}
      index={index}
      className={className}
      data-property={propKey}
      data-index={index}
      asChild
      onRemove={onRemove}
      onToggleVisibility={onToggleVisibility}
    >
      {(item) => (
        <PanelItemRow
          rail={({ removeClass }) => (
            <>
              {rail?.(item)}
              {showVisibility ? (
                <Tip label={visibilityLabel}>
                  <PropertyListVisibility
                    propKey={propKey}
                    index={index}
                    aria-label={visibilityLabel}
                    className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded border-none bg-transparent p-0 text-muted hover:bg-hover hover:text-surface"
                    onToggle={onToggleVisibility}
                  >
                    {item.hidden ? (
                      <IconLucideEyeOff className="size-3.5" />
                    ) : (
                      <IconLucideEye className="size-3.5" />
                    )}
                  </PropertyListVisibility>
                </Tip>
              ) : null}
              <Tip label={removeLabel}>
                <PropertyListRemove
                  propKey={propKey}
                  index={index}
                  aria-label={removeLabel}
                  className={`${removeClass} flex size-6 shrink-0 cursor-pointer items-center justify-center rounded border-none bg-transparent p-0 text-muted hover:bg-hover hover:text-surface`}
                  onRemove={onRemove}
                >
                  <IconLucideMinus className="size-3.5" />
                </PropertyListRemove>
              </Tip>
            </>
          )}
        >
          {typeof children === 'function' ? children(item) : children}
        </PanelItemRow>
      )}
    </PropertyListItem>
  )
}) as <K extends PropertyListKey>(props: PropertyItemRowProps<K>) => ReactNode

PropertyItemRow.displayName = 'PropertyItemRow'
export default PropertyItemRow
