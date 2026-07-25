import Link from "next/link";
import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/app/actions/entities";
import { ClientDot } from "@/components/ClientBadge";

export default async function ClientsPage() {
  await verifySession();

  const clients = await prisma.client.findMany({
    orderBy: { name: "asc" },
    include: {
      projects: { where: { status: "active" } },
      threads: { where: { status: "unprocessed" } },
    },
  });

  return (
    <AppShell>
      <div className="mb-6">
        <p className="mb-2 text-[11.5px] font-bold tracking-wide text-accent uppercase">Client workspace</p>
        <p className="max-w-[64ch] text-[15.5px] leading-relaxed text-ink-dim">
          Every email and every task for a client, in one scroll — not two tabs.
        </p>
      </div>

      <form action={createClient} className="mb-5 flex gap-2.5">
        <input
          name="name"
          type="text"
          required
          placeholder="New client name"
          aria-label="New client name"
          className="min-h-11 flex-1 rounded-md border border-line bg-panel px-3.5 py-2.5 text-[14px] text-ink outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
        <button
          type="submit"
          className="min-h-11 rounded-md bg-accent px-4 text-[13px] font-semibold text-ground hover:opacity-90"
        >
          Add
        </button>
      </form>

      {clients.length === 0 ? (
        <p className="text-[13.5px] text-ink-dim">No clients yet.</p>
      ) : (
        <div className="shadow-panel divide-y divide-line rounded-md border border-line bg-panel">
          {clients.map((client) => (
            <Link
              key={client.id}
              href={`/clients/${client.id}`}
              className="flex items-center justify-between gap-4 p-4 hover:bg-ground/40"
            >
              <span className="inline-flex items-center gap-2 text-[15px] font-semibold">
                <ClientDot colorTag={client.colorTag} />
                {client.name}
              </span>
              <span className="font-mono-strobe text-[12px] text-ink-dim">
                {client.projects.length} active · {client.threads.length} unprocessed
              </span>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
