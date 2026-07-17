import { computed } from '#react/internal/reactive'
import { createVariableColumns, type VariablesTableOptions } from '#react/variables/table/helpers'

export function useVariablesTable(options: VariablesTableOptions) {
  const columns = computed(() => createVariableColumns(options))

  return { columns }
}
