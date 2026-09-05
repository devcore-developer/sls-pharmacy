import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function normalizeMedicine(rawName, genericName, manufacturer, drugClass, csvRoute) {
  let strength = null;
  let dosageForm = null;
  let route = null;
  let category = null;
  let cleanName = rawName;

  // 1. Extract strength (e.g., 45 mg, 100 IU/ml, 150mg/5ml)
  const strengthRegex = /(\d+(?:\.\d+)?\s?(?:mg\/5ml|mg\/ml|mcg\/ml|IU\/ml|I\.U\.\/ml|I\.U\.|UNITS|mg|mcg|g|ml|%)\b)/i;
  const strengthMatch = cleanName.match(strengthRegex);
  if (strengthMatch) {
    strength = strengthMatch[1].replace(/\s+/g, ' ').trim();
    strength = strength.replace(/(\d)\s?(mg|mcg|g|ml|%)/i, "$1$2").replace(/(mg|ml)\s?\//i, "$1/");
    cleanName = cleanName.replace(strengthMatch[1], " ");
  }

  // 2. Extract Route
  if (/\bI\.?M\.?\b/i.test(cleanName)) {
    route = "IM";
    cleanName = cleanName.replace(/\bI\.?M\.?\b/gi, " ");
  } else if (/\bI\.?V\.?\b/i.test(cleanName)) {
    route = "IV";
    cleanName = cleanName.replace(/\bI\.?V\.?\b/gi, " ");
  } else if (/\bS\.?C\.?\b/i.test(cleanName)) {
    route = "SC";
    cleanName = cleanName.replace(/\bS\.?C\.?\b/gi, " ");
  } else if (csvRoute && !["UNKNOWN", "ORAL.SOLID", "ORAL.LIQUID", "TOPICAL", "."].includes(csvRoute.toUpperCase())) {
    route = csvRoute.toUpperCase();
  }

  // 3. Extract Dosage Form
  const formMap = [
    { regex: /tablet|tabs?\.?|F\.C\.TABS\.?|COATED\sTAB/i, form: "Tablet" },
    { regex: /capsule|caps?\.?/i, form: "Capsule" },
    { regex: /syrup|syp\.?/i, form: "Syrup" },
    { regex: /suspension|susp\.?/i, form: "Suspension" },
    { regex: /vial|ampoule|amp\.?|injection|penfill|prefilled syringe/i, form: "Injection" },
    { regex: /cream|crm\.?/i, form: "Cream" },
    { regex: /ointment|oint\.?/i, form: "Ointment" },
    { regex: /supp\.?|suppository/i, form: "Suppository" },
    { regex: /spray/i, form: "Spray" },
    { regex: /drops?\.?|eye drops?\.?|ear drops?\.?/i, form: "Drops" },
    { regex: /sachet/i, form: "Sachet" },
    { regex: /gel/i, form: "Gel" },
    { regex: /lotion/i, form: "Lotion" },
    { regex: /inhaler|inhalation/i, form: "Inhaler" },
    { regex: /patch/i, form: "Patch" },
  ];

  for (const f of formMap) {
    if (f.regex.test(cleanName)) {
      dosageForm = f.form;
      cleanName = cleanName.replace(f.regex, " ");
      break;
    }
  }

  // 4. Remove packaging quantities and parentheses
  cleanName = cleanName.replace(/\b\d+\s?(x\s?\d+\s?ml|ml|gm|g|tablets|tabs|capsules|caps|vials|amps|sachets|pieces|pcs|bottles|pens)\b/gi, " ");
  cleanName = cleanName.replace(/\(.*?\)/gi, " "); // Removes (EBEWE), (N/A), etc.
  cleanName = cleanName.replace(/\bN\/A\b/gi, " ");
  cleanName = cleanName.replace(/\bHM\b/gi, " ");
  cleanName = cleanName.replace(/\bORAL\.?SOLID\b/gi, " ");
  cleanName = cleanName.replace(/\bORAL\.?LIQUID\b/gi, " ");
  cleanName = cleanName.replace(/\bTOPICAL\b/gi, " ");
  cleanName = cleanName.replace(/\bORALLY\s?DIS\.?\b/gi, " ");
  cleanName = cleanName.replace(/\bDISCMELT\b/gi, " ");
  cleanName = cleanName.replace(/\bEFF\.?\b/gi, " ");

  // 5. Clean up spaces and trailing dots
  cleanName = cleanName.replace(/\s+/g, " ").replace(/\.\s+/g, ". ").replace(/\s+\./g, ".").trim();
  cleanName = cleanName.replace(/[\.\-]+$/, "").trim();

  if (!cleanName) cleanName = rawName.split(" ")[0];

  // 6. Category derivation from Drug Class (first word)
  if (drugClass && ![".", "N/A"].includes(drugClass)) {
    category = drugClass.split(/[\.\s]/)[0];
  }

  // 7. Normalize nulls for missing data
  if (!genericName || [".", "N/A", ""].includes(genericName)) genericName = null;
  if (!manufacturer || [".", "N/A", ""].includes(manufacturer)) manufacturer = null;
  if (!drugClass || [".", "N/A", ""].includes(drugClass)) drugClass = null;

  return { tradeName: cleanName, strength, dosageForm, route, category, genericName, manufacturer, drugClass };
}

async function main() {
  const csvPath = path.join(process.cwd(), "medicines-data", "medicines.csv");
  if (!fs.existsSync(csvPath)) {
    console.error("❌ File not found: medicines-data/medicines.csv");
    process.exit(1);
  }

  const content = fs.readFileSync(csvPath, "utf-8");
  const lines = content.split("\n").filter(l => l.trim());
  if (lines.length < 2) process.exit(1);

  function parseCSVLine(line) {
    const result = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') inQuotes = !inQuotes;
      else if (char === ",") { result.push(current.trim()); current = ""; }
      else current += char;
    }
    if (current.trim()) result.push(current.trim());
    return result;
  }

  const header = parseCSVLine(lines[0]);
  console.log("Detected CSV columns:", header);

  // Dynamic mapping by header name
  const colMap = {
    tradeName: header.findIndex(h => h.toLowerCase() === "commercial_name_en"),
    genericName: header.findIndex(h => h.toLowerCase() === "scientific_name"),
    manufacturer: header.findIndex(h => h.toLowerCase().includes("manufacturer")),
    drugClass: header.findIndex(h => h.toLowerCase().includes("drug_class")),
    route: header.findIndex(h => h.toLowerCase() === "route"),
  };

  if (colMap.tradeName === -1 || colMap.genericName === -1) {
    console.error("❌ Required columns (commercial_name_en, scientific_name) not found in CSV.");
    process.exit(1);
  }

  console.log("Clearing existing catalog medicines...");
  await prisma.medicine.deleteMany({ where: { isCatalog: true } });

  const dataLines = lines.slice(1);
  let imported = 0;
  let skipped = 0;
  const batchData = [];

  const checkMeds = ["Carboplatin", "Acetamax", "Actozone", "Actrapid", "Acupan"];

  for (let i = 0; i < dataLines.length; i++) {
    const parts = parseCSVLine(dataLines[i]);
    const rawTradeName = parts[colMap.tradeName] || "";
    const rawGeneric = parts[colMap.genericName] || "";
    const rawManufacturer = colMap.manufacturer >= 0 ? parts[colMap.manufacturer] : null;
    const rawDrugClass = colMap.drugClass >= 0 ? parts[colMap.drugClass] : null;
    const rawRoute = colMap.route >= 0 ? parts[colMap.route] : null;
    
    if (!rawTradeName) {
      skipped++;
      continue;
    }

    const normalized = normalizeMedicine(rawTradeName, rawGeneric, rawManufacturer, rawDrugClass, rawRoute);

    if (checkMeds.some(m => rawTradeName.startsWith(m))) {
      console.log(`\nDIAGNOSTIC FOR: ${rawTradeName}`);
      console.log(`  Scientific Name: ${normalized.genericName}`);
      console.log(`  Manufacturer: ${normalized.manufacturer}`);
      console.log(`  Drug Class: ${normalized.drugClass}`);
      console.log(`  Normalized -> Trade: ${normalized.tradeName}, Strength: ${normalized.strength}, Form: ${normalized.dosageForm}, Cat: ${normalized.category}`);
    }

    if (!normalized.tradeName || !normalized.genericName) {
      skipped++;
      continue;
    }

    batchData.push({
      tradeName: normalized.tradeName,
      genericName: normalized.genericName,
      manufacturer: normalized.manufacturer,
      drugClass: normalized.drugClass,
      category: normalized.category,
      strength: normalized.strength,
      dosageForm: normalized.dosageForm,
      route: normalized.route,
      isCatalog: true,
    });
  }

  try {
    console.log(`\nNormalized ${batchData.length} medicines. Inserting into PostgreSQL...`);
    const chunkSize = 1000;
    for (let i = 0; i < batchData.length; i += chunkSize) {
      const chunk = batchData.slice(i, i + chunkSize);
      await prisma.medicine.createMany({ data: chunk });
      imported += chunk.length;
      console.log(`Imported ${imported}/${batchData.length}...`);
    }
  } catch (err) {
    console.error("Error during database insert:", err);
  } finally {
    console.log("");
    console.log("═════════════════════════════════════════");
    console.log("  MEDICINE IMPORT RESULTS");
    console.log("═════════════════════════════════════");
    console.log(`  ✅ Imported: ${imported}`);
    console.log(`  ⏭️  Skipped: ${skipped} (invalid/missing data)`);
    console.log("");
  }
}

main()
  .catch(err => { console.error("Fatal error:", err); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });