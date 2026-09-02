const env = import.meta.env.VITE_APP_ENV

let _API_BASE_URL = 'http://localhost:8000'

if (env === 'dev') {
  _API_BASE_URL = 'https://dev.api.yoohoo.cn'
} else if (env === 'prod') {
  _API_BASE_URL = 'https://api.yoohoo.cn'
}
export default {
  API_BASE_URL: _API_BASE_URL
}
