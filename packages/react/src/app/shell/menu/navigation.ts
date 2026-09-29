import type { NavigateFunction } from 'react-router-dom'

import { confirmLeaveDespiteBusy } from '#react/app/document/busy/leave'

export function openStorageWorkspace(navigate: NavigateFunction): void {
  if (!confirmLeaveDespiteBusy()) return
  void navigate('/dashboard')
}
