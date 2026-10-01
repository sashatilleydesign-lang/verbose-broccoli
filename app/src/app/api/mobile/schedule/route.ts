import { NextRequest, NextResponse } from "next/server";
import { requireMobileAuth } from "../_auth";
import { prisma } from "@/lib/prisma";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export async function GET(req: NextRequest) {
  try {
    const auth = await requireMobileAuth(req);
    if (auth instanceof NextResponse) return auth;

    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    const blocks = await prisma.scheduledBlock.findMany({
      where: { start: { gte: startOfWeek, lt: endOfWeek } },
      include: { task: { include: { project: { include: { client: true } } } } },
      orderBy: { start: "asc" },
    });

    const dayMap = new Map<string, { date: string; label: string; items: unknown[] }>();
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      dayMap.set(key, { date: key, label: DAY_LABELS[d.getDay()], items: [] });
    }

    for (const block of blocks) {
      const key = block.start.toISOString().slice(0, 10);
      const day = dayMap.get(key);
      if (!day) continue;
      day.items.push({
        id: block.id,
        title: block.task?.title ?? "Untitled",
        startHour: block.start.getHours(),
        durationMins: Math.round((block.end.getTime() - block.start.getTime()) / 60000),
        clientName: block.task?.project?.client?.name ?? null,
        clientColor: block.task?.project?.client?.colorTag ?? null,
      });
    }

    return NextResponse.json({
      today: now.toISOString().slice(0, 10),
      days: Array.from(dayMap.values()),
    });
  } catch (error) {
    console.error("[mobile/schedule]", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
