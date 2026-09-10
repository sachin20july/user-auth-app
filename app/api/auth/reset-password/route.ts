import { NextResponse } from "next/server";
import { createHash } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { resetPasswordIpRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ip =
      forwardedFor?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const ipLimit = await resetPasswordIpRateLimit.limit(ip);

    if (!ipLimit.success) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Too many password reset attempts from this IP address. Please try again later.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(
              Math.max(1, Math.ceil((ipLimit.reset - Date.now()) / 1000)),
            ),
          },
        },
      );
    }

    const body = await request.json();
    const { token, password } = body;

    if (!token || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "Reset token and password are required",
        },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        {
          success: false,
          message: "Password must be at least 6 characters",
        },
        { status: 400 },
      );
    }

    // Hash the token received from the reset link
    const tokenHash = createHash("sha256").update(token).digest("hex");

    // Find the reset token
    const emailToken = await prisma.emailToken.findUnique({
      where: {
        tokenHash,
      },
    });

    if (!emailToken) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid or expired reset link",
        },
        { status: 400 },
      );
    }

    // Make sure this token is for password reset
    if (emailToken.purpose !== "RESET_PASSWORD") {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid reset link",
        },
        { status: 400 },
      );
    }

    // Check expiration
    if (emailToken.expiresAt < new Date()) {
      await prisma.emailToken.delete({
        where: {
          id: emailToken.id,
        },
      });

      return NextResponse.json(
        {
          success: false,
          message: "Reset link has expired",
        },
        { status: 400 },
      );
    }

    // Find the user
    const user = await prisma.user.findUnique({
      where: {
        email: emailToken.email,
      },
    });

    if (!user) {
      await prisma.emailToken.delete({
        where: {
          id: emailToken.id,
        },
      });

      return NextResponse.json(
        {
          success: false,
          message: "User account not found",
        },
        { status: 404 },
      );
    }

    // Hash the new password
    const passwordHash = await bcrypt.hash(password, 12);

    // Update password, invalidate all sessions,
    // and consume the reset token atomically.
    await prisma.$transaction([
      prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          passwordHash,
        },
      }),

      prisma.session.deleteMany({
        where: {
          userId: user.id,
        },
      }),

      prisma.emailToken.delete({
        where: {
          id: emailToken.id,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Reset password API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong",
      },
      { status: 500 },
    );
  }
}
