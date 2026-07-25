import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { convertCaptureToTask } from "@/app/actions/captures";
import { DiscardCaptureButton } from "@/components/DiscardCaptureButton";

export default async function CapturePage() {
  await verifySession();
  const items = await prisma.captureItem.findMany({
    where: { triaged: false },
    orderBy: { createdAt: "desc" },
  });

  return (
    <AppShell>
      <div className="mb-6">
        <p className="mb-2 text-[11.5px] font-bold tracking-wide text-accent uppercase">Capture</p>
        <p className="max-w-[64ch] text-[15.5px] leading-relaxed text-ink-dim">
          Everything waiting for a decision — no rush. Drop new things in from anywhere with the{" "}
          <span className="font-bold text-ink">+</span> button, bottom-right.
        </p>
      </div>

      <div className="shadow-panel rounded-md border border-line bg-panel p-6">
        {items.length === 0 ? (
          <p className="text-[13.5px] text-ink-dim">Nothing waiting for a decision.</p>
        ) : (
          <>
            <p className="mb-4 text-[13.5px] text-ink-dim">
              {items.length} thing{items.length === 1 ? "" : "s"} waiting.
            </p>

            <ul className="space-y-2.5">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-dashed border-line bg-ground px-3.5 py-2.5"
                >
                  <span className="text-[14px] text-ink-dim">{item.text}</span>
                  <span className="flex gap-4">
                    <form action={convertCaptureToTask.bind(null, item.id)}>
                      <button type="submit" className="border-b border-line pb-0.5 text-[12.5px] font-bold text-ink-dim hover:border-accent hover:text-accent">
                        Turn into task
                      </button>
                    </form>
                    <DiscardCaptureButton item={item} />
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </AppShell>
  );
}
