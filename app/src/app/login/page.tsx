"use client";

import { useActionState } from "react";
import { login } from "@/app/actions/auth";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, undefined);

  return (
    <main className="flex min-h-screen items-center justify-center bg-ground px-5">
      <form action={formAction} className="w-full max-w-sm rounded-md border border-line bg-panel p-7 shadow-panel">
        <p className="text-xl font-bold">
          Strobe<span className="text-accent">.</span>
        </p>
        <p className="mt-2 mb-6 text-sm text-ink-dim">Sign in to your console.</p>

        <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink-dim" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoFocus
          className="mb-4 w-full rounded-md border border-line bg-ground px-4 py-3 text-[15px] text-ink outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />

        <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink-dim" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          className="mb-5 w-full rounded-md border border-line bg-ground px-4 py-3 text-[15px] text-ink outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />

        {state?.error ? <p className="mb-4 text-sm text-accent">{state.error}</p> : null}

        <button
          type="submit"
          disabled={pending}
          className="min-h-11 w-full rounded-md bg-accent font-semibold text-ground transition hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
