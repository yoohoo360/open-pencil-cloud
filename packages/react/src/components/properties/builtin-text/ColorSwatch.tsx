import { Tip } from '#react/components/ui/Tip'

export function ColorSwatch({
  label,
  value,
  kind,
  onChange
}: {
  label: string
  value: string
  kind: 'text' | 'background'
  onChange: (value: string) => void
}) {
  return (
    <Tip label={label}>
      <label className="relative flex size-6 shrink-0 cursor-pointer items-center justify-center rounded border border-border bg-white">
        {kind === 'text' ? (
          <span className="flex flex-col items-center leading-none">
            <span className="text-[11px] font-bold text-[#1f1f1f]">A</span>
            <span className="mt-px h-[3px] w-3 rounded-[1px]" style={{ background: value }} />
          </span>
        ) : (
          <span
            className="rounded-[2px] px-0.5 text-[10px] font-bold text-[#1f1f1f]"
            style={{ background: value }}
          >
            A
          </span>
        )}
        <input
          type="color"
          aria-label={label}
          value={value}
          className="absolute inset-0 cursor-pointer opacity-0"
          onMouseDown={(event) => event.preventDefault()}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
    </Tip>
  )
}
