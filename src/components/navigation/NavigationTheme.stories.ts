import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, within } from 'storybook/test'

import NavigationThemeDemo from '@/components/navigation/demo/NavigationThemeDemo'

const meta = {
  title: 'Design System/Editor/Navigation',
  component: NavigationThemeDemo,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Page list, Layers/Assets segmented tabs, and document TabBar theme states.'
      }
    }
  }
} satisfies Meta<typeof NavigationThemeDemo>

export default meta
type Story = StoryObj<typeof meta>

export const StateMatrix: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByLabelText('Active')).toHaveAttribute('data-active')
    await expect(canvas.getByLabelText('Dragging')).toHaveAttribute('data-dragging')
    await expect(canvas.getByLabelText('Active tab')).toHaveAttribute('data-active')
  }
}
