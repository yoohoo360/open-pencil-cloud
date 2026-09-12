import { test, expect } from '#tests/helpers/chat/fixture'

test('a long restored conversation scrolls to its latest message on mount', async ({
  configuredChat: chat,
  page
}) => {
  const text = Array.from({ length: 100 }, (_, index) => `Restored line ${index}`).join('\n')
  await chat.submit(text)
  await expect(chat.assistantMessage()).toBeVisible()
  await page.reload()
  await chat.chatTab.click()
  await page.getByRole('button', { name: 'Conversation history', exact: true }).click()
  await page.getByRole('button', { name: 'All documents', exact: true }).click()
  await page.getByRole('button', { name: /Restored line 0/ }).click()
  await chat.designTab.click()
  await chat.chatTab.click()
  const viewport = page.getByTestId('chat-panel').locator('[data-reka-scroll-area-viewport]')
  await expect
    .poll(() =>
      viewport.evaluate((element) => ({
        overflows: element.scrollHeight > element.clientHeight,
        bottomGap: element.scrollHeight - element.scrollTop - element.clientHeight
      }))
    )
    .toMatchObject({ overflows: true })
  await expect
    .poll(() =>
      viewport.evaluate(
        (element) => element.scrollHeight - element.scrollTop - element.clientHeight
      )
    )
    .toBeLessThan(3)
})
