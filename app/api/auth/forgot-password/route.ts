import { NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";
import {
  forgotPasswordIpRateLimit,
  forgotPasswordEmailRateLimit,
} from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    // Get client IP address
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ip =
      forwardedFor?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    // Rate limit by IP address
    const ipLimit = await forgotPasswordIpRateLimit.limit(ip);

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

    // Rate limit by email address
    const emailLimit =
      await forgotPasswordEmailRateLimit.limit(normalizedEmail);

    if (!emailLimit.success) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Too many password reset attempts for this email address. Please try again later.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(
              Math.max(1, Math.ceil((emailLimit.reset - Date.now()) / 1000)),
            ),
          },
        },
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    // Do not reveal whether an account exists.
    if (!user || !user.emailVerified) {
      return NextResponse.json({
        success: true,
        message:
          "If an account exists with this email, a password reset link has been sent.",
      });
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
      message:
        "If an account exists with this email, a password reset link has been sent.",
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
