import * as v from 'valibot'

import type { FigmaNodeProxy } from '#core/figma-api'
import { defineTool, nodeToResult } from '#core/tools/schema'

export const getSelection = defineTool({
  name: 'get_selection',
  description: 'Get details about currently selected nodes.',
  execution: { kind: 'sync', mutation: 'none' },
  exposure: { webmcp: false },
  input: v.object({}),
  execute: (figma) => {
    const selection = figma.currentPage.selection
    return { selection: selection.map(nodeToResult) }
  }
})

export const selectNodes = defineTool({
  name: 'select_nodes',

  description: 'Select one or more nodes by ID.',
  execution: { kind: 'sync', mutation: 'view' },
  input: v.object({
    ids: v.pipe(v.array(v.string()), v.minLength(1), v.description('Node IDs to select'))
  }),
  execute: (figma, { ids }) => {
    figma.currentPage.selection = ids
      .map((id) => figma.getNodeById(id))
      .filter((node): node is FigmaNodeProxy => node !== null)
    return { selected: ids }
  }
})
