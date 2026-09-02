import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const csvPath = path.join(process.cwd(), "medicines-data", "medicines.csv");
  
  if (!fs.existsSync(csvPath)) {
    console.error("❌ File not found: medicines-data/medicines.csv");
    process.exit(1);
  }

  const content = fs.readFileSync(csvPath, "utf-8");
  const lines = content.split("\n").filter(l => l.trim());
  
  if (lines.length < 2) {
    console.error("❌ CSV file is empty or missing header");
    process.exit(1);
  }

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
    if (current.trim()) result.push(current.trim());
    return result;
  }

  const header = parseCSVLine(lines[0]);
  // Correct mapping based on actual CSV headers
  const tradeNameIdx = header.findIndex(h => h.toLowerCase() === "commercial_name_en");
  const genericNameIdx = header.findIndex(h => h.toLowerCase() === "scientific_name");
  const manufacturerIdx = header.findIndex(h => h.toLowerCase().includes("manufacturer"));
  const categoryIdx = header.findIndex(h => h.toLowerCase().includes("drug_class"));
  const formIdx = header.findIndex(h => h.toLowerCase().includes("route"));

  if (tradeNameIdx === -1 || genericNameIdx === -1) {
    console.error("❌ Required columns (commercial_name_en, scientific_name) not found in CSV.");
    process.exit(1);
  }

  const dataLines = lines.slice(1);
  let imported = 0;
  let skipped = 0;
  const batchData = [];

  for (let i = 0; i < dataLines.length; i++) {
    const parts = parseCSVLine(dataLines[i]);
    const tradeName = parts[tradeNameIdx] || "";
    const genericName = parts[genericNameIdx] || "";
    
    if (!tradeName || !genericName) {
      skipped++;
      continue;
    }

    const manufacturer = manufacturerIdx >= 0 ? parts[manufacturerIdx] : null;
    const category = categoryIdx >= 0 ? parts[categoryIdx] : null;
    const form = formIdx >= 0 ? parts[formIdx] : null;
    const notesParts = [category, form].filter(Boolean);
    const notes = notesParts.length > 0 ? notesParts.join(" | ") : null;

    batchData.push({
      tradeName,
      genericName,
      manufacturer: manufacturer || null,
      notes: notes || null,
    });
  }

  try {
    console.log(`Fetching existing medicines from PostgreSQL to prevent duplicates...`);
    const existingMedicines = await prisma.medicine.findMany({ select: { tradeName: true, genericName: true } });
    const existingSet = new Set(existingMedicines.map(m => `${m.tradeName.toLowerCase()}|${m.genericName.toLowerCase()}`));

    const newMedicines = batchData.filter(m => {
      const key = `${m.tradeName.toLowerCase()}|${m.genericName.toLowerCase()}`;
      if (existingSet.has(key)) {
        skipped++;
        return false;
      }
      existingSet.add(key);
      return true;
    });

    console.log(`Found ${newMedicines.length} new medicines to import. Inserting into PostgreSQL...`);

    const chunkSize = 1000;
    for (let i = 0; i < newMedicines.length; i += chunkSize) {
      const chunk = newMedicines.slice(i, i + chunkSize);
      await prisma.medicine.createMany({ data: chunk });
      imported += chunk.length;
      console.log(`Imported ${imported}/${newMedicines.length}...`);
    }

  } catch (err) {
    console.error("Error during database insert:", err);
  } finally {
    console.log("");
    console.log("═════════════════════════════════════════");
    console.log("  MEDICINE IMPORT RESULTS");
    console.log("═════════════════════════════════════");
    console.log(`  ✅ Imported: ${imported}`);
    console.log(`  ⏭️  Skipped: ${skipped} (duplicates or invalid)`);
    console.log("");
  }
}

main()
  .catch(err => { console.error("Fatal error:", err); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });