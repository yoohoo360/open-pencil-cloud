/**
 * Status copy for the shared canvas page-loading overlay.
 * Work phases only — never document / page titles or node counts.
 */
export const pageLoadingLabels = {
  /** Read / download / decode — one copy for the whole open prelude. */
  loadingDocument: '正在加载文档',
  preparingNodes: '正在解析节点',
  /** Instance expansion + override apply after structure is ready. */
  expandingComponents: '正在展开组件',
  resolvingFonts: '正在加载字体',
  computingLayout: '正在计算布局',
  preparingCanvas: '正在准备画布'
} as const

/** Map editor prepare progress → overlay status (no page names / node counts). */
export function pageLoadingProgressDetail(progress: {
  detail?: string
  phase?: string
  completed?: number
  total?: number
  stage?: string
} | undefined): string {
  switch (progress?.phase) {
    case 'resolving-fonts':
    case 'resolving-fallbacks':
      return pageLoadingLabels.resolvingFonts
    case 'layout':
      return pageLoadingLabels.computingLayout
    case 'preparing-render':
      return pageLoadingLabels.preparingCanvas
    case 'populating-page': {
      // One stable line for the whole expand phase — no step counters.
      if (progress.stage === 'instances' || progress.stage === 'overrides') {
        return pageLoadingLabels.expandingComponents
      }
      return pageLoadingLabels.preparingNodes
    }
    default:
      return pageLoadingLabels.preparingNodes
  }
}
