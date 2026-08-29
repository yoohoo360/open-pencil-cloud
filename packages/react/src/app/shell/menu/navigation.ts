import type { NavigateFunction } from 'react-router-dom'

export function openStorageWorkspace(navigate: NavigateFunction): void {
  void navigate('/dashboard')
}
