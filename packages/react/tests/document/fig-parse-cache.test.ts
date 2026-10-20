import 'fake-indexeddb/auto'

import { afterAll, beforeEach, describe, expect, test } from 'bun:test'
import { IDBFactory } from 'fake-indexeddb'

import { SceneGraph } from '@open-pencil/scene-graph'

import {
  clearFigParseCache,
  listFigParseCacheMeta,
  readFigParseCache,
  removeFigParseCacheEntry,
  resetFigParseCacheDatabase,
  writeFigParseCache
} from '#react/app/document/fig-parse-cache/idb'
import {
  hydrateFigParseGraph,
  snapshotFigParseGraph
} from '#react/app/document/fig-parse-cache/snapshot'
import { FIG_PARSE_CACHE_MAX_ENTRIES } from '#react/app/document/fig-parse-cache/types'

const sharedFactory = indexedDB

describe('fig parse cache', () => {
  beforeEach(async () => {
    resetFigParseCacheDatabase()
    globalThis.indexedDB = new IDBFactory()
    await clearFigParseCache()
  })

  afterAll(() => {
    resetFigParseCacheDatabase()
    globalThis.indexedDB = sharedFactory
  })

  test('snapshot round-trips through hydrate', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]!
    graph.createNode('RECTANGLE', page.id, {
      name: 'Cached rect',
      x: 10,
      y: 20,
      width: 100,
      height: 40
    })
    graph.images.set('img1', new Uint8Array([9, 8, 7]))

    const restored = hydrateFigParseGraph(snapshotFigParseGraph(graph))
    expect(restored.rootId).toBe(graph.rootId)
    expect(restored.nodes.size).toBe(graph.nodes.size)
    expect(restored.getNode(page.id)?.name).toBe(page.name)
    expect([...restored.images.get('img1')!]).toEqual([9, 8, 7])
  })

  test('hit requires matching documentKey and updatedAt', async () => {
    const graph = new SceneGraph()
    const payload = snapshotFigParseGraph(graph)
    await writeFigParseCache(payload, {
      identity: { documentKey: 'doc-a', updatedAt: 1000 },
      byteLength: 3
    })

    expect(await readFigParseCache('doc-a', 1000)).not.toBeNull()
    expect(await readFigParseCache('doc-a', 2000)).toBeNull()
    expect(await listFigParseCacheMeta()).toHaveLength(0)
  })

  test('rejects invalid payload and remove clears a key entry', async () => {
    expect(() => hydrateFigParseGraph({ schemaVersion: 0 })).toThrow()
    const graph = new SceneGraph()
    await writeFigParseCache(snapshotFigParseGraph(graph), {
      identity: { documentKey: 'doc-b', updatedAt: '2024-01-01T00:00:00.000Z' },
      byteLength: 3
    })
    await removeFigParseCacheEntry('doc-b')
    expect(await readFigParseCache('doc-b', '2024-01-01T00:00:00.000Z')).toBeNull()
  })

  test('put keeps at most three document keys by LRU accessedAt', async () => {
    const graph = new SceneGraph()
    const payload = snapshotFigParseGraph(graph)
    const keys: string[] = []
    for (let i = 0; i < FIG_PARSE_CACHE_MAX_ENTRIES + 1; i++) {
      const documentKey = `doc-${i}`
      keys.push(documentKey)
      await writeFigParseCache(payload, {
        identity: { documentKey, updatedAt: i },
        byteLength: 3,
        fileName: `f${i}.fig`
      })
      if (i === 0) await new Promise((resolve) => setTimeout(resolve, 5))
    }

    const metas = await listFigParseCacheMeta()
    expect(metas).toHaveLength(FIG_PARSE_CACHE_MAX_ENTRIES)
    expect(metas.some((meta) => meta.documentKey === keys[0])).toBe(false)
    expect(await readFigParseCache(keys[0]!, 0)).toBeNull()
    expect(await readFigParseCache(keys[1]!, 1)).not.toBeNull()
  })

  test('same documentKey replaces prior updatedAt entry', async () => {
    const graph = new SceneGraph()
    const payload = snapshotFigParseGraph(graph)
    await writeFigParseCache(payload, {
      identity: { documentKey: 'doc-same', updatedAt: 1 },
      byteLength: 3
    })
    await writeFigParseCache(payload, {
      identity: { documentKey: 'doc-same', updatedAt: 2 },
      byteLength: 4
    })

    const metas = await listFigParseCacheMeta()
    expect(metas).toHaveLength(1)
    expect(metas[0]?.updatedAt).toBe('2')
    expect(await readFigParseCache('doc-same', 2)).not.toBeNull()
  })

  test('read with mismatched schema deletes the entry', async () => {
    const graph = new SceneGraph()
    await writeFigParseCache(snapshotFigParseGraph(graph), {
      identity: { documentKey: 'doc-schema', updatedAt: 9 },
      byteLength: 3
    })

    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('open-pencil-fig-parse-cache', 2)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction('meta', 'readwrite')
      transaction.objectStore('meta').put({
        documentKey: 'doc-schema',
        updatedAt: '9',
        fileName: null,
        byteLength: 3,
        accessedAt: Date.now(),
        createdAt: Date.now(),
        schemaVersion: 999
      })
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
    database.close()
    resetFigParseCacheDatabase()

    expect(await readFigParseCache('doc-schema', 9)).toBeNull()
    expect(await listFigParseCacheMeta()).toHaveLength(0)
  })
})
