"use client";

import { useState, useTransition } from "react";
import { updateClientProfile } from "@/app/actions/entities";

type ClientProfile = {
  contactEmail: string | null;
  contactPhone: string | null;
  rate: string | null;
  notes: string | null;
};

// Client profile (§11.10) — contact info, rate, and relationship notes,
// merged directly into the Workspace page rather than a separate surface.
// A CRM-lite record you check occasionally, not something you edit often,
// so it starts collapsed to a compact read view rather than always-open
// form fields competing with the timeline for attention.
export function ClientProfileCard({ clientId, profile }: { clientId: string; profile: ClientProfile }) {
  const hasProfile = profile.contactEmail || profile.contactPhone || profile.rate || profile.notes;
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!editing) {
    return (
      <div className="mb-4 text-[13.5px]">
        {hasProfile ? (
          <div className="flex flex-wrap items-start gap-x-2 gap-y-1 text-ink-dim">
            <span className="flex flex-wrap items-center gap-x-2">
              {profile.contactEmail ? <span>{profile.contactEmail}</span> : null}
              {profile.contactPhone ? <span>· {profile.contactPhone}</span> : null}
              {profile.rate ? <span>· {profile.rate}</span> : null}
            </span>
            {profile.notes ? <span className="w-full text-ink-dim">{profile.notes}</span> : null}
            <button type="button" onClick={() => setEditing(true)} className="font-semibold hover:text-accent">
              Edit
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setEditing(true)} className="text-ink-dim hover:text-accent">
            + Add contact info, rate, or notes
          </button>
        )}
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        startTransition(async () => {
          await updateClientProfile(clientId, formData);
          setEditing(false);
        });
      }}
      className="mb-4 flex flex-wrap items-end gap-2.5 rounded-md border border-line bg-ground p-3"
    >
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-bold text-ink-dim uppercase" htmlFor="cp-email">
          Email
        </label>
        <input
          id="cp-email"
          name="contactEmail"
          type="email"
          defaultValue={profile.contactEmail ?? ""}
          className="min-h-9 rounded-md border border-line bg-panel px-2 py-1.5 text-[13px] text-ink"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-bold text-ink-dim uppercase" htmlFor="cp-phone">
          Phone
        </label>
        <input
          id="cp-phone"
          name="contactPhone"
          type="text"
          defaultValue={profile.contactPhone ?? ""}
          className="min-h-9 rounded-md border border-line bg-panel px-2 py-1.5 text-[13px] text-ink"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-bold text-ink-dim uppercase" htmlFor="cp-rate">
          Rate
        </label>
        <input
          id="cp-rate"
          name="rate"
          type="text"
          placeholder="$120/hr"
          defaultValue={profile.rate ?? ""}
          className="min-h-9 w-28 rounded-md border border-line bg-panel px-2 py-1.5 text-[13px] text-ink"
        />
      </div>
      <div className="flex min-w-[220px] flex-1 flex-col gap-1">
        <label className="text-[11px] font-bold text-ink-dim uppercase" htmlFor="cp-notes">
          Notes
        </label>
        <input
          id="cp-notes"
          name="notes"
          type="text"
          placeholder="Relationship notes…"
          defaultValue={profile.notes ?? ""}
          className="min-h-9 w-full rounded-md border border-line bg-panel px-2 py-1.5 text-[13px] text-ink"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="min-h-9 rounded-md bg-accent px-3.5 text-[12.5px] font-semibold text-ground hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save"}
      </button>
      <button
        type="button"
        onClick={() => setEditing(false)}
        className="min-h-9 rounded-md border border-line px-3 text-[12.5px] font-semibold text-ink-dim hover:text-ink"
      >
        Cancel
      </button>
    </form>
  );
}
