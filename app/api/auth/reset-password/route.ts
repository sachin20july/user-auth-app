import { NextResponse } from "next/server";
import { createHash } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
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

    // Update password
    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        passwordHash,
      },
    });

    // Invalidate all existing sessions
    await prisma.session.deleteMany({
      where: {
        userId: user.id,
      },
    });

    // Delete the used reset token
    await prisma.emailToken.delete({
      where: {
        id: emailToken.id,
      },
    });

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
