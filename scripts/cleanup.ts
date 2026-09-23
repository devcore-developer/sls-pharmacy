import { prisma } from "../src/lib/prisma";

async function wipeMedicines() {
  console.log("⚠️ Deleting ALL medicines, batches, and movements...");
  
  // 1. مسح حركات المخزون
  await prisma.stockMovement.deleteMany({});
  console.log("✓ Stock Movements deleted.");

  // 2. مسح التشغيلات (Batches)
  await prisma.batch.deleteMany({});
  console.log("✓ Batches deleted.");

  // 3. مسح الأدوية
  await prisma.medicine.deleteMany({});
  console.log("✓ Medicines deleted.");

  console.log("🎉 Database wiped successfully! Ready for fresh CSV import.");
}

wipeMedicines()
  .catch((e) => console.error("Error:", e))
  .finally(async () => {
    await prisma.$disconnect();
  });