import { expect, test } from 'bun:test'

import { generateRoomId } from '@/app/collab/awareness'

test('new collaboration invitation credentials use 32 base36 characters', () => {
  const roomId = generateRoomId()
  expect(roomId).toMatch(/^[a-z0-9]{32}$/)
})
