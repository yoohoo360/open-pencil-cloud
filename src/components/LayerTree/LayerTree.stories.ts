import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, within } from 'storybook/test'

import LayerTreeThemeDemo from '@/components/LayerTree/demo/LayerTreeThemeDemo'

const meta = {
  title: 'Design System/Editor/Layer Tree',
  component: LayerTreeThemeDemo,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Layer Tree theme states for selection focus, visibility, locking, dragging, drop instructions, and rename.'
      }
    }
  }
} satisfies Meta<typeof LayerTreeThemeDemo>

export default meta
type Story = StoryObj<typeof meta>

export const StateMatrix: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByLabelText('Selected focused').firstElementChild).toHaveAttribute(
      'data-focused'
    )
    await expect(canvas.getByLabelText('Selected unfocused').firstElementChild).toHaveAttribute(
      'data-selected'
    )
    await expect(canvas.getByLabelText('Hidden').firstElementChild).toHaveAttribute('data-hidden')
    await expect(canvas.getByLabelText('Dragging').firstElementChild).toHaveAttribute(
      'data-dragging'
    )
    await expect(canvas.getByLabelText('Child drop').firstElementChild).toHaveAttribute(
      'data-drop-position',
      'child'
    )
  }
}
