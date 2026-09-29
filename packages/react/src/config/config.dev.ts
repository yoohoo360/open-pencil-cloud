import type { AppConfig } from './types'

const config: AppConfig = {
  API_BASE_URL: 'https://pencil.api.dev.yoohoo.cn',
  OSS_UPLOAD_MODE: 'direct',
  OSS_READ_MODE: 'direct',
  OSS_PUBLIC_BASE_URL: 'https://yoohoo-oss.oss-cn-shanghai.aliyuncs.com',
  CANVASKIT_WASM_URL: 'https://yoohoo-oss.oss-cn-shanghai.aliyuncs.com/pencil/canvaskit-0.41.1.wasm'
}

export default config
