import { useMemo } from 'react'

import { createVariableColumns, type VariablesTableOptions } from '#react/variables/table/helpers'

export function useVariablesTable(options: VariablesTableOptions) {
  const columns = useMemo(() => createVariableColumns(options), [options])

  return { columns }
}
