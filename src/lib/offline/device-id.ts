const DEVICE_ID_KEY = "sls-pharmacy-device-id";

export function getDeviceId(): string {
  if (typeof window === "undefined") return "";

  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

export function resetDeviceId(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(DEVICE_ID_KEY);
}