import { writeReferences } from '#authoring-reference/artifacts'

import { resolveWorkspaceRoot } from '@open-pencil/package-artifacts'

await writeReferences(await resolveWorkspaceRoot(process.cwd()))
