interface FontData {
  family: string
  fullName: string
  postscriptName: string
  style: string
  blob(): Promise<Blob>
}

interface Window {
  queryLocalFonts?(): Promise<FontData[]>
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
