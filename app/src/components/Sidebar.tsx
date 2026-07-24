"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/components/navItems";
import { ModeToggle } from "@/components/ModeToggle";
import { logout } from "@/app/actions/auth";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-60 md:flex-none md:flex-col md:border-r md:border-line md:bg-panel">
      <div className="px-5 py-6">
        <p className="text-lg font-bold">
          Strobe<span className="text-accent">.</span>
        </p>
      </div>

      <nav className="flex-1 space-y-1 px-3" aria-label="Screens">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-[13.5px] font-semibold transition " +
                (active ? "bg-accent-dim text-accent" : "text-ink-dim hover:bg-ground hover:text-ink")
              }
            >
              <Icon className="h-5 w-5 flex-none" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-2 border-t border-line px-3 py-4">
        <ModeToggle />
        <form action={logout}>
          <button
            type="submit"
            className="w-full rounded-md px-3 py-2 text-left text-[13px] font-semibold text-ink-dim hover:text-ink"
          >
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
