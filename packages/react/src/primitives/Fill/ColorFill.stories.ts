import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'

import { ColorFillDemo } from '#react/primitives/Fill/demo/ColorFillDemo'

const meta = {
  title: 'React SDK/Primitives/Color and Fill',
  component: ColorFillDemo,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Fill state, binding-aware swatches, and the temporary scalar channel slider for OkHCL controls.'
      }
    }
  }
} satisfies Meta<typeof ColorFillDemo>

export default meta
type Story = StoryObj<typeof meta>

export const StateMatrix: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('img', { name: 'Transparent fill' })).toHaveAttribute(
      'data-transparent'
    )
    await userEvent.click(canvas.getByRole('button', { name: 'Gradient' }))
    await expect(canvas.getByRole('img', { name: 'Editable fill' })).toHaveAttribute(
      'data-fill-category',
      'GRADIENT'
    )
  }
}
