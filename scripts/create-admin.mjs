import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function hashPassword(password) {
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
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
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
    console.error("Usage: node scripts/create-admin.mjs <email> <name> <password>");
    console.error('Example: node scripts/create-admin.mjs admin@example.com "Admin" AdminPass123');
    process.exit(1);
  }

  try {
    let adminRole = await prisma.role.findUnique({ where: { name: "ADMIN" } });

    if (!adminRole) {
      adminRole = await prisma.role.create({
        data: {
          name: "ADMIN",
          label: "Administrator",
          description: "Full system access",
          isSystem: true,
          permissions: [],
        },
      });
      console.log("Created ADMIN role");
    }

    const existingAdmin = await prisma.user.findFirst({
      where: { roleId: adminRole.id, isActive: true },
    });

    if (existingAdmin) {
      console.error("Administrator already exists:");
      console.error("  Email:", existingAdmin.email);
      console.error("  Name:", existingAdmin.name);
      console.error("");
      console.error("To reset: npm run db:reset");
      process.exit(1);
    }

    console.log("Hashing password...");
    const hashed = await hashPassword(password);

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
    console.log("SUCCESS! Administrator created:");
    console.log("  Email:", user.email);
    console.log("  Name:", user.name);
    console.log("  Role: ADMIN");
    console.log("");
    console.log("Login at: http://localhost:3000");
    console.log("");
  } catch (error) {
    console.error("Failed:", error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();