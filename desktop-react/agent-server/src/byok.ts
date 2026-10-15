import { createMiddleware } from 'langchain'

import { chatModelFromConfig } from './model.ts'

/** Swap the placeholder model for the caller's Settings credentials each run. */
export const byokModelMiddleware = createMiddleware({
  name: 'OpenPencilByokModel',
  wrapModelCall: async (request, handler) => {
    const model = chatModelFromConfig({
      configurable: request.runtime?.configurable as Record<string, unknown>
    })
    return handler({ ...request, model })
  }
})
