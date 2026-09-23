import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyApiAuth } from "@/lib/auth/api-auth";

// منع Next.js من محاولة تخزين هذا الـ API كملف Static أثناء البناء
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // 1. التحقق من المصادقة (Authentication)
  const user = await verifyApiAuth(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor");
    const take: number = 1000; // جلب 1000 سجل فقط في كل طلب

    const medicines = await prisma.medicine.findMany({
      take,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { id: "asc" },
      select: {
        id: true,
        tradeName: true,
        genericName: true,
        manufacturer: true,
        barcode: true,
        notes: true,
        strength: true,
        dosageForm: true,
        route: true,
        drugClass: true,
        category: true,
        isCatalog: true,
        archivedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const serialized = medicines.map((m) => ({
      ...m,
      archivedAt: m.archivedAt ? m.archivedAt.toISOString() : null,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    }));

    const nextCursor = medicines.length === take ? medicines[medicines.length - 1].id : null;

    return NextResponse.json({
      items: serialized,
      nextCursor,
    });
  } catch (error) {
    console.error("Failed to fetch medicines:", error);
    return NextResponse.json({ error: "Failed to fetch medicines" }, { status: 500 });
  }
}