import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const adminRole = await prisma.role.findUnique({
      where: { name: "ADMIN" },
    });

    if (!adminRole) {
      return NextResponse.json({
        hasAdmin: false,
        needsSetup: true,
      });
    }

    const adminCount = await prisma.user.count({
      where: {
        roleId: adminRole.id,
        isActive: true,
      },
    });

    return NextResponse.json({
      hasAdmin: adminCount > 0,
      needsSetup: adminCount === 0,
    });
  } catch (error) {
    console.error("Setup check error:", error);
    return NextResponse.json(
      { error: "Failed to check setup" },
      { status: 500 }
    );
  }
}