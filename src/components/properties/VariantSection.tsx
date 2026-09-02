import { useI18n, useSelectionState } from '@open-pencil/react'
import { useEditorStore } from '@/app/editor/active-store'
import { AppSelect } from '@/components/ui/AppSelect'
import { PanelSection } from '@/components/ui/panel/PanelSection'

export function VariantSection() {
  const editor = useEditorStore()
  const { panels } = useI18n()
  const { selectedNode: nodeRef } = useSelectionState()
  const node = nodeRef.value

  if (!node || node.type !== 'INSTANCE' || !node.componentId) return null

  const instanceComponent = editor.graph.getNode(node.componentId) ?? null
  if (!instanceComponent) return null

  const parent = instanceComponent.parentId ? editor.graph.getNode(instanceComponent.parentId) : null
  const componentSetId = parent?.type === 'COMPONENT_SET' ? parent.id : null

  if (!componentSetId) return null

  const compSet = editor.graph.getNode(componentSetId)
  let variantOptions: Map<string, Set<string>>
  if (compSet?.remote) {
    const remoteKey = compSet.id.split(':')[0]
    const remoteGraph = editor.graph.getLib(remoteKey)?.graph
    variantOptions = editor.collectVariantOptions(componentSetId, remoteGraph)
  } else {
    variantOptions = editor.collectVariantOptions(componentSetId)
  }

  if (variantOptions.size === 0) return null

  const currentValues = instanceComponent.componentPropertyValues ?? {}

  function switchVariant(propertyName: string, newValue: string) {
    if (!node) return
    editor.switchInstanceVariant(node.id, propertyName, newValue)
  }

  return (
    <PanelSection
      label={panels.variants}
      data-test-id="variant-section"
      ui={{ title: 'text-component' }}
    >
      <div className="flex flex-col gap-1.5">
        {[...variantOptions].map(([propName, options]) => (
          <div key={propName} className="flex flex-col gap-0.5">
            <label className="text-[10px] text-muted">{propName}</label>
            <AppSelect
              value={currentValues[propName] ?? ''}
              options={[...options].map((v) => ({ value: v, label: v }))}
              onChange={(v) => switchVariant(propName, v)}
            />
          </div>
        ))}
      </div>
    </PanelSection>
  )
}
