import { db } from "@/lib/offline/db";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type CheckSeverity = "PASS" | "WARNING" | "ERROR";

export interface IntegrityCheck {
  id: string;
  category: string;
  description: string;
  severity: CheckSeverity;
  details?: string;
  navigationPath?: string;
}

export interface IntegrityResult {
  checks: IntegrityCheck[];
  summary: { pass: number; warning: number; error: number };
}

/* ------------------------------------------------------------------ */
/*  Run All Checks                                                     */
/* ------------------------------------------------------------------ */

export async function runIntegrityChecks(): Promise<IntegrityResult> {
  const checks: IntegrityCheck[] = [];

  await checkDuplicateIds(checks);
  await checkDuplicateOperationIds(checks);
  await checkBatchMedicineRefs(checks);
  await checkBatchCartonRefs(checks);
  await checkConvoyItemRefs(checks);
  await checkMovementRefs(checks);
  await checkReceiptItemRefs(checks);
  await checkMedicineCategoryRefs(checks);
  await checkNegativeQuantities(checks);
  await checkCalculatedStock(checks);
  await checkInvalidExpiry(checks);
  await checkOrphanedRecords(checks);

  const summary = {
    pass: checks.filter((c) => c.severity === "PASS").length,
    warning: checks.filter((c) => c.severity === "WARNING").length,
    error: checks.filter((c) => c.severity === "ERROR").length,
  };

  return { checks, summary };
}

/* ------------------------------------------------------------------ */
/*  Individual Checks                                                  */
/* ------------------------------------------------------------------ */

async function checkDuplicateIds(checks: IntegrityCheck[]) {
  const [medicines, batches, cartons, convoys, receipts] = await Promise.all([
    db.medicines.toArray(),
    db.batches.toArray(),
    db.cartons.toArray(),
    db.convoys.toArray(),
    db.stockReceipts.toArray(),
  ]);

  for (const [name, records] of [["Medicines", medicines], ["Batches", batches], ["Cartons", cartons], ["Convoys", convoys], ["Receipts", receipts]] as const) {
    const ids = records.map((r) => r.id).filter(Boolean) as string[];
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) {
        checks.push({ id: `dup-${name}-${id}`, category: "Duplicate IDs", description: `Duplicate ID in ${name}: ${id}`, severity: "ERROR" });
      }
      seen.add(id);
    }
  }

  if (checks.filter((c) => c.category === "Duplicate IDs").length === 0) {
    checks.push({ id: "dup-ids-pass", category: "Duplicate IDs", description: "No duplicate IDs found.", severity: "PASS" });
  }
}

async function checkDuplicateOperationIds(checks: IntegrityCheck[]) {
  const ops = await db.syncOperations.toArray();
  const seen = new Set<string>();
  let dupes = 0;
  for (const op of ops) {
    if (seen.has(op.operationId)) dupes++;
    seen.add(op.operationId);
  }
  if (dupes > 0) {
    checks.push({ id: "dup-op-ids", category: "Operation IDs", description: `${dupes} duplicate operation IDs found.`, severity: "ERROR" });
  } else {
    checks.push({ id: "dup-op-ids-pass", category: "Operation IDs", description: "No duplicate operation IDs.", severity: "PASS" });
  }
}

async function checkBatchMedicineRefs(checks: IntegrityCheck[]) {
  const [batches, medicines] = await Promise.all([db.batches.toArray(), db.medicines.toArray()]);
  const medIds = new Set(medicines.map((m) => m.id!));
  const broken = batches.filter((b) => !medIds.has(b.medicineId));
  if (broken.length > 0) {
    checks.push({ id: "batch-med-ref", category: "References", description: `${broken.length} batch(es) reference non-existent medicine(s).`, severity: "ERROR", details: broken.map((b) => `Batch ${b.batchNumber} → ${b.medicineId}`).join(", ") });
  } else {
    checks.push({ id: "batch-med-ref-pass", category: "References", description: "All batch → medicine references are valid.", severity: "PASS" });
  }
}

