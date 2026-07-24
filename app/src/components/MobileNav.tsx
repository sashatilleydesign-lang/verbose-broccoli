"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/components/navItems";
import { ModeToggle } from "@/components/ModeToggle";
import { logout } from "@/app/actions/auth";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="md:hidden">
      <div className="flex items-center justify-between border-b border-line bg-panel px-4 py-3">
        <button
          type="button"
          aria-label="Open menu"
          onClick={() => setOpen(true)}
          className="rounded-md p-1.5 text-ink-dim hover:text-ink"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-6 w-6">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>
        <p className="text-base font-bold">
          Strobe<span className="text-accent">.</span>
        </p>
        <span className="w-6" aria-hidden="true" />
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/30"
          />
          <div className="shadow-panel relative flex h-full w-72 max-w-[80vw] flex-col bg-panel">
            <div className="flex items-center justify-between px-5 py-5">
              <p className="text-lg font-bold">
                Strobe<span className="text-accent">.</span>
              </p>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="rounded-md p-1.5 text-ink-dim hover:text-ink"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-5 w-5">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>

            <nav className="flex-1 space-y-1 px-3" aria-label="Screens">
              {NAV_ITEMS.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={
                      "flex items-center gap-3 rounded-md px-3 py-3 text-[15px] font-semibold transition " +
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
          </div>
        </div>
      ) : null}
    </div>
  );
}
