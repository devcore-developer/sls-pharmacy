import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Create MEMBER role if not exists
  let member = await prisma.role.findUnique({ where: { name: "MEMBER" } });
  if (!member) {
    member = await prisma.role.create({
      data: {
        name: "MEMBER",
        label: "Member",
        description: "Standard user with limited access",
        isSystem: true,
        permissions: ["dashboard.view", "medicine.view", "inventory.view", "convoy.view", "reports.view"],
      },
    });
    console.log("Created MEMBER role");
  } else {
    console.log("MEMBER role already exists");
  }

  // Update ADMIN label
  const admin = await prisma.role.findUnique({ where: { name: "ADMIN" } });
  if (admin && admin.label !== "Administrator") {
    await prisma.role.update({ where: { id: admin.id }, data: { label: "Administrator" } });
    console.log("Updated ADMIN label");
  }

  console.log("");
  console.log("Roles:");
  const roles = await prisma.role.findMany({ orderBy: { name: "asc" } });
  roles.forEach(r => console.log("  - " + r.label + " (" + r.name + ")"));

  await prisma.$disconnect();
}

main();