import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyApiAuth } from "@/lib/auth/api-auth";

// GET: Pull Sync (Fetch server changes)
export async function GET(req: NextRequest) {
  // 1. التحقق من المصادقة (Authentication)
  const user = await verifyApiAuth(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const lastSync = searchParams.get("lastSync") ? new Date(searchParams.get("lastSync") as string) : new Date(0);
    const limit = 500;

    // Keyset pagination cursors (ID-based)
    const medCursor = searchParams.get("medCursor") || "";
    const batCursor = searchParams.get("batCursor") || "";
    const movCursor = searchParams.get("movCursor") || "";
    const carCursor = searchParams.get("carCursor") || "";

    // 2. منطق المزامنة التزايدية الصحيح
    // يجلب السجلات التي تم تعديلها بعد lastSync، وكذلك معرفها (id) أكبر من الـ cursor الحالي
    const [medicines, batches, stockMovements, cartons] = await Promise.all([
      prisma.medicine.findMany({
        take: limit,
        orderBy: [{ updatedAt: "asc" }, { id: "asc" }],
        where: {
          AND: [
            { updatedAt: { gte: lastSync } },
            ...(medCursor ? [{ id: { gt: medCursor } }] : [])
          ]
        }
      }),
      prisma.batch.findMany({
        take: limit,
        orderBy: [{ updatedAt: "asc" }, { id: "asc" }],
        where: {
          AND: [
            { updatedAt: { gte: lastSync } },
            ...(batCursor ? [{ id: { gt: batCursor } }] : [])
          ]
        }
      }),
      prisma.stockMovement.findMany({
        take: limit,
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        where: {
          AND: [
            { createdAt: { gte: lastSync } },
            ...(movCursor ? [{ id: { gt: movCursor } }] : [])
          ]
        }
      }),
      prisma.carton.findMany({
        take: limit,
        orderBy: [{ updatedAt: "asc" }, { id: "asc" }],
        where: {
          AND: [
            { updatedAt: { gte: lastSync } },
            ...(carCursor ? [{ id: { gt: carCursor } }] : [])
          ]
        }
      }),
    ]);

    return NextResponse.json({
      serverTime: new Date().toISOString(),
      medicines,
      batches,
      stockMovements,
      cartons,
      nextCursors: {
        medicines: medicines.length > 0 ? medicines[medicines.length - 1].id : medCursor,
        batches: batches.length > 0 ? batches[batches.length - 1].id : batCursor,
        stockMovements: stockMovements.length > 0 ? stockMovements[stockMovements.length - 1].id : movCursor,
        cartons: cartons.length > 0 ? cartons[cartons.length - 1].id : carCursor,
      },
      hasMore: medicines.length === limit || batches.length === limit || stockMovements.length === limit || cartons.length === limit
    });
  } catch (error) {
    console.error("Pull sync error:", error);
    return NextResponse.json({ error: "Failed to pull updates" }, { status: 500 });
  }
}

// POST: Push Sync (Send local changes to server)
export async function POST(request: NextRequest) {
  // 1. التحقق من المصادقة (Authentication)
  const user = await verifyApiAuth(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    // لا نثق بـ userId القادم من العميل، نستخدم user.id من الجلسة
    const { operationId, deviceId, operationType, entityType, entityId, payload } = body;

    if (!operationId || !entityType || !operationType) {
      return NextResponse.json({ status: "ERROR", message: "Missing required fields." }, { status: 400 });
    }

    // Idempotency: check if already processed
    const existing = await prisma.syncOperation.findUnique({
      where: { operationId },
    });

    if (existing) {
      return NextResponse.json({ status: "SYNCED", message: "Already processed." });
    }

    // Dispatch to entity handler FIRST
    try {
      await dispatchOperation(entityType, operationType, entityId, payload, user.id);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Processing failed";
      return NextResponse.json({ status: "ERROR", message }, { status: 500 });
    }

    // Mark as synced ONLY after successful dispatch
    await prisma.syncOperation.create({
      data: {
        operationId,
        deviceId: deviceId || "unknown",
        userId: user.id, // استخدام معرف المستخدم الموثوق
        entityType,
        entityId,
        operationType,
        payload: payload || {},
        syncStatus: "synced",
        syncedAt: new Date(),
      },
    });

    return NextResponse.json({ status: "SYNCED", message: "Operation processed." });
  } catch (err: unknown) {
    console.error("Sync error:", err);
    return NextResponse.json({ status: "ERROR", message: "Internal server error." }, { status: 500 });
  }
}

