import fs from "fs";
import path from "path";

async function main() {
  const csvPath = path.join(process.cwd(), "medicines-data", "medicines.csv");
  
  if (!fs.existsSync(csvPath)) {
    console.error("❌ File not found: medicines-data/medicines.csv");
    console.error("   Create 'medicines-data' folder and put 'medicines.csv' inside it");
    process.exit(1);
  }

  const content = fs.readFileSync(csvPath, "utf-8");
  const lines = content.split("\n").filter(l => l.trim());
  
  if (lines.length < 2) {
    console.error("❌ CSV file is empty or missing header");
    process.exit(1);
  }

  // Parse header - handle quoted fields
  function parseCSVLine(line) {
    const result = [];
    let current = "";
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ",") {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    if (current.trim()) {
      result.push(current.trim());
    }
    
    return result;
  }

  const header = parseCSVLine(lines[0]);
  const tradeNameIdx = header.findIndex(h => h.toLowerCase().includes("tradename"));
  const genericNameIdx = header.findIndex(h => h.toLowerCase().includes("genericname"));
  const manufacturerIdx = header.findIndex(h => h.toLowerCase().includes("manufacturer"));
  const categoryIdx = header.findIndex(h => h.toLowerCase().includes("category"));
  const formIdx = header.findIndex(h => h.toLowerCase().includes("form"));
  const priceIdx = header.findIndex(h => h.toLowerCase().includes("price"));

  const dataLines = lines.slice(1);
  
  let imported = 0;
  let skipped = 0;
  const errors = [];

  for (let i = 0; i < dataLines.length; i++) {
    const parts = parseCSVLine(dataLines[i]);
    
    if (parts.length < 2) {
      skipped++;
      continue;
    }

    const tradeName = tradeNameIdx >= 0 ? parts[tradeNameIdx] : "";
    const genericName = genericNameIdx >= 0 ? parts[genericNameIdx] : "";
    
    if (!tradeName || !genericName) {
      skipped++;
      continue;
    }

    const manufacturer = manufacturerIdx >= 0 ? parts[manufacturerIdx] : null;
    const category = categoryIdx >= 0 ? parts[categoryIdx] : null;
    const form = formIdx >= 0 ? parts[formIdx] : null;
    const price = priceIdx >= 0 ? parseFloat(parts[priceIdx]) || null : null;
    // Build notes from category and form
    const notesParts = [category, form].filter(Boolean);
    const notes = notesParts.length > 0 ? notesParts.join(" | ") : null;

    try {
      const { db } = await import("../src/lib/offline/db.js");
      await db.open();

      const id = crypto.randomUUID();
      const now = new Date();

      await prisma.medicine.create({
        id,
        tradeName,
        genericName,
        manufacturer: manufacturer || undefined,
        barcode: null,
        notes: notes || undefined,
        createdAt: now,
        updatedAt: now,
      });

      imported++;
    } catch (err) {
      if (err.name === "ConstraintError" || (err.message && err.message.includes("unique"))) {
        skipped++;
      } else {
        errors.push(`Line ${i + 2}: ${tradeName} - ${err.message}`);
      }
    }
  }

  console.log("");
  console.log("═════════════════════════════════════════");
  console.log("  MEDICINE IMPORT RESULTS");
  console.log("═════════════════════════════════════");
  console.log("");
  console.log(`  ✅ Imported: ${imported}`);
  console.log(`  ⏭️  Skipped: ${skipped} (duplicates)`);
  
  if (errors.length > 0) {
    console.log(`  ❌ Errors: ${errors.length}`);
    errors.forEach(e => console.log(`     - ${e}`));
  }
  
  console.log("");
}

main()
  .catch(err => {
    console.error("Fatal error:", err);
    process.exit(1);
  });