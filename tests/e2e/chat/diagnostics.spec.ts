import { test, expect } from '#tests/helpers/chat/fixture'

test('diagnostic menu copies the conversation to the clipboard', async ({
  configuredChat: chat,
  page,
  context
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await chat.submit('Clipboard regression conversation')
  await expect(chat.assistantMessage()).toBeVisible()
  await page.getByRole('button', { name: 'Conversation actions' }).click()
  await page.getByRole('menuitem', { name: 'Copy diagnostic log' }).click()
  await expect(page.getByRole('status')).toContainText('Diagnostic log copied.')
  const contents = await page.evaluate(() => navigator.clipboard.readText())
  expect(contents).toContain('OPEN PENCIL AI DEBUG LOG')
  expect(contents).toContain('Clipboard regression conversation')
})

test('clipboard rejection shows failure feedback rather than success', async ({
  configuredChat: chat,
  page
}) => {
  await chat.submit('Clipboard failure conversation')
  await expect(chat.assistantMessage()).toBeVisible()
  await page.evaluate(() => {
    Object.defineProperty(navigator.clipboard, 'writeText', {
      configurable: true,
      value: async () => {
        throw new DOMException('Permission denied', 'NotAllowedError')
      }
    })
  })
  await page.getByRole('button', { name: 'Conversation actions' }).click()
  await page.getByRole('menuitem', { name: 'Copy diagnostic log' }).click()
  await expect(page.getByRole('status')).toContainText('Could not copy the diagnostic log.')
  await expect(page.getByText('Diagnostic log copied.', { exact: true })).toHaveCount(0)
})

test('mobile conversation menu stays attached to its trigger and inside the viewport', async ({
  configuredChat: chat,
  page
}) => {
  await chat.submit('Mobile menu conversation')
  await expect(chat.assistantMessage()).toBeVisible()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByTestId('mobile-ribbon-ai').click()
  const trigger = page.getByRole('button', { name: 'Conversation actions' })
  await expect(trigger).toBeVisible()
  const triggerBox = await trigger.boundingBox()
  await trigger.click()
  const menu = page.getByRole('menu')
  await expect(menu).toBeVisible()
  await expect
    .poll(async () => {
      const box = await menu.boundingBox()
      if (!box || !triggerBox) return false
      return (
        box.x >= 0 &&
        box.x + box.width <= 390 &&
        box.y >= 0 &&
        box.y + box.height <= 844 &&
        Math.abs(box.x + box.width - triggerBox.x - triggerBox.width) < 2
      )
    })
    .toBe(true)
})
