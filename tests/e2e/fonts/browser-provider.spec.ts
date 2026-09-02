import { expect, test, useEditorSetup } from '#tests/e2e/fixtures'

const editor = useEditorSetup('/?test&no-chrome&no-rulers')

test('loads document font families from the browser provider before rendering', async () => {
  test.setTimeout(60_000)
  const result = await editor.page.evaluate(async () => {
    const { fontManager } = await import('/packages/core/src/text/index.ts')
    fontManager.setOnlineFontProviders({
      google: false,
      fontsource: true,
      bunny: false,
      fontshare: false
    })
    return Promise.all(
      ['Geist', 'Geist Mono', 'Roboto Mono'].map(async (family) => {
        const data = await fontManager.loadRemoteFont(family, 'Regular', 'Browser font')
        return {
          family,
          bytes: data?.byteLength ?? 0,
          source: fontManager.loadedFontSource(family, 'Regular')
        }
      })
    )
  })

  expect(result).toEqual([
    { family: 'Geist', bytes: expect.any(Number), source: 'fontsource' },
    { family: 'Geist Mono', bytes: expect.any(Number), source: 'fontsource' },
    { family: 'Roboto Mono', bytes: expect.any(Number), source: 'fontsource' }
  ])
  for (const face of result) expect(face.bytes).toBeGreaterThan(1_000)
})
