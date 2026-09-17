/// <reference types="unplugin-icons/types/react" />
/// <reference path="../../../scene-graph/src/silent-mutations.d.ts" />
/// <reference path="../../../core/src/canvas/tiled-loading-boost.d.ts" />

declare const __OPENPENCIL_APP_VERSION__: string
declare const __OPENPENCIL_LOCAL_AUTOMATION_TOKEN__: string | null
declare const __OPENPENCIL_LOCAL_AUTOMATION_URL__: string
declare const __OPENPENCIL_LOCAL_AUTOMATION_HTTP_URL__: string

interface FontData {
  family: string
  fullName: string
  postscriptName: string
  style: string
  blob(): Promise<Blob>
}

interface FilePickerAcceptType {
  description: string
  accept: Record<string, string[]>
}

interface FilePickerOptions {
  multiple?: boolean
  types?: FilePickerAcceptType[]
  suggestedName?: string
}

interface Window {
  queryLocalFonts?(): Promise<FontData[]>
  showOpenFilePicker?(options?: FilePickerOptions): Promise<FileSystemFileHandle[]>
  showSaveFilePicker?(options?: FilePickerOptions): Promise<FileSystemFileHandle>
  __openPencilImportFigFromUrl?: (
    url: string
  ) => Promise<
    | {
        ok: true
        url: string
        fileName: string
        bytes: number
        downloadMs: number
        importMs: number
        totalMs: number
        pages: number
        nodes: number
        firstPageName: string | null
        firstPageChildren: number
      }
    | { ok: false; url: string; error: string; totalMs: number }
  >
  __openPencilDebugLazyFig?: () => unknown
  __openPencilGetStore?: () => unknown
  __openPencilProfileSwitchPage?: (pageId: string) => Promise<unknown>
}

interface GestureEvent extends UIEvent {
  scale: number
  rotation: number
  clientX: number
  clientY: number
}

declare module '*?raw' {
  const content: string
  export default content
}

interface ImportMetaEnv {
  DEV: boolean
  PROD: boolean
  MODE: string
  APP_ENV?: string
  VITE_API_URL?: string
  VITE_COLLAB_WS_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
