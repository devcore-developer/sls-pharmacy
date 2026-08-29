import type { CategoryRecord, PharmacologicalClassRecord } from "./db";

const now = new Date();

export const seedCategories: CategoryRecord[] = [
  { id: "cat-internal", name: "Internal Medicine", description: "General internal medicine", createdAt: now, updatedAt: now },
  { id: "cat-cardio", name: "Cardiology", description: "Heart and cardiovascular medicines", createdAt: now, updatedAt: now },
  { id: "cat-diabetes", name: "Diabetes", description: "Antidiabetic medications and insulin", createdAt: now, updatedAt: now },
  { id: "cat-gastro", name: "Gastroenterology", description: "Digestive system medicines", createdAt: now, updatedAt: now },
  { id: "cat-pulmo", name: "Pulmonology", description: "Respiratory and lung medicines", createdAt: now, updatedAt: now },
  { id: "cat-neuro", name: "Neurology", description: "Nervous system medications", createdAt: now, updatedAt: now },
  { id: "cat-peds", name: "Pediatrics", description: "Medicines for pediatric use", createdAt: now, updatedAt: now },
  { id: "cat-derma", name: "Dermatology", description: "Skin conditions and treatments", createdAt: now, updatedAt: now },
  { id: "cat-ent", name: "ENT", description: "Ear, nose, and throat medicines", createdAt: now, updatedAt: now },
  { id: "cat-ophthal", name: "Ophthalmology", description: "Eye care medicines", createdAt: now, updatedAt: now },
  { id: "cat-gyn", name: "Gynecology", description: "Gynecological medicines", createdAt: now, updatedAt: now },
  { id: "cat-pain", name: "Pain Relief", description: "Analgesics and pain management", createdAt: now, updatedAt: now },
];

export const seedPharmacologicalClasses: PharmacologicalClassRecord[] = [
  { id: "pcl-analgesics", name: "Analgesics", description: "Pain relief medicines", createdAt: now, updatedAt: now },
  { id: "pcl-antipyretics", name: "Antipyretics", description: "Fever-reducing medicines", createdAt: now, updatedAt: now },
  { id: "pcl-nsaids", name: "NSAIDs", description: "Non-steroidal anti-inflammatory drugs", createdAt: now, updatedAt: now },
  { id: "pcl-antibiotics", name: "Antibiotics", description: "Antibacterial medications", createdAt: now, updatedAt: now },
  { id: "pcl-antiemetics", name: "Antiemetics", description: "Anti-nausea and anti-vomiting medicines", createdAt: now, updatedAt: now },
  { id: "pcl-antihypertensives", name: "Antihypertensives", description: "Blood pressure-lowering medicines", createdAt: now, updatedAt: now },
  { id: "pcl-antidiabetics", name: "Antidiabetics", description: "Blood sugar-lowering medicines", createdAt: now, updatedAt: now },
  { id: "pcl-antihistamines", name: "Antihistamines", description: "Allergy and histamine-blocking medicines", createdAt: now, updatedAt: now },
  { id: "pcl-ppi", name: "Proton Pump Inhibitors", description: "Acid-reducing medicines", createdAt: now, updatedAt: now },
  { id: "pcl-antifungals", name: "Antifungals", description: "Anti-fungal medications", createdAt: now, updatedAt: now },
  { id: "pcl-antivirals", name: "Antivirals", description: "Anti-viral medications", createdAt: now, updatedAt: now },
  { id: "pcl-corticosteroids", name: "Corticosteroids", description: "Steroidal anti-inflammatory medicines", createdAt: now, updatedAt: now },
];