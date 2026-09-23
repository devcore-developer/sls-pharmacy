import fs from "fs";
import path from "path";
import csv from "csv-parser";
import { prisma } from "../src/lib/prisma";

const CSV_PATH = path.join(process.cwd(), "data", "medicines.csv");

async function importCsv() {
  console.log(`Reading CSV from ${CSV_PATH}...`);
  
  const uniqueMedicines = new Map<string, any>();

  fs.createReadStream(CSV_PATH)
    .pipe(csv())
    .on("data", (row: any) => {
      const tradeName = (row.commercial_name_en || "").trim();
      const genericName = (row.scientific_name || "").trim();
      const manufacturer = (row.manufacturer || "").trim();
      const drugClass = (row.drug_class || "").trim();
      const route = (row.route || "").trim();

      if (!tradeName) return;

      if (!uniqueMedicines.has(tradeName)) {
        uniqueMedicines.set(tradeName, {
          tradeName: tradeName,
          genericName: genericName || "", // اتصحح هنا
          manufacturer: manufacturer || null,
          drugClass: drugClass || null,
          route: route || null,
          category: drugClass || null,
        });
      }
    })
    .on("end", async () => {
      console.log(`Found ${uniqueMedicines.size} unique medicines. Starting database import...`);

      const values = Array.from(uniqueMedicines.values());
      let count = 0;

      const chunkSize = 1000;
      for (let i = 0; i < values.length; i += chunkSize) {
        const chunk = values.slice(i, i + chunkSize);
        await prisma.medicine.createMany({
          data: chunk,
          skipDuplicates: true,
        });
        count += chunk.length;
        console.log(`Imported ${count} / ${values.length} medicines...`);
      }

      console.log("🎉 Import finished successfully! All medicines are in the database.");
      await prisma.$disconnect();
    })
    .on("error", (error: any) => {
      console.error("Error reading CSV file:", error);
    });
}

importCsv();