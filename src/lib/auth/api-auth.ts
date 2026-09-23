import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function verifyApiAuth(req: Request | NextRequest) {
  let token: string | undefined = undefined;

  // 1. محاولة قراءة الـ Token من الـ Authorization Header (للاستخدامات المستقبلية)
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  }

  // 2. إذا لم يجده في الـ Header، يقرأه من الـ Cookie (هذا ما نستخدمه الآن)
  if (!token) {
    if (req instanceof NextRequest) {
      token = req.cookies.get("session_token")?.value;
    } else {
      const cookieHeader = req.headers.get("cookie");
      if (cookieHeader) {
        const cookies = cookieHeader.split(";").map(c => c.trim());
        const sessionCookie = cookies.find(c => c.startsWith("session_token="));
        if (sessionCookie) {
          token = sessionCookie.substring("session_token=".length);
        }
      }
    }
  }

  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: { include: { role: true } } },
  });

  if (!session || !session.user || !session.user.isActive) {
    return null;
  }
  if (session.expiresAt < new Date()) {
    return null;
  }

  return session.user;
}