import type { AppConfig } from './types'

/**
 * Local frontend talks to localhost API, but documents live on Aliyun OSS.
 * Upload/read are independent: both use direct (presign / public URL), not /api/oss proxy.
 * For filesystem-only backends set both modes to 'proxy'.
 */
const config: AppConfig = {
  API_BASE_URL: 'http://localhost:8080',
  OSS_UPLOAD_MODE: 'direct',
  OSS_READ_MODE: 'direct',
  OSS_PUBLIC_BASE_URL: 'https://yoohoo-oss.oss-cn-shanghai.aliyuncs.com',
  CANVASKIT_WASM_URL:
    'https://yoohoo-oss.oss-cn-shanghai.aliyuncs.com/pencil/canvaskit-0.41.1.wasm'
}

export default config
