export type OssTransferMode = 'proxy' | 'direct'

export type AppConfig = {
  API_BASE_URL: string
  /**
   * Origin the desktop shell loads over HTTP. Packaged builds navigate here by
   * default; non-prod desktop builds may override it from settings.
   */
  FRONTEND_BASE_URL: string
  OSS_UPLOAD_MODE: OssTransferMode
  OSS_READ_MODE: OssTransferMode
  OSS_PUBLIC_BASE_URL?: string
  CANVASKIT_WASM_URL?: string
  /**
   * fe-codesandbox / fe-esbuild-package preview host. When set, Make is shown in
   * the property panel and previews load `{url}/embed/preview`.
   */
  MAKE_SANDBOX_SERVER_URL?: string
}
