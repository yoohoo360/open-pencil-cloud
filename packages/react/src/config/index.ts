const env = import.meta.env.APP_ENV

function resolveAPIBaseURL(): string {
  if (env === 'dev') return 'http://pencil.api.dev.yoohoo.cn'
  if (env === 'prod') return 'https://api.yoohoo.cn'
  return 'http://localhost:8000'
}

console.log('=========env=======', env, resolveAPIBaseURL())
export default {
  API_BASE_URL: resolveAPIBaseURL()
}
