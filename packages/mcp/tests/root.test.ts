import { describe, expect, test } from 'bun:test'
import { homedir } from 'node:os'

import { resolveMCPRoot } from '../src/root'

describe('resolveMCPRoot', () => {
  test('honors an explicit root', () => {
    expect(resolveMCPRoot(' /designs ')).toBe('/designs')
  })

  test('uses the home directory on Windows', () => {
    expect(resolveMCPRoot(undefined, 'win32')).toBe(homedir())
  })
})
