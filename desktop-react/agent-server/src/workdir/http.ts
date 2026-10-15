import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'

import { normalizeAgentEnvironments, SKILL_AGENT_ENVIRONMENTS } from './agent-environments.ts'
import { WorkdirStore } from './store.ts'

export const DEFAULT_WORKDIR_API_PORT = 2025

export function workdirApiPort(agentPort?: number): number {
  const raw = process.env.OPENPENCIL_WORKDIR_API_PORT
  if (raw) {
    const port = Number(raw)
    if (!Number.isInteger(port) || port < 1024 || port > 65535) {
      throw new Error('OPENPENCIL_WORKDIR_API_PORT must be an integer between 1024 and 65535')
    }
    return port
  }
  if (typeof agentPort === 'number') return agentPort + 1
  return DEFAULT_WORKDIR_API_PORT
}

export function workdirApiBaseUrl(port = workdirApiPort()): string {
  return `http://127.0.0.1:${port}`
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, X-Skill-Name, X-Skill-Key, X-Skill-Agent-Environments'
  })
  res.end(payload)
}

function sendNoContent(res: ServerResponse) {
  res.writeHead(204, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, X-Skill-Name, X-Skill-Key, X-Skill-Agent-Environments'
  })
  res.end()
}

async function readBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const buf = await readBody(req)
  if (buf.byteLength === 0) return null
  return JSON.parse(buf.toString('utf8')) as unknown
}

function match(
  pathname: string,
  pattern: string
): Record<string, string> | null {
  const pathParts = pathname.split('/').filter(Boolean)
  const patternParts = pattern.split('/').filter(Boolean)
  if (pathParts.length !== patternParts.length) return null
  const params: Record<string, string> = {}
  for (let i = 0; i < patternParts.length; i++) {
    const expected = patternParts[i]!
    const actual = pathParts[i]!
    if (expected.startsWith(':')) {
      params[expected.slice(1)] = decodeURIComponent(actual)
      continue
    }
    if (expected !== actual) return null
  }
  return params
}

function parseAgentEnvHeader(value: string | string[] | undefined) {
  if (typeof value !== 'string' || !value.trim()) return undefined
  return normalizeAgentEnvironments(value.split(',').map((part) => part.trim()))
}

async function handle(
  store: WorkdirStore,
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const method = req.method ?? 'GET'
  const url = new URL(req.url ?? '/', 'http://127.0.0.1')
  const path = url.pathname

  if (method === 'OPTIONS') {
    sendNoContent(res)
    return
  }

  if (method === 'GET' && path === '/ok') {
    sendJson(res, 200, { ok: true })
    return
  }

  if (method === 'GET' && path === '/agent-environments') {
    sendJson(res, 200, { environments: SKILL_AGENT_ENVIRONMENTS })
    return
  }

  if (method === 'GET' && path === '/workdirs') {
    sendJson(res, 200, store.list())
    return
  }

  if (method === 'POST' && path === '/workdirs') {
    const body = (await readJson(req)) as {
      path?: string
      name?: string
      agentEnvironments?: string[]
    } | null
    const projectPath = typeof body?.path === 'string' ? body.path : ''
    if (!projectPath.trim()) {
      sendJson(res, 400, { error: 'path is required' })
      return
    }
    const created = store.create({
      path: projectPath,
      name: typeof body?.name === 'string' ? body.name : undefined,
      agentEnvironments: normalizeAgentEnvironments(body?.agentEnvironments)
    })
    sendJson(res, 201, created)
    return
  }

  if (method === 'GET' && path === '/workdirs/active/skills/packages') {
    sendJson(res, 200, store.loadActiveEnabledPackages())
    return
  }

  {
    const params = match(path, '/workdirs/:id/activate')
    if (params && method === 'POST') {
      sendJson(res, 200, store.activate(params.id!))
      return
    }
  }

  {
    const params = match(path, '/workdirs/:id/skills/packages')
    if (params && method === 'GET') {
      sendJson(res, 200, {
        workdirId: params.id,
        packages: store.loadEnabledPackages(params.id!)
      })
      return
    }
  }

  {
    const params = match(path, '/workdirs/:id/skills/:key')
    if (params && method === 'PUT') {
      const zip = new Uint8Array(await readBody(req))
      const nameHeader = req.headers['x-skill-name']
      const name = typeof nameHeader === 'string' ? nameHeader : undefined
      const agentEnvironments = parseAgentEnvHeader(req.headers['x-skill-agent-environments'])
      const skill = store.putSkill(params.id!, params.key!, zip, { name, agentEnvironments })
      sendJson(res, 200, skill)
      return
    }
    if (params && method === 'PATCH') {
      const body = (await readJson(req)) as { enabled?: boolean } | null
      if (typeof body?.enabled !== 'boolean') {
        sendJson(res, 400, { error: 'enabled boolean required' })
        return
      }
      const skill = store.setSkillEnabled(params.id!, params.key!, body.enabled)
      sendJson(res, 200, skill)
      return
    }
    if (params && method === 'DELETE') {
      if (!store.removeSkill(params.id!, params.key!)) {
        sendJson(res, 404, { error: 'Skill not found in workdir' })
        return
      }
      sendNoContent(res)
      return
    }
  }

  {
    const params = match(path, '/workdirs/:id')
    if (params && method === 'GET') {
      const workdir = store.readWorkdir(params.id!)
      if (!workdir) {
        sendJson(res, 404, { error: 'Workdir not found' })
        return
      }
      sendJson(res, 200, workdir)
      return
    }
    if (params && method === 'PATCH') {
      const body = (await readJson(req)) as {
        name?: string
        agentEnvironments?: string[]
      } | null
      const updated = store.update(params.id!, {
        name: typeof body?.name === 'string' ? body.name : undefined,
        agentEnvironments: Array.isArray(body?.agentEnvironments)
          ? normalizeAgentEnvironments(body.agentEnvironments)
          : undefined
      })
      sendJson(res, 200, updated)
      return
    }
    if (params && method === 'DELETE') {
      if (!store.remove(params.id!)) {
        sendJson(res, 404, { error: 'Workdir not found' })
        return
      }
      sendNoContent(res)
      return
    }
  }

  sendJson(res, 404, { error: 'Not found' })
}

export type WorkdirApiHandle = {
  port: number
  baseUrl: string
  stop: () => void
}

export function startWorkdirApi(options?: {
  port?: number
  root?: string
  onWarn?: (line: string) => void
}): WorkdirApiHandle {
  const port = options?.port ?? workdirApiPort()
  const store = new WorkdirStore(options?.root)
  const server: Server = createServer((req, res) => {
    void handle(store, req, res).catch((error) => {
      const message = error instanceof Error ? error.message : String(error)
      options?.onWarn?.(message)
      if (!res.headersSent) sendJson(res, 500, { error: message })
    })
  })

  server.listen(port, '127.0.0.1')

  const stop = () => {
    server.close()
  }
  process.once('exit', stop)
  process.once('SIGINT', stop)
  process.once('SIGTERM', stop)

  return { port, baseUrl: workdirApiBaseUrl(port), stop }
}
