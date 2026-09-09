import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// One-time data backfill for §11.7: existing clients were all created
// before colorTag auto-assignment existed, so they all share the schema
// default. Safe to re-run — clients already spread across the palette
// keep their own color; only ones still sitting on the shared default get
// reassigned.
const CLIENT_COLOR_PALETTE = [
  "#ff4b1f",
  "#00c875",
  "#579bfc",
  "#a25ddc",
  "#e2445c",
  "#fdab3d",
  "#66ccff",
  "#ff158a",
];

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const clients = await prisma.client.findMany({ orderBy: { createdAt: "asc" } });
  for (let i = 0; i < clients.length; i++) {
    const color = CLIENT_COLOR_PALETTE[i % CLIENT_COLOR_PALETTE.length];
    if (clients[i].colorTag !== color) {
      await prisma.client.update({ where: { id: clients[i].id }, data: { colorTag: color } });
      console.log(`${clients[i].name}: ${clients[i].colorTag} -> ${color}`);
    }
  }
  await prisma.$disconnect();
}

main();
