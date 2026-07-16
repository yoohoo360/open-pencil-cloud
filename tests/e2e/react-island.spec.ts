import { expect, test } from '@playwright/test'

test.describe('React island host', () => {
  test('mounts React editor bridge smoke island in dev', async ({ page }) => {
    await page.goto('/?test')
    await expect(page.locator('[data-test-id="editor-root"]')).toBeVisible()
    // Smoke island is DEV-only; Playwright webServer runs `bun run dev`
    await expect(page.locator('[data-test-id="react-island-smoke"]')).toBeVisible({
      timeout: 15_000
    })
  })
})
