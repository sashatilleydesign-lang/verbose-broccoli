type IconProps = { className?: string };

function FocusIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function WorkspaceIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
    </svg>
  );
}

function CaptureIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 12h4l2 3h6l2-3h4" />
      <path d="M5 12 3 19v0a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v0l-2-7" />
      <path d="M12 3v8M9 8l3 3 3-3" />
    </svg>
  );
}

function WeeklyIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M8 2.5v3M16 2.5v3M8 14l2.5 2.5L16 11" />
    </svg>
  );
}

function ScheduleIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M8 2.5v3M16 2.5v3M4 9.5h16M8 13.5h.01M12 13.5h.01M16 13.5h.01M8 17h.01M12 17h.01" />
    </svg>
  );
}

export type NavItem = { href: string; label: string; icon: (props: IconProps) => React.ReactElement };

export const NAV_ITEMS: NavItem[] = [
  { href: "/focus", label: "Focus", icon: FocusIcon },
  { href: "/clients", label: "Workspace", icon: WorkspaceIcon },
  { href: "/capture", label: "Capture", icon: CaptureIcon },
  { href: "/weekly", label: "Weekly Review", icon: WeeklyIcon },
  { href: "/schedule", label: "Schedule", icon: ScheduleIcon },
];
