import { expect, test } from 'bun:test'
import { join } from 'node:path'

import { openPencilArchitecturePlugin } from '../src/steiger-rules/index'

test('keeps tool test helpers beside tests without allowing arbitrary tool locations', () => {
  const rule = openPencilArchitecturePlugin.ruleDefinitions.find(
    (rule) => rule.name === 'open-pencil/strict-tools-layout'
  )
  if (!rule) throw new Error('Missing tool layout rule')
  for (const [file, valid] of [
    ['tools/lint/src/plugin.ts', true],
    ['tools/lint/tests/example.test.ts', true],
    ['tools/lint/tests/helpers/lint.ts', true],
    ['tools/lint/tests/lint.ts', false],
    ['tools/lint/helpers/lint.ts', false],
    ['tools/lint/plugin.ts', false]
  ] as const) {
    const root = process.cwd()
    expect(
      rule.check({
        type: 'folder',
        path: root,
        children: [{ type: 'file', path: join(root, file) }]
      }).diagnostics.length
    ).toBe(valid ? 0 : 1)
  }
})
