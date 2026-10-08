export { bootstrapHostedComponents } from '#react/hosted-components/bootstrap'
export { MARKDOWN_HOSTED_ID, markdownHostedComponent } from '#react/hosted-components/markdown/plugin'
export { createHostedComponentContext } from '#react/hosted-components/context'
export { ensureHostedLibraries } from '#react/hosted-components/ensure'
export { hydrateHostedInstance, hydrateHostedInstances } from '#react/hosted-components/hydrate'
export {
  enclosingHostedInstance,
  hostedAllowsEnterContainer,
  hostedAllowsTextEdit,
  hostedPanelChrome,
  hostedShowsLayerChildren,
  isHostedDescendant,
  isHostedTextLayer,
  matchHostedComponent,
  resolveHostedSelection
} from '#react/hosted-components/match'
export { HostedComponentPanel } from '#react/hosted-components/panel'
export {
  clearHostedComponents,
  getHostedComponent,
  listHostedComponents,
  registerHostedComponent,
  unregisterHostedComponent
} from '#react/hosted-components/registry'
export type {
  HostedCanvasHooks,
  HostedComponentContext,
  HostedComponentDef,
  HostedDesignSectionId,
  HostedMatch,
  HostedPanelChrome,
  HostedPanelSection
} from '#react/hosted-components/types'