async function checkBatchCartonRefs(checks: IntegrityCheck[]) {
  const [batches, cartons] = await Promise.all([db.batches.toArray(), db.cartons.toArray()]);
  const cartonIds = new Set(cartons.map((c) => c.id!));
  const broken = batches.filter((b) => b.cartonId && !cartonIds.has(b.cartonId));
  if (broken.length > 0) {
    checks.push({ id: "batch-carton-ref", category: "References", description: `${broken.length} batch(es) reference non-existent carton(s).`, severity: "ERROR" });
  } else {
    checks.push({ id: "batch-carton-ref-pass", category: "References", description: "All batch → carton references are valid.", severity: "PASS" });
  }
}

async function checkConvoyItemRefs(checks: IntegrityCheck[]) {
  const [items, convoys, medicines, batches] = await Promise.all([
    db.convoyItems.toArray(),
    db.convoys.toArray(),
    db.medicines.toArray(),
    db.batches.toArray(),
  ]);
  const convoyIds = new Set(convoys.map((c) => c.id!));
  const medIds = new Set(medicines.map((m) => m.id!));
  const batchIds = new Set(batches.map((b) => b.id!));

  const brokenConvoy = items.filter((i) => !convoyIds.has(i.convoyId));
  const brokenMed = items.filter((i) => !medIds.has(i.medicineId));
  const brokenBatch = items.filter((i) => i.batchId && !batchIds.has(i.batchId));
  const total = brokenConvoy.length + brokenMed.length + brokenBatch.length;

  if (total > 0) {
    checks.push({ id: "ci-refs", category: "References", description: `${total} broken convoy item reference(s).`, severity: "ERROR" });
  } else {
    checks.push({ id: "ci-refs-pass", category: "References", description: "All convoy item references are valid.", severity: "PASS" });
  }
}

async function checkMovementRefs(checks: IntegrityCheck[]) {
  const [movements, medicines, batches, convoys, receipts] = await Promise.all([
    db.stockMovements.toArray(),
    db.medicines.toArray(),
    db.batches.toArray(),
    db.convoys.toArray(),
    db.stockReceipts.toArray(),
  ]);
  const medIds = new Set(medicines.map((m) => m.id!));
  const batchIds = new Set(batches.map((b) => b.id!));
  const convoyIds = new Set(convoys.map((c) => c.id!));
  const receiptIds = new Set(receipts.map((r) => r.id!));

  const broken = movements.filter((m) =>
    !medIds.has(m.medicineId) ||
    (m.batchId && !batchIds.has(m.batchId)) ||
    (m.convoyId && !convoyIds.has(m.convoyId)) ||
    (m.receiptId && !receiptIds.has(m.receiptId))
  );

  if (broken.length > 0) {
    checks.push({ id: "mov-refs", category: "References", description: `${broken.length} movement(s) with broken reference(s).`, severity: "ERROR" });
  } else {
    checks.push({ id: "mov-refs-pass", category: "References", description: "All stock movement references are valid.", severity: "PASS" });
  }
}

async function checkReceiptItemRefs(checks: IntegrityCheck[]) {
  const [items, receipts, medicines, batches] = await Promise.all([
    db.stockReceiptItems.toArray(),
    db.stockReceipts.toArray(),
    db.medicines.toArray(),
    db.batches.toArray(),
  ]);
  const receiptIds = new Set(receipts.map((r) => r.id!));
  const medIds = new Set(medicines.map((m) => m.id!));
  const batchIds = new Set(batches.map((b) => b.id!));

  const broken = items.filter((i) =>
    !receiptIds.has(i.receiptId) ||
    !medIds.has(i.medicineId) ||
    (i.batchId && !batchIds.has(i.batchId))
  );

  if (broken.length > 0) {
    checks.push({ id: "ri-refs", category: "References", description: `${broken.length} receipt item(s) with broken reference(s).`, severity: "ERROR" });
  } else {
    checks.push({ id: "ri-refs-pass", category: "References", description: "All receipt item references are valid.", severity: "PASS" });
  }
}

