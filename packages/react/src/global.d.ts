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
  VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
