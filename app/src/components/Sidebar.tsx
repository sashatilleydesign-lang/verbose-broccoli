"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/components/navItems";
import { ModeToggle } from "@/components/ModeToggle";
import { openQuickJump } from "@/components/quickJumpStore";
import { logout } from "@/app/actions/auth";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:sticky md:top-0 md:flex md:h-screen md:w-56 md:flex-none md:flex-col md:self-start md:overflow-y-auto md:border-r md:border-line md:bg-panel">
      <div className="px-5 py-5">
        <p className="text-[17px] font-semibold tracking-tight">
          Strobe<span className="text-accent">.</span>
        </p>
      </div>

      <div className="px-3 pb-4">
        <button
          type="button"
          onClick={openQuickJump}
          className="flex w-full items-center justify-between rounded-2xl border border-line bg-ground px-3 py-2 text-[12.5px] text-ink-dim hover:text-ink"
        >
          <span className="flex items-center gap-2">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <circle cx="5.5" cy="5.5" r="4" />
              <path d="M8.5 8.5 11 11" strokeLinecap="round" />
            </svg>
            Search
          </span>
          <span className="font-mono-strobe text-[10px] text-ink-dim">⌘K</span>
        </button>
      </div>

      <nav className="flex-1 space-y-0.5 px-3" aria-label="Screens">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                "flex items-center gap-2.5 rounded-2xl px-3 py-2 text-[13px] font-medium transition " +
                (active ? "bg-accent text-white" : "text-ink-dim hover:bg-ground hover:text-ink")
              }
            >
              <Icon className="h-4 w-4 flex-none" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-1 border-t border-line px-3 py-4">
        <ModeToggle />
        <form action={logout}>
          <button
            type="submit"
            className="w-full rounded-2xl px-3 py-2 text-left text-[12.5px] font-medium text-ink-dim hover:text-ink"
          >
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
