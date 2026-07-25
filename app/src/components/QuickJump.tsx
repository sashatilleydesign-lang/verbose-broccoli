"use client";

import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import Link from "next/link";
import { subscribe, getSnapshot, getServerSnapshot, closeQuickJump, toggleQuickJump } from "@/components/quickJumpStore";
import { searchAll, getCurrentNextTask, type SearchResults } from "@/app/actions/search";
import { completeTask } from "@/app/actions/tasks";

const EMPTY_RESULTS: SearchResults = { clients: [], projects: [], tasks: [], threads: [] };

const QUICK_LINKS = [
  { href: "/focus", label: "Open Focus" },
  { href: "/clients", label: "Open Workspace" },
  { href: "/capture", label: "Open Capture" },
  { href: "/weekly", label: "Open Weekly Review" },
  { href: "/schedule", label: "Open Schedule" },
];

function resultHref(clientId: string | null) {
  return clientId ? `/clients/${clientId}` : "/clients";
}

export function QuickJump() {
  const isOpen = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>(EMPTY_RESULTS);
  const [nextTask, setNextTask] = useState<{ id: string; title: string } | null>(null);
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  // Global Cmd+K / Ctrl+K toggle, and Escape to close while open.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        toggleQuickJump();
      } else if (e.key === "Escape") {
        handleClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    inputRef.current?.focus();
    getCurrentNextTask().then(setNextTask);
  }, [isOpen]);

  useEffect(() => {
    // Stale results from a shorter previous query are never rendered
    // while hasQuery is false, so nothing needs resetting here — just
    // skip scheduling a search.
    if (query.trim().length < 2) return;
    const handle = setTimeout(() => {
      startTransition(() => {
        searchAll(query).then(setResults);
      });
    }, 200);
    return () => clearTimeout(handle);
  }, [query]);

  // Closing always resets local state too, so the palette starts fresh
  // next time — done here, in the event handler, rather than in an
  // effect keyed on isOpen (which would mean calling setState
  // synchronously inside the effect body).
  function handleClose() {
    setQuery("");
    setResults(EMPTY_RESULTS);
    closeQuickJump();
  }

  // For clicks on a <Link>: closing synchronously in the same click
  // would unmount the palette (and the very link that was clicked)
  // before Next's client-side navigation gets a chance to run, aborting
  // it — the URL never actually changes. Deferring one tick lets
  // navigation happen first.
  function handleNavigate() {
    setTimeout(handleClose, 0);
  }

  if (!isOpen) return null;

  const hasQuery = query.trim().length >= 2;
  const hasResults =
    results.clients.length > 0 || results.projects.length > 0 || results.tasks.length > 0 || results.threads.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh]">
      <button
        type="button"
        aria-label="Close quick jump"
        onClick={handleClose}
        className="absolute inset-0 bg-black/30"
      />
      <div className="shadow-panel relative w-full max-w-lg overflow-hidden rounded-md border border-line bg-panel">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Jump to a client, project, task, or email…"
          aria-label="Quick jump search"
          className="w-full border-b border-line bg-transparent px-4 py-3.5 text-[15px] text-ink outline-none placeholder:text-ink-dim"
        />

        <div className="max-h-[50vh] overflow-y-auto p-2">
          {hasQuery ? (
            hasResults ? (
              <>
                <ResultGroup title="Clients" items={results.clients} onNavigate={handleNavigate} />
                <ResultGroup title="Projects" items={results.projects} onNavigate={handleNavigate} />
                <ResultGroup title="Tasks" items={results.tasks} onNavigate={handleNavigate} />
                <ResultGroup title="Email threads" items={results.threads} onNavigate={handleNavigate} />
              </>
            ) : (
              <p className="px-2.5 py-3 text-[13px] text-ink-dim">Nothing matches &ldquo;{query}&rdquo;.</p>
            )
          ) : (
            <div>
              <p className="px-2.5 pt-1.5 pb-1 text-[11px] font-bold tracking-wide text-ink-dim uppercase">Go to</p>
              {QUICK_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={handleNavigate}
                  className="block rounded-md px-2.5 py-2 text-[14px] font-medium text-ink hover:bg-ground"
                >
                  {link.label}
                </Link>
              ))}
              {nextTask ? (
                <button
                  type="button"
                  onClick={() => {
                    startTransition(() => completeTask(nextTask.id));
                    handleClose();
                  }}
                  className="block w-full rounded-md px-2.5 py-2 text-left text-[14px] font-medium text-ink hover:bg-ground"
                >
                  Mark &ldquo;{nextTask.title}&rdquo; done
                </button>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultGroup({
  title,
  items,
  onNavigate,
}: {
  title: string;
  items: SearchResults["clients"];
  onNavigate: () => void;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="px-2.5 pt-1.5 pb-1 text-[11px] font-bold tracking-wide text-ink-dim uppercase">{title}</p>
      {items.map((item) => (
        <Link
          key={item.id}
          href={resultHref(item.clientId)}
          onClick={onNavigate}
          className="block truncate rounded-md px-2.5 py-2 text-[14px] font-medium text-ink hover:bg-ground"
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
