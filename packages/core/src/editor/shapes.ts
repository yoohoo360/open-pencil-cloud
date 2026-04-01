import {
  DEFAULT_FRAME_FILL,
  DEFAULT_SHAPE_FILL,
  SECTION_DEFAULT_FILL,
  SECTION_DEFAULT_STROKE
} from '../constants'
import { computeVectorBounds } from '../vector'

import type {
  Fill,
  NodeType,
  SceneNode,
  VectorNetwork,
  VectorRegion,
  VectorSegment
} from '../scene-graph'
import type { Vector } from '../types'
import type { EditorContext } from './types'

export interface PenDragOptions {
  keepOpposite?: boolean
  constrainToOpposite?: boolean
  oppositeTangent?: Vector | null
}

const BLACK_FILL: Fill = {
  type: 'SOLID',
  color: { r: 0, g: 0, b: 0, a: 1 },
  opacity: 1,
  visible: true
}

const PEN_DEFAULT_STROKE: SceneNode['strokes'][number] = {
  color: { r: 0, g: 0, b: 0, a: 1 },
  weight: 2,
  opacity: 1,
  visible: true,
  align: 'CENTER'
}

const DEFAULT_FILLS: Record<string, Fill> = {
  FRAME: DEFAULT_FRAME_FILL,
  SECTION: SECTION_DEFAULT_FILL,
  RECTANGLE: DEFAULT_SHAPE_FILL,
  ELLIPSE: DEFAULT_SHAPE_FILL,
  POLYGON: DEFAULT_SHAPE_FILL,
  STAR: DEFAULT_SHAPE_FILL,
  LINE: BLACK_FILL,
  TEXT: BLACK_FILL
}

function projectTangentToAxis(active: Vector, opposite: Vector): Vector {
  const axis = { x: -opposite.x, y: -opposite.y }
  const axisLen = Math.hypot(axis.x, axis.y)
  if (axisLen <= 1e-6) return active
  const dir = { x: axis.x / axisLen, y: axis.y / axisLen }
  const len = Math.max(0, active.x * dir.x + active.y * dir.y)
  return { x: dir.x * len, y: dir.y * len }
}

function applyAnchorTangent(
  tangent: Vector,
  isClosing: boolean,
  firstSeg: VectorSegment | undefined,
  lastSeg: VectorSegment | undefined
): void {
  if (isClosing) {
    if (!firstSeg) return
    if (firstSeg.start === 0) firstSeg.tangentStart = { x: tangent.x, y: tangent.y }
    else if (firstSeg.end === 0) firstSeg.tangentEnd = { x: tangent.x, y: tangent.y }
    return
  }
  if (lastSeg) {
    lastSeg.tangentEnd = { x: tangent.x, y: tangent.y }
  }
}

