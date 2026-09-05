import type { IncomingMessage } from 'node:http'

import type { DevMCPConfiguration } from '../../../src/app/automation/mcp/dev-control'

interface AutomationEnvironmentOptions {
  authToken: string | null
  baseEnv: NodeJS.ProcessEnv
  configuration: DevMCPConfiguration
  corsOrigin: string
  discoveryPath: string | null
  httpPort: number
  socketPath: string | null
}

export function createAutomationEnvironment(
  options: AutomationEnvironmentOptions
): NodeJS.ProcessEnv {
  const { authToken, baseEnv, configuration, corsOrigin, discoveryPath, httpPort, socketPath } =
    options
  const childEnv = { ...baseEnv }
  delete childEnv.OPENPENCIL_MCP_SOCKET
  delete childEnv.OPENPENCIL_MCP_AUTH_TOKEN
  const environment: NodeJS.ProcessEnv = {
    ...childEnv,
    PORT: String(httpPort),
    OPENPENCIL_MCP_TCP: '1',
    OPENPENCIL_MCP_AUTH_TOKEN: configuration.authenticationEnabled ? (authToken ?? '') : '',
    OPENPENCIL_MCP_CORS_ORIGIN: corsOrigin,
    OPENPENCIL_MCP_ROOT: configuration.rootDirectory.trim() || process.cwd(),
    OPENPENCIL_MCP_DISABLED_TOOLS: configuration.disabledTools.join(',')
  }
  if (socketPath) environment.OPENPENCIL_MCP_SOCKET = socketPath
  if (discoveryPath) environment.OPENPENCIL_MCP_DISCOVERY_PATH = discoveryPath
  return environment
}

const MAX_CONFIGURATION_BYTES = 70_000

type DevMCPConfigurationErrorStatus = 400 | 413

class DevMCPConfigurationRequestError extends Error {
  constructor(
    message: string,
    readonly statusCode: DevMCPConfigurationErrorStatus,
    options?: ErrorOptions
  ) {
    super(message, options)
    this.name = 'DevMCPConfigurationRequestError'
  }
}

class DevMCPConfigurationTooLargeError extends DevMCPConfigurationRequestError {
  constructor() {
    super('Request body is too large', 413)
    this.name = 'DevMCPConfigurationTooLargeError'
  }
}

class DevMCPConfigurationSyntaxError extends DevMCPConfigurationRequestError {
  constructor(cause: unknown) {
    super('Malformed JSON configuration', 400, { cause })
    this.name = 'DevMCPConfigurationSyntaxError'
  }
}

export function devMCPConfigurationErrorStatus(error: unknown): 400 | 413 | 500 {
  return error instanceof DevMCPConfigurationRequestError ? error.statusCode : 500
}

export async function readDevMCPConfiguration(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  let byteLength = 0
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    byteLength += buffer.byteLength
    if (byteLength > MAX_CONFIGURATION_BYTES) throw new DevMCPConfigurationTooLargeError()
    chunks.push(buffer)
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch (error) {
    throw new DevMCPConfigurationSyntaxError(error)
  }
}
