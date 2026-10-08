import { BuiltinTextSection } from '#react/components/properties/builtin-text/BuiltinTextSection'
import { hydrateBuiltinInstance } from '#react/controls/builtin-text/hydrate'
import {
  BUILTIN_COMPONENT_NAME,
  BUILTIN_LIBRARY_KEY,
  copyBuiltinImages,
  createBuiltinCatalog,
  migrateBuiltinLibrary
} from '#react/graph/builtin'
import type { HostedComponentDef } from '#react/hosted-components/types'

export const MARKDOWN_HOSTED_ID = 'open-pencil.markdown'

/**
 * First-party Markdown hosted component: pluginData is source of truth;
 * canvas children are projected via syncMarkdownToNodes.
 */
export const markdownHostedComponent: HostedComponentDef = {
  id: MARKDOWN_HOSTED_ID,
  displayName: BUILTIN_COMPONENT_NAME,
  libraryKey: BUILTIN_LIBRARY_KEY,
  libraryName: 'Built-in',
  pluginId: 'open-pencil',
  markKey: 'builtin',
  createCatalog: createBuiltinCatalog,
  copyLibraryAssets: copyBuiltinImages,
  onLibraryPresent: (graph) => {
    migrateBuiltinLibrary(graph)
  },
  panel: {
    sections: [{ id: 'markdown', render: BuiltinTextSection }]
  },
  panelChrome: {
    hideComponentProperties: true,
    hideInstanceActions: true,
    hidePlainTypographyContent: true,
    // Only position among standard design sections; Markdown editor stays via `panel.sections`.
    designSections: ['position']
  },
  canvas: {
    showLayerChildren: false,
    allowEnterContainer: false,
    allowTextEdit: () => false
  },
  hydrate: (ctx, hostId) => {
    hydrateBuiltinInstance(ctx.editor, hostId)
  }
}