export function createShapeActions(ctx: EditorContext) {
  function createShape(
    type: NodeType,
    x: number,
    y: number,
    w: number,
    h: number,
    parentId?: string
  ): string {
    const fill = DEFAULT_FILLS[type] ?? DEFAULT_FILLS.RECTANGLE
    const pid = parentId ?? ctx.state.currentPageId
    const overrides: Partial<SceneNode> = {
      x,
      y,
      width: w,
      height: h,
      fills: [{ ...fill }]
    }
    if (type === 'SECTION') {
      overrides.strokes = [{ ...SECTION_DEFAULT_STROKE }]
      overrides.cornerRadius = 5
    }
    if (type === 'POLYGON') {
      overrides.pointCount = 3
    }
    if (type === 'STAR') {
      overrides.pointCount = 5
      overrides.starInnerRadius = 0.38
    }
    if (type === 'TABLE_NODE') {
      overrides.width = 200
      overrides.height = 100
      overrides.name = 'Table'
      overrides.layoutMode = 'GRID'
      overrides.gridTemplateColumns = [
        {
          sizing: 'FR',
          value: 1
        },
        {
          sizing: 'FR',
          value: 1
        }
      ]

      overrides.gridTemplateRows = [
        {
          sizing: 'FR',
          value: 1
        },
        {
          sizing: 'FR',
          value: 1
        }
      ]
    }
    const node = ctx.graph.createNode(type, pid, overrides)
    const id = node.id
    if (type === 'TABLE_NODE') {
      // 创建4个FRAME作为单元格
      const cellWidth = overrides?.width / 2
      const cellHeight = overrides?.height / 2

      for (let i = 0; i < 4; i++) {
        ctx.graph.createNode('TABLE_CELL', id, {
          x: (i % 2) * cellWidth,
          y: Math.floor(i / 2) * cellHeight,
          name: i < 2 ? 'Head' : 'Cell',
          width: cellWidth,
          height: cellHeight,
          layoutMode: 'HORIZONTAL',

          fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, opacity: 0, visible: true }]
        })
      }
      // ctx.graph.updateNode(id, { width: overrides.width + 10, height: overrides.height + 10 })
    }

    const snapshot = { ...node }
    ctx.undo.push({
      label: `Create ${type.toLowerCase()}`,
      forward: () => {
        ctx.graph.createNode(snapshot.type, pid, snapshot)
      },
      inverse: () => {
        ctx.graph.deleteNode(id)
        const next = new Set(ctx.state.selectedIds)
        next.delete(id)
        ctx.state.selectedIds = next
      }
    })
    return id
  }

  function penAddVertex(x: number, y: number) {
    if (!ctx.state.penState) {
      ctx.state.penState = {
        vertices: [{ x, y }],
        segments: [],
        dragTangent: null,
        oppositeDragTangent: null,
        pendingClose: false,
        closingToFirst: false
      }
      ctx.requestRender()
      return
    }

    const ps = ctx.state.penState
    const prevIdx = ps.vertices.length - 1

    ps.vertices.push({ x, y })
    const newIdx = ps.vertices.length - 1
    ps.segments.push({
      start: prevIdx,
      end: newIdx,
      tangentStart: ps.dragTangent ?? { x: 0, y: 0 },
      tangentEnd: { x: 0, y: 0 }
    })
    ps.dragTangent = null
    ps.oppositeDragTangent = null
    ps.pendingClose = false
    ctx.requestRender()
  }

  function penSetDragTangent(tx: number, ty: number, options?: PenDragOptions) {
    if (!ctx.state.penState) return
    const ps = ctx.state.penState
    let active = { x: tx, y: ty }
    const isClosing = !!ps.pendingClose && ps.vertices.length > 2
    const anchorIndex = isClosing ? 0 : ps.vertices.length - 1
    const lastSeg = ps.segments.length > 0 ? ps.segments[ps.segments.length - 1] : undefined
    const firstSeg = ps.segments.length > 0 ? ps.segments[0] : undefined
    const opposite =
      options?.oppositeTangent ??
      ps.oppositeDragTangent ??
      (lastSeg ? lastSeg.tangentEnd : { x: -tx, y: -ty })

    if (options?.constrainToOpposite) {
      active = projectTangentToAxis(active, opposite)
    }

    ps.dragTangent = active
    const keepOpposite = options?.keepOpposite ?? isClosing
    if (keepOpposite) {
      ps.oppositeDragTangent = { x: opposite.x, y: opposite.y }
      applyAnchorTangent(opposite, isClosing, firstSeg, lastSeg)
      if (options?.constrainToOpposite) {
        ps.vertices[anchorIndex].handleMirroring = 'ANGLE'
      } else {
        ps.vertices[anchorIndex].handleMirroring = 'NONE'
      }
    } else {
      const symmetric = { x: -active.x, y: -active.y }
      ps.oppositeDragTangent = symmetric
      applyAnchorTangent(symmetric, isClosing, firstSeg, lastSeg)
      ps.vertices[anchorIndex].handleMirroring = 'ANGLE_AND_LENGTH'
    }
    ctx.requestRender()
  }

  function penSetClosingToFirst(closing: boolean) {
    if (!ctx.state.penState) return
    ctx.state.penState.closingToFirst = closing
    ctx.requestRender()
  }

  function penSetPendingClose(closing: boolean) {
    if (!ctx.state.penState) return
    ctx.state.penState.pendingClose = closing
    ctx.requestRepaint()
  }

  function penSetKnotPosition(x: number, y: number) {
    if (!ctx.state.penState) return
    const ps = ctx.state.penState
    const isClosing = !!ps.pendingClose && ps.vertices.length > 2
    const anchorIndex = isClosing ? 0 : ps.vertices.length - 1
    ps.vertices[anchorIndex].x = x
    ps.vertices[anchorIndex].y = y
    ctx.requestRender()
  }

  function penCommit(closed: boolean) {
    const ps = ctx.state.penState
    if (!ps || ps.vertices.length < 2) {
      ctx.state.penState = null
      ctx.state.penCursorX = null
      ctx.state.penCursorY = null
      return
    }

    if (closed && ps.pendingClose && ps.vertices.length > 2) {
      const prevIdx = ps.vertices.length - 1
      ps.segments.push({
        start: prevIdx,
        end: 0,
        tangentStart: { x: 0, y: 0 },
        tangentEnd: ps.dragTangent ?? { x: 0, y: 0 }
      })
    }

    const regions: VectorRegion[] = closed
      ? [{ windingRule: 'NONZERO', loops: [ps.segments.map((_, i) => i)] }]
      : []

    const network: VectorNetwork = {
      vertices: ps.vertices.map((v) => ({ ...v })),
      segments: ps.segments.map((s) => ({
        ...s,
        tangentStart: { ...s.tangentStart },
        tangentEnd: { ...s.tangentEnd }
      })),
      regions
    }

    const bounds = computeVectorBounds(network)

    const normalizedVertices = network.vertices.map((v) => ({
      ...v,
      x: v.x - bounds.x,
      y: v.y - bounds.y
    }))

    const normalizedNetwork: VectorNetwork = {
      vertices: normalizedVertices,
      segments: network.segments,
      regions: network.regions
    }

    const penStyle = ps as typeof ps & {
      resumedFills?: Fill[]
      resumedStrokes?: SceneNode['strokes']
    }
    const fills = penStyle.resumedFills ? penStyle.resumedFills.map((f) => ({ ...f })) : []
    const strokes = penStyle.resumedStrokes
      ? penStyle.resumedStrokes.map((s) => ({ ...s }))
      : [{ ...PEN_DEFAULT_STROKE }]

    const nodeId = createShape('VECTOR', bounds.x, bounds.y, bounds.width, bounds.height)
    ctx.graph.updateNode(nodeId, {
      vectorNetwork: normalizedNetwork,
      name: 'Vector',
      fills,
      strokes
    })
    ctx.state.selectedIds = new Set([nodeId])

    ctx.state.penState = null
    ctx.state.penCursorX = null
    ctx.state.penCursorY = null
    ctx.state.activeTool = 'SELECT'
    ctx.requestRender()
  }

  function penCancel() {
    ctx.state.penState = null
    ctx.state.penCursorX = null
    ctx.state.penCursorY = null
    ctx.state.activeTool = 'SELECT'
    ctx.requestRender()
  }

  function adoptNodesIntoSection(sectionId: string) {
    const section = ctx.graph.getNode(sectionId)
    if (section?.type !== 'SECTION') return

    const parentId = section.parentId ?? ctx.state.currentPageId
    const siblings = ctx.graph.getChildren(parentId)

    const sx = section.x
    const sy = section.y
    const sx2 = sx + section.width
    const sy2 = sy + section.height

    const toAdopt: string[] = []
    for (const sibling of siblings) {
      if (sibling.id === sectionId) continue
      const nx = sibling.x
      const ny = sibling.y
      const nx2 = nx + sibling.width
      const ny2 = ny + sibling.height
      if (nx >= sx && ny >= sy && nx2 <= sx2 && ny2 <= sy2) {
        toAdopt.push(sibling.id)
      }
    }

    if (toAdopt.length === 0) return

    const undoOps: Array<{
      id: string
      oldParent: string
      oldX: number
      oldY: number
      newX: number
      newY: number
    }> = []
    for (const id of toAdopt) {
      const node = ctx.graph.getNode(id)
      if (!node) continue
      const newX = node.x - sx
      const newY = node.y - sy
      undoOps.push({ id, oldParent: parentId, oldX: node.x, oldY: node.y, newX, newY })
      ctx.graph.reparentNode(id, sectionId)
      ctx.graph.updateNode(id, { x: newX, y: newY })
    }

    ctx.undo.push({
      label: 'Adopt into section',
      forward: () => {
        for (const op of undoOps) {
          ctx.graph.reparentNode(op.id, sectionId)
          ctx.graph.updateNode(op.id, { x: op.newX, y: op.newY })
        }
      },
      inverse: () => {
        for (const op of undoOps) {
          ctx.graph.reparentNode(op.id, op.oldParent)
          ctx.graph.updateNode(op.id, { x: op.oldX, y: op.oldY })
        }
      }
    })
  }

  function setTool(tool: typeof ctx.state.activeTool) {
    ctx.state.activeTool = tool
  }

  return {
    createShape,
    penAddVertex,
    penSetDragTangent,
    penSetClosingToFirst,
    penSetPendingClose,
    penSetKnotPosition,
    penCommit,
    penCancel,
    adoptNodesIntoSection,
    setTool
  }
}
