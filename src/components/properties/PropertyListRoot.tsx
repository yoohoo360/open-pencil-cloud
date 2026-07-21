import {
  PropertyListRoot as HeadlessPropertyListRoot,
  useEditorPropertyList,
  type PropertyListKey,
  type PropertyListRootSlotProps
} from '@open-pencil/react'
import { memo, type ReactNode } from 'react'

import type { SceneNode } from '@open-pencil/scene-graph'

export type PropertyListRootProps<K extends PropertyListKey> = {
  propKey: K
  label?: string
  children?: (
    props: PropertyListRootSlotProps<K> & {
      isMulti: boolean
      activeNode: SceneNode | null
      selectedNodeIds: string[]
      flush: () => void
    }
  ) => ReactNode
}

export const PropertyListRoot = memo(function PropertyListRoot<K extends PropertyListKey>({
  propKey,
  label,
  children
}: PropertyListRootProps<K>) {
  const context = useEditorPropertyList(propKey)

  if (!context.active()) return null

  return (
    <HeadlessPropertyListRoot
      propKey={propKey}
      label={label}
      items={context.items}
      mixed={context.isMixed()}
      onAdd={context.actions.add}
      onRemove={context.actions.remove}
      onUpdate={context.actions.update}
      onPatch={context.actions.patch}
      onToggleVisibility={context.actions.toggleVisibility}
      onReorder={context.actions.reorder}
    >
      {(slotProps) =>
        children?.({
          ...slotProps,
          isMulti: context.isMulti(),
          activeNode: context.activeNode,
          selectedNodeIds: context.selectedNodeIds(),
          flush: context.flush
        })
      }
    </HeadlessPropertyListRoot>
  )
}) as <K extends PropertyListKey>(props: PropertyListRootProps<K>) => ReactNode

PropertyListRoot.displayName = 'PropertyListRoot'
export default PropertyListRoot