async function checkMedicineCategoryRefs(checks: IntegrityCheck[]) {
  const [medCats, medicines, categories] = await Promise.all([
    db.medicineCategories.toArray(),
    db.medicines.toArray(),
    db.categories.toArray(),
  ]);
  const medIds = new Set(medicines.map((m) => m.id!));
  const catIds = new Set(categories.map((c) => c.id!));
  const broken = medCats.filter((mc) => !medIds.has(mc.medicineId) || !catIds.has(mc.categoryId));
  if (broken.length > 0) {
    checks.push({ id: "mc-refs", category: "References", description: `${broken.length} medicine-category link(s) broken.`, severity: "ERROR" });
  } else {
    checks.push({ id: "mc-refs-pass", category: "References", description: "All medicine-category links are valid.", severity: "PASS" });
  }
}

async function checkNegativeQuantities(checks: IntegrityCheck[]) {
  const batches = await db.batches.toArray();
  const negative = batches.filter((b) => b.quantity < 0);
  if (negative.length > 0) {
    checks.push({
      id: "neg-qty",
      category: "Stock",
      description: `${negative.length} batch(es) have negative quantity.`,
      severity: "ERROR",
      details: negative.map((b) => `Batch ${b.batchNumber}: ${b.quantity}`).join(", "),
    });
  } else {
    checks.push({ id: "neg-qty-pass", category: "Stock", description: "No negative batch quantities.", severity: "PASS" });
  }
}

async function checkCalculatedStock(checks: IntegrityCheck[]) {
  const batches = await db.batches.filter((b) => !b.archivedAt).toArray();
  const movements = await db.stockMovements.toArray();

  let discrepancies = 0;
  const details: string[] = [];

  for (const batch of batches) {
    let calculated = 0;
    for (const m of movements) {
      if (m.batchId !== batch.id) continue;
      const outTypes = ["CONVOY_OUT", "ADJUSTMENT_OUT"];
      const inTypes = ["DONATION_IN", "RETURN_TO_WAREHOUSE", "ADJUSTMENT_IN"];
      if (outTypes.includes(m.type)) calculated -= m.quantity;
      else if (inTypes.includes(m.type)) calculated += m.quantity;
    }

    if (calculated !== batch.quantity) {
      discrepancies++;
      if (details.length < 5) {
        details.push(`Batch ${batch.batchNumber}: stored=${batch.quantity}, calculated=${calculated}`);
      }
    }
  }

  if (discrepancies > 0) {
    checks.push({ id: "stock-calc", category: "Stock", description: `${discrepancies} batch(es) have stock discrepancies.`, severity: "WARNING", details: details.join("; ") + (discrepancies > 5 ? ` ...and ${discrepancies - 5} more` : "") });
  } else {
    checks.push({ id: "stock-calc-pass", category: "Stock", description: "All batch quantities match movement history.", severity: "PASS" });
  }
}

async function checkInvalidExpiry(checks: IntegrityCheck[]) {
  const batches = await db.batches.toArray();
  const invalid = batches.filter((b) => {
    const d = new Date(b.expiryDate);
    return isNaN(d.getTime());
  });
  if (invalid.length > 0) {
    checks.push({ id: "invalid-expiry", category: "Data Quality", description: `${invalid.length} batch(es) have invalid expiry dates.`, severity: "ERROR" });
  } else {
    checks.push({ id: "invalid-expiry-pass", category: "Data Quality", description: "All expiry dates are valid.", severity: "PASS" });
  }
}

async function checkOrphanedRecords(checks: IntegrityCheck[]) {
  // Check for archived medicines with active batches
  const [medicines, batches] = await Promise.all([db.medicines.toArray(), db.batches.toArray()]);
  const archivedIds = new Set(medicines.filter((m) => m.archivedAt).map((m) => m.id!));
  const activeBatchesForArchived = batches.filter((b) => !b.archivedAt && archivedIds.has(b.medicineId));
  if (activeBatchesForArchived.length > 0) {
    checks.push({ id: "orphaned-batches", category: "Orphaned Records", description: `${activeBatchesForArchived.length} active batch(es) belong to archived medicine(s).`, severity: "WARNING" });
  } else {
    checks.push({ id: "orphaned-batches-pass", category: "Orphaned Records", description: "No orphaned active batches for archived medicines.", severity: "PASS" });
  }
}