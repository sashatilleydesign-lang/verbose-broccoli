"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/focus", label: "Focus" },
  { href: "/clients", label: "Workspace" },
  { href: "/capture", label: "Capture" },
];

export function NavTabs() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-1.5" aria-label="Screens">
      {TABS.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(tab.href + "/");
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={
              "min-h-10 rounded-md border px-4 py-2.5 text-xs font-bold tracking-wide transition " +
              (active
                ? "border-accent bg-accent text-ground"
                : "border-line bg-panel text-ink-dim hover:text-ink hover:border-ink-dim")
            }
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
