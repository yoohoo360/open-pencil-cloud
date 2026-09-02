import { ProviderSelect } from '@/components/chat/ProviderSelect/ProviderSelect'

interface ProviderSelectFieldProps {
  'data-test-id'?: string
}

export function ProviderSelectField({ 'data-test-id': testId }: ProviderSelectFieldProps) {
  return (
    <div data-test-id={testId}>
      <ProviderSelect
        ui={{
          trigger: 'w-full justify-between rounded border border-border bg-input px-2.5 py-1.5 text-xs text-surface',
          item: 'rounded px-2 py-1.5 text-[11px]'
        }}
      />
    </div>
  )
}
