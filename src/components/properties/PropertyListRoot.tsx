import type { ReactNode } from 'react'

import { PropertyListRoot as HeadlessPropertyListRoot, useEditorPropertyList } from '@open-pencil/react'

import type { SceneNode } from '@open-pencil/scene-graph'
import type { PropertyListKey, PropertyListRootSlotProps } from '@open-pencil/react'

interface PropertyListRootProps<K extends PropertyListKey> {
  propKey: K
  label?: string
  children: (
    props: PropertyListRootSlotProps<K> & { isMulti: boolean; activeNode: SceneNode | null }
  ) => ReactNode
}

export function PropertyListRoot<K extends PropertyListKey>({
  propKey,
  children
}: PropertyListRootProps<K>) {
  const context = useEditorPropertyList(propKey)

  if (!context.active.value) return null

  return (
    <HeadlessPropertyListRoot
      propKey={propKey}
      items={context.items.value}
      mixed={context.isMixed.value}
      onAdd={context.actions.add}
      onRemove={context.actions.remove}
      onUpdate={context.actions.update}
      onPatch={context.actions.patch}
      onToggleVisibility={context.actions.toggleVisibility}
      onReorder={context.actions.reorder}
    >
      {(slotProps) =>
        children({
          ...slotProps,
          isMulti: context.isMulti.value,
          activeNode: context.activeNode.value
        })
      }
    </HeadlessPropertyListRoot>
  )
}
