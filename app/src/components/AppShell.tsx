import { NavTabs } from "@/components/NavTabs";
import { ModeToggle } from "@/components/ModeToggle";
import { logout } from "@/app/actions/auth";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-4xl px-5 pt-8 pb-16">
      <header className="mb-8 flex flex-wrap items-center gap-4">
        <p className="condensed text-xl whitespace-nowrap">
          Strobe<span className="text-accent">.</span>
        </p>
        <NavTabs />
        <div className="ml-auto flex items-center gap-4">
          <ModeToggle />
          <form action={logout}>
            <button
              type="submit"
              className="text-xs font-bold text-ink-dim underline decoration-line hover:text-accent"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>
      {children}
    </div>
  );
}
