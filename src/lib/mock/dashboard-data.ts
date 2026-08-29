export interface RecentActivityItem {
  id: string;
  action: string;
  detail: string;
  time: string;
  type: "inbound" | "outbound" | "update";
}

export interface ActiveConvoyItem {
  id: string;
  name: string;
  units: number;
  status: "pending" | "in_progress";
  destination: string;
}

export interface LowStockItem {
  id: string;
  medicine: string;
  currentStock: number;
  minimumStock: number;
  unit: string;
}

export const recentActivity: RecentActivityItem[] = [
  { id: "a1", action: "Received", detail: "500 units of Amoxicillin 500mg", time: "2 hours ago", type: "inbound" },
  { id: "a2", action: "Distributed", detail: "200 units of Paracetamol to Clinic A", time: "4 hours ago", type: "outbound" },
  { id: "a3", action: "Added", detail: "50 cartons of Ibuprofen 400mg", time: "6 hours ago", type: "inbound" },
  { id: "a4", action: "Updated", detail: "Expiry date for batch #B-2024-0189", time: "8 hours ago", type: "update" },
  { id: "a5", action: "Distributed", detail: "150 units of Metformin to Rural Clinic", time: "1 day ago", type: "outbound" },
];

export const activeConvoys: ActiveConvoyItem[] = [
  { id: "c1", name: "Gaza Medical Aid", units: 3200, status: "in_progress", destination: "Gaza Province" },
  { id: "c2", name: "Northern Region Support", units: 1500, status: "pending", destination: "Northern Clinics" },
  { id: "c3", name: "Rural Clinic Supply", units: 800, status: "in_progress", destination: "Rural Areas" },
  { id: "c4", name: "Emergency Response", units: 2100, status: "pending", destination: "Emergency Zone" },
];

export const lowStockItems: LowStockItem[] = [
  { id: "l1", medicine: "Insulin Glargine", currentStock: 12, minimumStock: 50, unit: "vials" },
  { id: "l2", medicine: "Salbutamol Inhaler", currentStock: 8, minimumStock: 30, unit: "units" },
  { id: "l3", medicine: "Amoxicillin 500mg", currentStock: 45, minimumStock: 200, unit: "capsules" },
  { id: "l4", medicine: "Paracetamol Syrup", currentStock: 15, minimumStock: 80, unit: "bottles" },
];