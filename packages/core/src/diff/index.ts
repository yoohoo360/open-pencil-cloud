import { SceneGraph } from '@open-pencil/scene-graph'

import { initFigExportCodec } from '#core/io/formats/fig/export'

export const diffChangeNode = async (graph: SceneGraph) => {
  console.time('diff====')
  const { msg } = await initFigExportCodec(graph)
  console.timeEnd('diff====')
  console.log('=========msg=======', msg)
}
