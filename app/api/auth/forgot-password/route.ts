import { NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          message: "Email is required",
        },
        { status: 400 },
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "No account found with this email",
        },
        { status: 404 },
      );
    }

    if (!user.emailVerified) {
      return NextResponse.json(
        {
          success: false,
          message: "Please verify your email first",
        },
        { status: 403 },
      );
    }

    // Generate secure random reset token
    const token = randomBytes(32).toString("hex");

    // Store only the hash of the token
    const tokenHash = createHash("sha256").update(token).digest("hex");

    // Reset link will be valid for 30 minutes
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    // Remove previous reset tokens for this email
    await prisma.emailToken.deleteMany({
      where: {
        email: normalizedEmail,
        purpose: "RESET_PASSWORD",
      },
    });

    // Store reset token hash
    await prisma.emailToken.create({
      data: {
        email: normalizedEmail,
        tokenHash,
        expiresAt,
        purpose: "RESET_PASSWORD",
      },
    });

    // Send password reset link
    await sendPasswordResetEmail(normalizedEmail, token);

    return NextResponse.json({
      success: true,
      message: "Password reset link sent successfully",
      data: {
        email: normalizedEmail,
      },
    });
  } catch (error) {
    console.error("Forgot password API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong",
      },
      { status: 500 },
    );
  }
}
