import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const medicines = await prisma.medicine.findMany({
      select: {
        id: true,
        tradeName: true,
        genericName: true,
        manufacturer: true,
        barcode: true,
        notes: true,
        archivedAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { tradeName: "asc" },
    });

    // Serialize dates for JSON
    const serialized = medicines.map((m) => ({
      ...m,
      archivedAt: m.archivedAt ? m.archivedAt.toISOString() : null,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    }));

    return NextResponse.json(serialized);
  } catch (error) {
    console.error("Failed to fetch medicines:", error);
    return NextResponse.json({ error: "Failed to fetch medicines" }, { status: 500 });
  }
}