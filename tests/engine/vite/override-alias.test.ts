import { resolve } from 'node:path'

import { describe, expect, test } from 'bun:test'

import {
  collectOverrideAliases,
  overridePathFor,
  resolvedOverridePath,
  webpackOverrideAliases
} from '../../../vite/override-alias'

const instances = resolve(
  import.meta.dir,
  '../../../packages/core/src/editor/components/instances.ts'
)
const override = resolve(
  import.meta.dir,
  '../../../packages/core/src/editor/components/instances.override.ts'
)

describe('override alias', () => {
  test('maps a source file to its sibling .override file', () => {
    expect(overridePathFor(instances)).toBe(override)
    expect(resolvedOverridePath(instances)).toBe(override)
    expect(overridePathFor(override)).toBeNull()
    expect(resolvedOverridePath(override)).toBeNull()
  })

  test('collects webpack aliases for existing overrides', () => {
    const aliases = webpackOverrideAliases([
      resolve(import.meta.dir, '../../../packages/core/src/editor/components')
    ])
    expect(aliases[instances]).toBe(override)
    expect(collectOverrideAliases([resolve(import.meta.dir, '../../../packages/core/src')])[instances]).toBe(
      override
    )
  })
})
