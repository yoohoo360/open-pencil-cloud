import { TooltipProvider } from '@radix-ui/react-tooltip'
import type { Meta, StoryObj } from '@storybook/react-vite'
import React, { useState } from 'react'
import { expect, userEvent, within } from 'storybook/test'
import EyeIcon from '~icons/lucide/eye'
import LinkIcon from '~icons/lucide/link'
import SquareIcon from '~icons/lucide/square'

import { AppInput } from '@/components/ui/AppInput'
import { AppSelect } from '@/components/ui/AppSelect'
import { IconButton } from '@/components/ui/IconButton'
import { SegmentedControl } from '@/components/ui/SegmentedControl'

import { PanelFieldGroup } from './PanelFieldGroup'
import { PanelGrid } from './PanelGrid'
import { PanelHeader } from './PanelHeader'
import { PanelRail } from './PanelRail'
import { PanelSection } from './PanelSection'

const meta = {
  title: 'Design System/Properties/Panel Foundation',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'The 26px properties-panel foundation: strict grids, field groups, action rails, and semantic field states.'
      }
    }
  }
} satisfies Meta<typeof PanelSection>

export default meta
type Story = StoryObj<typeof meta>

function PanelFoundationDemo() {
  const [width, setWidth] = useState<string | number>(320)
  const [height, setHeight] = useState<string | number>(240)
  const blendMode = useState('NORMAL')
  const alignment = useState('left')

  const blendModes = [
    { value: 'NORMAL', label: 'Normal' },
    { value: 'MULTIPLY', label: 'Multiply' },
    { value: 'SCREEN', label: 'Screen' }
  ]
  const alignmentOptions = [
    { value: 'left', label: 'Left' },
    { value: 'center', label: 'Center' },
    { value: 'right', label: 'Right' }
  ]

  return React.createElement(
    TooltipProvider,
    null,
    React.createElement(
      'div',
      { className: 'w-[320px] overflow-hidden rounded-lg border border-border bg-panel shadow-xl' },
      React.createElement(
        PanelHeader,
        null,
        React.createElement(SquareIcon, { className: 'size-panel-icon', slot: 'icon' }),
        React.createElement('span', { role: 'heading', 'aria-level': 2 }, 'Rectangle')
      ),
      React.createElement(
        PanelSection,
        { label: 'Layout' },
        React.createElement(
          PanelGrid,
          { columns: 'two-rail' },
          React.createElement(
            PanelFieldGroup,
            { label: 'Width' },
            React.createElement(AppInput, {
              value: width,
              onChange: (e) => setWidth(e.target.value),
              tone: 'panel',
              'data-story-control': '',
              'data-state': 'idle',
              'aria-label': 'Width'
            })
          ),
          React.createElement(
            PanelFieldGroup,
            { label: 'Height' },
            React.createElement(AppInput, {
              value: height,
              onChange: (e) => setHeight(e.target.value),
              tone: 'panel',
              'data-story-control': '',
              'data-state': 'focus',
              'aria-label': 'Height'
            })
          ),
          React.createElement(
            PanelRail,
            null,
            React.createElement(
              IconButton,
              { label: 'Constrain proportions', size: 'md' },
              React.createElement(LinkIcon, { className: 'size-panel-icon' })
            )
          )
        )
      ),
      React.createElement(
        PanelSection,
        { label: 'Appearance' },
        React.createElement(
          PanelGrid,
          { columns: 'two-rail' },
          React.createElement(
            PanelFieldGroup,
            { label: 'Blend mode' },
            React.createElement(AppSelect, {
              value: blendMode[0],
              onChange: (value: string | number) => blendMode[1](String(value)),
              options: blendModes,
              'data-story-control': '',
              'aria-label': 'Blend mode'
            } as React.ComponentProps<typeof AppSelect>)
          ),
          React.createElement(
            PanelFieldGroup,
            { label: 'Opacity' },
            React.createElement(AppInput, {
              value: 'Mixed',
              tone: 'panel',
              state: 'mixed',
              readOnly: true,
              'data-story-control': '',
              'aria-label': 'Mixed opacity'
            })
          ),
          React.createElement(
            PanelRail,
            null,
            React.createElement(
              IconButton,
              { label: 'Toggle visibility' },
              React.createElement(EyeIcon, { className: 'size-panel-icon' })
            )
          )
        )
      ),
      React.createElement(
        PanelSection,
        { label: 'States' },
        React.createElement(
          'div',
          { className: 'grid grid-cols-2 gap-panel' },
          React.createElement(
            PanelFieldGroup,
            { label: 'Bound' },
            React.createElement(AppInput, {
              value: 'spacing/md',
              tone: 'panel',
              state: 'bound',
              readOnly: true,
              'data-story-control': '',
              'aria-label': 'Bound value'
            })
          ),
          React.createElement(
            PanelFieldGroup,
            { label: 'Disabled' },
            React.createElement(AppInput, {
              value: 16,
              tone: 'panel',
              disabled: true,
              'data-story-control': '',
              'aria-label': 'Disabled value'
            })
          ),
          React.createElement(
            PanelFieldGroup,
            { label: 'Alignment', className: 'col-span-2' },
            React.createElement(SegmentedControl, {
              value: alignment[0],
              onChange: (value: string) => alignment[1](value),
              className: 'w-full',
              options: alignmentOptions,
              label: 'Alignment',
              'data-story-control': ''
            })
          )
        )
      )
    )
  )
}

export const StateMatrix: Story = {
  render: () => React.createElement(PanelFoundationDemo),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const controls = Array.from(canvasElement.querySelectorAll<HTMLElement>('[data-story-control]'))

    for (const control of controls) await expect(control).toHaveStyle({ height: '26px' })

    await userEvent.click(canvas.getByLabelText('Height'))
    await userEvent.hover(canvas.getByLabelText('Width'))
  }
}
