import IconLucideMinus from '~icons/lucide/minus'
import IconLucidePlus from '~icons/lucide/plus'
import { memo } from 'react'

import { LayoutControlsRoot, useI18n } from '@open-pencil/react'

import AutoLayoutControls from '@/components/properties/LayoutSection/AutoLayoutControls'
import ClipContentControl from '@/components/properties/LayoutSection/ClipContentControl'
import FlexControls from '@/components/properties/LayoutSection/FlexControls'
import GridControls from '@/components/properties/LayoutSection/GridControls'
import LayoutGridSection from '@/components/properties/LayoutSection/LayoutGridSection'
import PaddingControls from '@/components/properties/LayoutSection/PaddingControls'
import SizeControls from '@/components/properties/LayoutSection/size/SizeControls'
import TextResizingControl from '@/components/properties/LayoutSection/TextResizingControl'
import SharedStyleField from '@/components/properties/shared-style/SharedStyleField'
import type { LayoutControlsApi } from '@/components/properties/LayoutSection/types'
import IconButton from '@/components/ui/IconButton'
import PanelSection from '@/components/ui/panel/PanelSection'

const CONTAINER_TYPES = ['FRAME', 'COMPONENT', 'COMPONENT_SET', 'INSTANCE']

export const LayoutSection = memo(function LayoutSection() {
  const { panels } = useI18n()

  return (
    <LayoutControlsRoot>
      {(ctx) => {
        const layout = ctx as unknown as LayoutControlsApi
        if (!layout.node) return null
        const { node } = layout

        return (
          <>
            <PanelSection label={panels.layout}>
              <SharedStyleField kind="grid" label={panels.gridStyle} />
              {node.type === 'TEXT' ? <TextResizingControl /> : null}
              <SizeControls />
            </PanelSection>

            {CONTAINER_TYPES.includes(node.type) ? (
              <>
                <PanelSection
                  label={panels.autoLayout}
                  actions={
                    node.layoutMode === 'NONE' ? (
                      <IconButton
                        label={panels.addAutoLayout}
                        onClick={() => layout.editor.setLayoutMode(node.id, 'VERTICAL')}
                      >
                        <IconLucidePlus className="size-3.5" />
                      </IconButton>
                    ) : (
                      <IconButton
                        label={panels.removeAutoLayout}
                        onClick={() => layout.editor.setLayoutMode(node.id, 'NONE')}
                      >
                        <IconLucideMinus className="size-3.5" />
                      </IconButton>
                    )
                  }
                >
                  <AutoLayoutControls />

                  {node.layoutMode !== 'NONE' ? (
                    <>
                      {layout.isFlex ? <FlexControls /> : null}
                      {layout.isGrid ? (
                        <>
                          <GridControls />
                          <PaddingControls />
                          <ClipContentControl />
                        </>
                      ) : null}
                    </>
                  ) : null}
                </PanelSection>

                <LayoutGridSection />
              </>
            ) : null}
          </>
        )
      }}
    </LayoutControlsRoot>
  )
})

LayoutSection.displayName = 'LayoutSection'
export default LayoutSection
