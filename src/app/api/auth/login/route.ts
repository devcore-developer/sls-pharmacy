import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { role: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: "Your account is inactive. Contact your administrator." },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(password, {
      hash: user.passwordHash,
      salt: user.passwordSalt,
      algorithm: user.passwordAlgorithm,
      iterations: user.passwordIterations,
    });

    if (!valid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Create session token
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    // Parse permissions from JSON
    let permissions: string[] = [];
    if (user.role.permissions) {
      if (Array.isArray(user.role.permissions)) {
        permissions = user.role.permissions.filter(
          (p): p is string => typeof p === "string"
        );
      } else if (typeof user.role.permissions === "string") {
        try {
          const parsed = JSON.parse(user.role.permissions);
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

    // Set httpOnly session cookie
    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roleName: user.role.name,
        roleLabel: user.role.label || user.role.name,
        permissions,
      },
    });

    response.cookies.set("session_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: expiresAt,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}