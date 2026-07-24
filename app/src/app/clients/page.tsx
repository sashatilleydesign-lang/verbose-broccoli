import Link from "next/link";
import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";

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
              <span className="text-[15px] font-semibold">{client.name}</span>
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
