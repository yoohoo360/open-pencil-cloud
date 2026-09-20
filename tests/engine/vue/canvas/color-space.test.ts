import { expect, test } from 'bun:test'

import { configureDrawingBufferColorSpace } from '#vue/canvas/surface/color-space'

for (const wideGamut of [false, true]) {
  for (const documentSpace of ['srgb', 'display-p3'] as const) {
    test(`buffer space matches ${documentSpace}, wide gamut ${wideGamut}`, () => {
      const context: Pick<WebGLRenderingContext, 'drawingBufferColorSpace'> = {
        drawingBufferColorSpace: 'srgb'
      }
      const expected = wideGamut && documentSpace === 'display-p3' ? 'display-p3' : 'srgb'
      expect(configureDrawingBufferColorSpace(context, documentSpace, wideGamut)).toBe(expected)
      expect(context.drawingBufferColorSpace).toBe(expected)
    })
  }
}

test('unsupported and read-only contexts retain their actual sRGB buffer', () => {
  expect(configureDrawingBufferColorSpace(null, 'display-p3', true)).toBe('srgb')
  expect(configureDrawingBufferColorSpace({}, 'display-p3', true)).toBe('srgb')
  const readOnly = {
    get drawingBufferColorSpace(): PredefinedColorSpace {
      return 'srgb'
    }
  }
  expect(configureDrawingBufferColorSpace(readOnly, 'display-p3', true)).toBe('srgb')
})

test('switching away from P3 resets a retained context to sRGB', () => {
  const context: Pick<WebGLRenderingContext, 'drawingBufferColorSpace'> = {
    drawingBufferColorSpace: 'display-p3'
  }
  expect(configureDrawingBufferColorSpace(context, 'srgb', true)).toBe('srgb')
  expect(context.drawingBufferColorSpace).toBe('srgb')
})