async function dispatchOperation(
  entityType: string,
  operationType: string,
  entityId: string,
  payload: Record<string, unknown>,
  userId: string
) {
  const p = payload;

  switch (entityType) {
    case "medicine":
      if (operationType === "create" || operationType === "update") {
        await prisma.medicine.upsert({
          where: { id: entityId },
          create: {
            id: entityId,
            tradeName: (p.tradeName as string) || "",
            genericName: (p.genericName as string) || "",
            manufacturer: (p.manufacturer as string) || null,
            barcode: (p.barcode as string) || null,
            notes: (p.notes as string) || null,
            strength: (p.strength as string) || null,
            dosageForm: (p.dosageForm as string) || null,
            route: (p.route as string) || null,
            drugClass: (p.drugClass as string) || null,
            category: (p.category as string) || null,
          },
          update: {
            tradeName: (p.tradeName as string) || undefined,
            genericName: (p.genericName as string) || undefined,
            manufacturer: (p.manufacturer as string) || null,
            barcode: (p.barcode as string) || null,
            notes: (p.notes as string) || null,
            strength: (p.strength as string) || null,
            dosageForm: (p.dosageForm as string) || null,
            route: (p.route as string) || null,
            drugClass: (p.drugClass as string) || null,
            category: (p.category as string) || null,
          },
        });
      } else if (operationType === "delete") {
        await prisma.medicine.delete({ where: { id: entityId } }).catch(() => {});
      }
      break;

    case "batch":
      if (operationType === "create" || operationType === "update") {
        await prisma.batch.upsert({
          where: { id: entityId },
          create: {
            id: entityId,
            medicineId: (p.medicineId as string) || "",
            batchNumber: (p.batchNumber as string) || "",
            quantity: (p.quantity as number) || 0,
            expiryDate: new Date((p.expiryDate as string) || new Date()),
            cartonId: (p.cartonId as string) || null,
          },
          update: {
            batchNumber: (p.batchNumber as string) || undefined,
            quantity: (p.quantity as number) || undefined,
            expiryDate: new Date((p.expiryDate as string) || new Date()),
            cartonId: (p.cartonId as string) || null,
          },
        });
      } else if (operationType === "delete") {
        await prisma.batch.delete({ where: { id: entityId } }).catch(() => {});
      }
      break;

    case "stockMovement":
      if (operationType === "create" || operationType === "update") {
        await prisma.stockMovement.upsert({
          where: { id: entityId },
          create: {
            id: entityId,
            medicineId: (p.medicineId as string) || "",
            batchId: (p.batchId as string) || null,
            convoyId: (p.convoyId as string) || null,
            type: (p.type as string) || "",
            quantity: (p.quantity as number) || 0,
            reason: (p.reason as string) || null,
            notes: (p.notes as string) || null,
            deviceId: (p.deviceId as string) || "",
            userId: userId,
          },
          update: {
            type: (p.type as string) || undefined,
            quantity: (p.quantity as number) || undefined,
            reason: (p.reason as string) || null,
            notes: (p.notes as string) || null,
          },
        });
      } else if (operationType === "delete") {
        await prisma.stockMovement.delete({ where: { id: entityId } }).catch(() => {});
      }
      break;

    case "convoy":
      if (operationType === "create" || operationType === "update") {
        await prisma.convoy.upsert({
          where: { id: entityId },
          create: {
            id: entityId,
            name: (p.name as string) || "",
            date: new Date((p.date as string) || new Date()),
            location: (p.location as string) || null,
            responsiblePerson: (p.responsiblePerson as string) || null,
            notes: (p.notes as string) || null,
            status: (p.status as string) || "DRAFT",
          },
          update: {
            name: (p.name as string) || undefined,
            date: new Date((p.date as string) || new Date()),
            location: (p.location as string) || null,
            responsiblePerson: (p.responsiblePerson as string) || null,
            notes: (p.notes as string) || null,
            status: (p.status as string) || undefined,
          },
        });
      } else if (operationType === "delete") {
        await prisma.convoy.delete({ where: { id: entityId } }).catch(() => {});
      }
      break;

    case "stockReceipt":
      if (operationType === "create" || operationType === "update") {
        await prisma.stockReceipt.upsert({
          where: { id: entityId },
          create: {
            id: entityId,
            receiptNumber: (p.receiptNumber as string) || "",
            date: new Date((p.date as string) || new Date()),
            sourceType: (p.sourceType as string) || "",
            sourceName: (p.sourceName as string) || null,
            responsiblePerson: (p.responsiblePerson as string) || null,
            notes: (p.notes as string) || null,
          },
          update: {
            receiptNumber: (p.receiptNumber as string) || undefined,
            date: new Date((p.date as string) || new Date()),
            sourceType: (p.sourceType as string) || undefined,
            sourceName: (p.sourceName as string) || null,
            responsiblePerson: (p.responsiblePerson as string) || null,
            notes: (p.notes as string) || null,
          },
        });
      } else if (operationType === "delete") {
        await prisma.stockReceipt.delete({ where: { id: entityId } }).catch(() => {});
      }
      break;

    // Users are NOT synced - they are managed via Prisma Studio or create-admin script
    case "user":
      console.log(`Skipping user sync for: ${entityId} - users are managed in PostgreSQL directly`);
      break;

    default:
      break;
  }
}