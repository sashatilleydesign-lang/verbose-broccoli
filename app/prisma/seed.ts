import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
const daysFromNow = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

async function main() {
  // Wipe existing data (dev-only seed, safe to re-run).
  await prisma.taskEmailLink.deleteMany();
  await prisma.emailMessage.deleteMany();
  await prisma.emailThread.deleteMany();
  await prisma.captureItem.deleteMany();
  await prisma.task.deleteMany();
  await prisma.project.deleteMany();
  await prisma.client.deleteMany();

  const lumen = await prisma.client.create({ data: { name: "Lumen Skincare" } });
  const nova = await prisma.client.create({ data: { name: "Nova Coffee Co." } });
  const bramble = await prisma.client.create({ data: { name: "Bramble & Co." } });
  await prisma.client.create({ data: { name: "Kite Studio" } });

  // --- Lumen Skincare: the 10-ad batch, extracted from a brief ---
  const lumenThread = await prisma.emailThread.create({
    data: {
      clientId: lumen.id,
      subject: "10 concepts for the summer push — brief + brand deck attached",
      status: "triaged",
      messages: {
        create: [
          {
            fromName: "Priya (Lumen Skincare)",
            fromEmail: "priya@lumenskincare.com",
            snippet: "Full brief PDF and reference images attached, deadline noted as Aug 4.",
            body: "Hey! Attaching the brief for 10 ad concepts for the summer push, plus the brand deck for reference. Deadline is Aug 4 — let us know if that's workable.",
            receivedAt: daysAgo(6),
            unread: false,
          },
          {
            fromName: "Priya (Lumen Skincare)",
            fromEmail: "priya@lumenskincare.com",
            snippet: "Loving concepts 1–2! Keep this direction going.",
            body: "Just saw the first two concepts — loving the direction, please keep going with the rest of the batch in the same style.",
            receivedAt: daysAgo(3),
            unread: false,
          },
        ],
      },
    },
  });

  const lumenProject = await prisma.project.create({
    data: {
      clientId: lumen.id,
      name: "10 Ads — Lumen Skincare",
      status: "active",
      dueDate: daysFromNow(12),
    },
  });

  const lumenTaskTitles = [
    "Morning ritual — before/after glow",
    "Ingredient spotlight — niacinamide",
    "Night routine — layering steps",
    "Founder story — why we started",
    "Customer testimonial — Sarah K.",
    "Skin type quiz — CTA",
    "Texture close-up — serum drop",
    "Bundle offer — routine trio",
    "Behind the scenes — studio shoot",
    "Summer glow — final hero shot",
  ];

  let pinnedNextTaskId: string | null = null;
  for (let i = 0; i < lumenTaskTitles.length; i++) {
    const batchIndex = i + 1;
    const isDone = batchIndex <= 2;
    const isNext = batchIndex === 3;
    const task = await prisma.task.create({
      data: {
        title: `Ad concept — batch ${batchIndex} of 10 (${lumenTaskTitles[i]})`,
        projectId: lumenProject.id,
        batchIndex,
        batchTotal: 10,
        energy: "low",
        context: "deep_work",
        estimatedMinutes: 35,
        state: isDone ? "done" : isNext ? "next" : "later",
        completedAt: isDone ? daysAgo(6 - batchIndex) : null,
      },
    });
    if (isNext) pinnedNextTaskId = task.id;
    await prisma.taskEmailLink.create({
      data: { taskId: task.id, threadId: lumenThread.id },
    });
  }

  if (pinnedNextTaskId) {
    await prisma.project.update({
      where: { id: lumenProject.id },
      data: { nextActionId: pinnedNextTaskId },
    });
  }

  // --- Nova Coffee Co.: an unprocessed email, no task yet ---
  await prisma.emailThread.create({
    data: {
      clientId: nova.id,
      subject: "Following up on logo revisions",
      status: "unprocessed",
      messages: {
        create: [
          {
            fromName: "Jordan (Nova Coffee Co.)",
            fromEmail: "jordan@novacoffee.co",
            snippet: "Just checking in on the revised wordmark — any update on timing?",
            body: "Hi! Just checking in on the revised wordmark — any update on timing? No rush, just want to plan around it.",
            receivedAt: daysAgo(2),
            unread: true,
          },
        ],
      },
    },
  });

  // --- Bramble & Co.: a hard-deadline task due tomorrow ---
  const brambleProject = await prisma.project.create({
    data: {
      clientId: bramble.id,
      name: "Media Kit",
      status: "active",
      dueDate: daysFromNow(1),
    },
  });
  const invoiceTask = await prisma.task.create({
    data: {
      title: "Send invoice — media kit project",
      projectId: brambleProject.id,
      state: "next",
      deadlineType: "hard",
      dueDate: daysFromNow(1),
    },
  });
  await prisma.project.update({
    where: { id: brambleProject.id },
    data: { nextActionId: invoiceTask.id },
  });

  // A second Bramble project with no next action set — Weekly Review fodder later.
  await prisma.project.create({
    data: { clientId: bramble.id, name: "Website Refresh", status: "active" },
  });

  // --- Capture inbox: raw, untriaged ---
  await prisma.captureItem.createMany({
    data: [
      { text: "call Kite Studio about renewal" },
      { text: "ask Bramble for high-res logo files" },
      { text: "idea: offer a retainer tier for regulars" },
    ],
  });

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
