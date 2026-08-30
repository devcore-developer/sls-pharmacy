const PBKDF2_ITERATIONS = 600_000;
const HASH_ALGORITHM = "SHA-256";
const SALT_LENGTH = 16;
const KEY_LENGTH = 32;

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return buffer;
}

async function deriveKey(password: string, salt: ArrayBuffer): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  return crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: HASH_ALGORITHM },
    keyMaterial,
    KEY_LENGTH * 8
  );
}

export interface HashedPassword {
  hash: string;
  salt: string;
  algorithm: string;
  iterations: number;
}

export async function hashPassword(password: string): Promise<HashedPassword> {
  const saltBuf = new ArrayBuffer(SALT_LENGTH);
  const saltView = new Uint8Array(saltBuf);
  crypto.getRandomValues(saltView);
  const bits = await deriveKey(password, saltBuf);
  return {
    hash: bufferToBase64(bits),
    salt: Array.from(saltView, (b) => String.fromCharCode(b)).join(""),
    algorithm: `PBKDF2-${HASH_ALGORITHM}`,
    iterations: PBKDF2_ITERATIONS,
  };
}

export async function verifyPassword(password: string, hashed: HashedPassword): Promise<boolean> {
  const salt = base64ToBuffer(hashed.salt);
  const bits = await deriveKey(password, salt);
  return bufferToBase64(bits) === hashed.hash;
}

export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_REQUIREMENTS = [
  { label: "At least 8 characters", test: (p: string) => p.length >= PASSWORD_MIN_LENGTH },
  { label: "At least one uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "At least one lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "At least one number", test: (p: string) => /[0-9]/.test(p) },
];

export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  for (const req of PASSWORD_REQUIREMENTS) {
    if (!req.test(password)) errors.push(req.label);
  }
  return { valid: errors.length === 0, errors };
}