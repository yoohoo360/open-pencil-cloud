import type { Meta, StoryObj } from '@storybook/react-vite'
import { TooltipProvider } from '@radix-ui/react-tooltip'
import { expect, userEvent, within } from 'storybook/test'
import { useState } from 'react'
import MoreIcon from '~icons/lucide/ellipsis'
import EyeIcon from '~icons/lucide/eye'
import LinkIcon from '~icons/lucide/link'
import RotateIcon from '~icons/lucide/rotate-ccw'
import SquareIcon from '~icons/lucide/square'

import AppInput from '@/components/ui/AppInput'
import AppSelect from '@/components/ui/AppSelect'
import IconButton from '@/components/ui/IconButton'
import SegmentedControl from '@/components/ui/SegmentedControl'
import PanelFieldGroup from '@/components/ui/panel/PanelFieldGroup'
import PanelGrid from '@/components/ui/panel/PanelGrid'
import PanelHeader from '@/components/ui/panel/PanelHeader'
import PanelRail from '@/components/ui/panel/PanelRail'
import PanelSection from '@/components/ui/panel/PanelSection'

function PanelFoundationDemo() {
  const [width, setWidth] = useState<string | number>(320)
  const [height, setHeight] = useState<string | number>(240)
  const [mixed] = useState<string | number>('Mixed')
  const [bound] = useState<string | number>('spacing/md')
  const [disabled] = useState<string | number>(16)
  const [blendMode, setBlendMode] = useState('NORMAL')
  const [alignment, setAlignment] = useState('left')

  return (
    <TooltipProvider>
      <div className="w-[320px] overflow-hidden rounded-lg border border-border bg-panel shadow-xl">
        <PanelHeader
          icon={<SquareIcon className="size-3.5" />}
          actions={
            <IconButton label="Selection actions">
              <MoreIcon className="size-3.5" />
            </IconButton>
          }
        >
          <span role="heading" aria-level={2}>
            Rectangle
          </span>
        </PanelHeader>

        <PanelSection
          label="Layout"
          actions={
            <IconButton label="Reset layout">
              <RotateIcon className="size-3.5" />
            </IconButton>
          }
        >
          <PanelGrid columns="two-rail">
            <PanelFieldGroup label="Width">
              <AppInput
                value={width}
                onValueChange={setWidth}
                tone="panel"
                data-story-control
                data-state="idle"
                aria-label="Width"
              />
            </PanelFieldGroup>
            <PanelFieldGroup label="Height">
              <AppInput
                value={height}
                onValueChange={setHeight}
                tone="panel"
                data-story-control
                data-state="focus"
                aria-label="Height"
              />
            </PanelFieldGroup>
            <PanelRail>
              <IconButton label="Constrain proportions" size="md">
                <LinkIcon className="size-3.5" />
              </IconButton>
            </PanelRail>
          </PanelGrid>
        </PanelSection>

        <PanelSection label="Appearance">
          <PanelGrid columns="two-rail">
            <PanelFieldGroup label="Blend mode">
              <AppSelect
                value={blendMode}
                onValueChange={setBlendMode}
                options={[
                  { value: 'NORMAL', label: 'Normal' },
                  { value: 'MULTIPLY', label: 'Multiply' },
                  { value: 'SCREEN', label: 'Screen' }
                ]}
                data-story-control
                aria-label="Blend mode"
              />
            </PanelFieldGroup>
            <PanelFieldGroup label="Opacity">
              <AppInput
                value={mixed}
                tone="panel"
                state="mixed"
                readOnly
                data-story-control
                aria-label="Mixed opacity"
              />
            </PanelFieldGroup>
            <PanelRail>
              <IconButton label="Toggle visibility">
                <EyeIcon className="size-3.5" />
              </IconButton>
            </PanelRail>
          </PanelGrid>
        </PanelSection>

        <PanelSection label="States">
          <div className="grid grid-cols-2 gap-1.5">
            <PanelFieldGroup label="Bound">
              <AppInput
                value={bound}
                tone="panel"
                state="bound"
                readOnly
                data-story-control
                aria-label="Bound value"
              />
            </PanelFieldGroup>
            <PanelFieldGroup label="Disabled">
              <AppInput
                value={disabled}
                tone="panel"
                disabled
                data-story-control
                aria-label="Disabled value"
              />
            </PanelFieldGroup>
            <PanelFieldGroup label="Alignment" className="col-span-2">
              <SegmentedControl
                value={alignment}
                onValueChange={setAlignment}
                className="w-full"
                options={[
                  { value: 'left', label: 'Left' },
                  { value: 'center', label: 'Center' },
                  { value: 'right', label: 'Right' }
                ]}
                label="Alignment"
                data-story-control
              />
            </PanelFieldGroup>
          </div>
        </PanelSection>
      </div>
    </TooltipProvider>
  )
}

const meta = {
  title: 'Design System/Properties/Panel Foundation',
  component: PanelFoundationDemo,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'The 26px properties-panel foundation: strict grids, field groups, action rails, and semantic field states.'
      }
    }
  }
} satisfies Meta<typeof PanelFoundationDemo>

export default meta
type Story = StoryObj<typeof meta>

export const StateMatrix: Story = {
  render: () => <PanelFoundationDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const controls = Array.from(canvasElement.querySelectorAll<HTMLElement>('[data-story-control]'))

    for (const control of controls) await expect(control).toHaveStyle({ height: '26px' })

    await userEvent.click(canvas.getByLabelText('Height'))
    await userEvent.hover(canvas.getByLabelText('Width'))
  }
}
