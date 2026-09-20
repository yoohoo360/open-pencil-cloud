import * as v from 'valibot'

import { toolNumber } from '#core/tools/input'

export const analysisLimitInput = v.optional(
  toolNumber(v.pipe(v.number(), v.description('Maximum results to return (default: 30)'))),
  30
)
