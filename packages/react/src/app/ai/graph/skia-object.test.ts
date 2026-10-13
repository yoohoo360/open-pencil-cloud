import { describe, expect, test } from 'bun:test'

import { deleteSkiaObject } from '#core/canvas/skia-object.override'

describe('deleteSkiaObject', () => {
  test('skips null and already-deleted handles', () => {
    let deletes = 0
    const object = {
      deleted: false,
      isDeleted() {
        return this.deleted
      },
      delete() {
        if (this.deleted) throw new Error('table index is out of bounds')
        this.deleted = true
        deletes += 1
      }
    }
    deleteSkiaObject(null)
    deleteSkiaObject(undefined)
    deleteSkiaObject(object)
    deleteSkiaObject(object)
    expect(deletes).toBe(1)
  })

  test('swallows delete throws from a corrupted handle', () => {
    expect(() =>
      deleteSkiaObject({
        isDeleted: () => false,
        delete: () => {
          throw new Error('table index is out of bounds')
        }
      })
    ).not.toThrow()
  })
})
