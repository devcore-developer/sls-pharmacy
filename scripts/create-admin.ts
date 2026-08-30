/**
 * DEVELOPMENT/SETUP SCRIPT: Create the first administrator
 * 
 * Usage: npm run create:admin -- <email> <name> <password>
 * Example: npm run create:admin -- admin@example.com "Ahmed Hassan" MySecurePass123
 */
/// <reference types="node" />
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Simple PBKDF2 implementation for Node.js
async function hashPassword(
  password: string
): Promise<{
  hash: string;
  salt: string;
  algorithm: string;
  iterations: number;
}> {
  const encoder = new TextEncoder();
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const iterations = 600000;
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );

  const hashArray = new Uint8Array(bits);
  const hashBase64 = btoa(String.fromCharCode(...hashArray));
  const saltBase64 = btoa(String.fromCharCode(...salt));

  return {
    hash: hashBase64,
    salt: saltBase64,
    algorithm: "PBKDF2-SHA256",
    iterations,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const email = args[0];
  const name = args[1];
  const password = args[2];

  console.log("");
  console.log("========================================");
  console.log("  SLS Pharmacy - Create Administrator");
  console.log("========================================");
  console.log("");

  if (!email || !name || !password) {
    console.error("❌ Missing required arguments.");
    console.error("");
    console.error("Usage:");
    console.error("  npm run create:admin -- <email> <name> <password>");
    console.error("");
    console.error("Example:");
    console.error('  npm run create:admin -- admin@example.com "Ahmed Hassan" MySecurePass123');
    console.error("");
    process.exit(1);
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.error("❌ Invalid email format.");
    process.exit(1);
  }

  // Validate password (basic checks)
  if (password.length < 8) {
    console.error("❌ Password must be at least 8 characters.");
    process.exit(1);
  }

  try {
    // Ensure ADMIN role exists
    let adminRole = await prisma.role.findUnique({
      where: { name: "ADMIN" },
    });

    if (!adminRole) {
      adminRole = await prisma.role.create({
        data: {
          name: "ADMIN",
          label: "Administrator",
          description: "Full system access - all permissions",
          isSystem: true,
          permissions: [],
        },
      });
      console.log("✓ Created ADMIN role");
    }

    // Check if an active admin already exists
    const existingAdmin = await prisma.user.findFirst({
      where: {
        roleId: adminRole.id,
        isActive: true,
      },
    });

    if (existingAdmin) {
      console.error("❌ An administrator already exists:");
      console.error("");
      console.error(`   Email: ${existingAdmin.email}`);
      console.error(`   Name:  ${existingAdmin.name}`);
      console.error(`   ID:    ${existingAdmin.id}`);
      console.error("");
      console.error("To manage administrators, use Prisma Studio:");
      console.error("  npx prisma studio");
      console.error("");
      console.error("To completely reset the database (DEVELOPMENT ONLY):");
      console.error("  npm run db:reset");
      console.error("");
      process.exit(1);
    }

    // Check if email is already taken
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      console.error(`❌ A user with email "${email}" already exists.`);
      process.exit(1);
    }

    // Hash the password
    console.log("Hashing password...");
    const hashed = await hashPassword(password);

    // Create the administrator
    console.log("Creating administrator...");
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name,
        passwordHash: hashed.hash,
        passwordSalt: hashed.salt,
        passwordAlgorithm: hashed.algorithm,
        passwordIterations: hashed.iterations,
        isActive: true,
        roleId: adminRole.id,
      },
    });

    console.log("");
    console.log("✅ Administrator created successfully!");
    console.log("");
    console.log("   Email: " + user.email);
    console.log("   Name:  " + user.name);
    console.log("   Role:  ADMIN");
    console.log("   ID:    " + user.id);
    console.log("");
    console.log("Next steps:");
    console.log("  1. Start the app:  npm run dev");
    console.log("  2. Open:          http://localhost:3000");
    console.log("  3. Login with the credentials you provided");
    console.log("");
    console.log("To view in Prisma Studio:");
    console.log("  npx prisma studio");
    console.log("");
  } catch (error) {
    console.error("❌ Failed to create administrator:");
    console.error("");
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(error);
    }
    console.error("");
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();