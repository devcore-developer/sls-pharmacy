import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("session_token")?.value;

    if (!token) {
      return NextResponse.json({ session: null }, { status: 401 });
    }

    const session = await prisma.session.findUnique({
      where: { token },
      include: {
        user: {
          include: { role: true },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ session: null }, { status: 401 });
    }

    // Check expiration
    if (session.expiresAt < new Date()) {
      await prisma.session.delete({ where: { id: session.id } });
      return NextResponse.json({ session: null }, { status: 401 });
    }

    // Check user active status
    if (!session.user.isActive) {
      await prisma.session.delete({ where: { id: session.id } });
      return NextResponse.json({ session: null }, { status: 401 });
    }

    // Parse permissions
    let permissions: string[] = [];
    if (session.user.role.permissions) {
      if (Array.isArray(session.user.role.permissions)) {
        permissions = session.user.role.permissions.filter(
          (p): p is string => typeof p === "string"
        );
      } else if (typeof session.user.role.permissions === "string") {
        try {
          const parsed = JSON.parse(session.user.role.permissions);
          if (Array.isArray(parsed)) {
            permissions = parsed.filter(
              (p): p is string => typeof p === "string"
            );
          }
        } catch {
          // Invalid JSON, use empty array
        }
      }
    }

    return NextResponse.json({
      session: {
        id: session.id,
        userId: session.user.id,
        email: session.user.email,
        name: session.user.name,
        roleName: session.user.role.name,
        roleLabel: session.user.role.label || session.user.role.name,
        permissions,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
      },
    });
  } catch (error) {
    console.error("Session validation error:", error);
    return NextResponse.json({ session: null }, { status: 500 });
  }
}