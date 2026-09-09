// Client.colorTag (DESIGN.md §3) has existed since the schema's first
// draft — "color-coding reduces re-reading names" — but nothing rendered
// it until §11.7. One shared badge so every render site (Focus, Weekly,
// Schedule, Workspace) stays in sync instead of drifting separately.
export function ClientBadge({
  name,
  colorTag,
  className = "",
}: {
  name: string;
  colorTag: string;
  className?: string;
}) {
  return (
    <span
      className={`font-mono-strobe inline-flex items-center gap-1.5 rounded border border-line px-2 py-1 text-[11px] text-ink-dim ${className}`}
    >
      <span className="h-1.5 w-1.5 flex-none rounded-full" style={{ backgroundColor: colorTag }} aria-hidden="true" />
      [{name}]
    </span>
  );
}

export function ClientDot({ colorTag, className = "" }: { colorTag: string; className?: string }) {
  return (
    <span
      className={`inline-block h-2 w-2 flex-none rounded-full ${className}`}
      style={{ backgroundColor: colorTag }}
      aria-hidden="true"
    />
  );
}
