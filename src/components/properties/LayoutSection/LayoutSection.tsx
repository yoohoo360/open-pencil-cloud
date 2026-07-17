import { LayoutControlsRoot, useI18n } from '@open-pencil/react'
import { AutoLayoutControls } from '@/components/properties/LayoutSection/AutoLayoutControls'
import { ClipContentControl } from '@/components/properties/LayoutSection/ClipContentControl'
import { FlexControls } from '@/components/properties/LayoutSection/FlexControls'
import { GridControls } from '@/components/properties/LayoutSection/GridControls'
import { PaddingControls } from '@/components/properties/LayoutSection/PaddingControls'
import { SizeControls } from '@/components/properties/LayoutSection/SizeControls'
import { PanelSection } from '@/components/ui/panel/PanelSection'

const CONTAINER_TYPES = new Set(['FRAME', 'COMPONENT', 'COMPONENT_SET', 'INSTANCE'])

export function LayoutSection() {
  const { panels } = useI18n()

  return (
    <LayoutControlsRoot>
      {(ctx) => {
        const node = ctx.node.value
        if (!node) return null

        return (
          <>
            <PanelSection label={panels.layout} data-test-id="layout-section">
              <SizeControls />
            </PanelSection>

            {CONTAINER_TYPES.has(node.type) && (
              <PanelSection label={panels.autoLayout}>
                <AutoLayoutControls />

                {node.layoutMode !== 'NONE' && (
                  <>
                    {ctx.isFlex.value && <FlexControls />}
                    {ctx.isGrid.value && (
                      <>
                        <GridControls />
                        <PaddingControls />
                        <ClipContentControl />
                      </>
                    )}
                  </>
                )}
              </PanelSection>
            )}
          </>
        )
      }}
    </LayoutControlsRoot>
  )
}
