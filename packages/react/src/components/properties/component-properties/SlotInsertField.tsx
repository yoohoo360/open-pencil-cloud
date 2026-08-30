import { SlotInsertControl } from '#react/components/properties/component-properties/SlotInsertControl'
import { PanelFieldGroup } from '#react/components/ui/panel/PanelFieldGroup'
import {
  ancestorPublishedInstance,
  isSlotNode,
  slotPropertyId,
  insertInstanceIntoSlot
} from '#react/controls/component-props'
import { useEditor } from '#react/editor/context'
import { useI18n } from '#react/i18n'
import { useSceneComputed } from '#react/internal/scene-computed/use'

export function SlotInsertField() {
  const editor = useEditor()
  const { panels } = useI18n()
  const slot = useSceneComputed(() => {
    const node = editor.getSelectedNode()
    if (!node || !isSlotNode(node)) return null
    return ancestorPublishedInstance(node, (id) => editor.graph.getNode(id)) ? node : null
  })
  const definition = useSceneComputed(() => {
    if (!slot) return
    const instance = ancestorPublishedInstance(slot, (id) => editor.graph.getNode(id))
    const propertyId = slotPropertyId(slot)
    return propertyId
      ? instance
        ? editor
            .getInstanceComponentPropertyDefinitions(instance.id)
            .find((item) => item.id === propertyId)
        : undefined
      : undefined
  })
  if (!slot) return null

  return (
    <PanelFieldGroup
      label={panels.addSlotInstances}
      className="flex items-center gap-2 border-b border-border px-3 py-2"
      ui={{
        label: 'mb-0 min-w-0 flex-1',
        container: 'shrink-0 flex-row items-center'
      }}
    >
      <SlotInsertControl
        propertyId={slotPropertyId(slot) ?? slot.id}
        preferredValues={definition?.preferredValues}
        onlyPreferredInstances={definition?.onlyPreferredInstances}
        onInsert={(componentId, sourceLibraryKey) => {
          const insertedId = insertInstanceIntoSlot(editor, slot, componentId, sourceLibraryKey)
          if (insertedId) editor.select([insertedId])
        }}
      />
    </PanelFieldGroup>
  )
}
