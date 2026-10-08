import { markdownHostedComponent } from '#react/hosted-components/markdown/plugin'
import { getHostedComponent, registerHostedComponent } from '#react/hosted-components/registry'

/** Register first-party hosted components (idempotent). */
export function bootstrapHostedComponents(): void {
  if (!getHostedComponent(markdownHostedComponent.id)) {
    registerHostedComponent(markdownHostedComponent)
  }
}
