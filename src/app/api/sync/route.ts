import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Permission mapping: operationType → required permission
const OPERATION_PERMISSIONS: Record<string, string> = {
  create: "inventory.view",
  update: "inventory.view",
  delete: "inventory.view",
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { operationId, deviceId, userId, operationType, entityType, entityId, payload } = body;

    if (!operationId || !entityType || !operationType) {
      return NextResponse.json({ status: "ERROR", message: "Missing required fields." }, { status: 400 });
    }

    // Idempotency: check if already processed
    const existing = await prisma.syncOperation.findUnique({
      where: { operationId },
    });

    if (existing) {
      return NextResponse.json({ status: "SYNCED", message: "Already processed." }, { status: 200 });
    }

    // Basic permission check if userId provided
    if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId }, include: { role: true } });
      if (!user) {
        return NextResponse.json({ status: "ERROR", message: "User not found or inactive." }, { status: 403 });
      }
    }

    // Dispatch to entity handler FIRST
    try {
      await dispatchOperation(entityType, operationType, entityId, payload, userId);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Processing failed";
      return NextResponse.json({ status: "ERROR", message }, { status: 500 });
    }

    // Mark as synced ONLY after successful dispatch
    await prisma.syncOperation.create({
      data: {
        operationId,
        deviceId: deviceId || "unknown",
        userId: userId || null,
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
  userId?: string
) {
  const p = payload;

  switch (entityType) {
    case "medicine":
      if (operationType === "create") {
        await prisma.medicine.upsert({
          where: { id: entityId },
          create: {
            id: entityId,
            tradeName: (p.tradeName as string) || "",
            genericName: (p.genericName as string) || "",
            manufacturer: (p.manufacturer as string) || null,
            notes: (p.notes as string) || null,
          },
          update: {},
        });
      }
      break;

    case "batch":
      if (operationType === "create") {
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
          update: {},
        });
      }
      break;

    case "stockMovement":
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
          userId: userId || null,
        },
        update: {},
      });
      break;

    case "convoy":
      if (operationType === "create") {
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
          update: {},
        });
      }
      break;

    case "stockReceipt":
      if (operationType === "create") {
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
          update: {},
        });
      }
      break;

    case "user":
      if (operationType === "create" && p.id) {
        await prisma.user.upsert({
          where: { id: p.id as string },
          create: {
            id: p.id as string,
            email: (p.email as string) || `${p.username}@local`,
            name: (p.name as string) || "",
            roleId: (p.roleId as string) || "",
          },
          update: {},
        });
      }
      break;

    default:
      break;
  }
}