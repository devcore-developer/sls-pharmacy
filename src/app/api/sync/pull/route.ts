import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const lastSync = searchParams.get("lastSync") ? new Date(searchParams.get("lastSync")!) : new Date(0);

    const [batches, movements, cartons] = await Promise.all([
      prisma.batch.findMany({ where: { updatedAt: { gt: lastSync } }, take: 500 }),
      prisma.stockMovement.findMany({ where: { createdAt: { gt: lastSync } }, take: 500 }),
      prisma.carton.findMany({ where: { updatedAt: { gt: lastSync } }, take: 200 }),
    ]);

    return NextResponse.json({ batches, movements, cartons });
  } catch (error) {
    console.error("Pull sync error:", error);
    return NextResponse.json({ error: "Failed to pull updates" }, { status: 500 });
  }
}