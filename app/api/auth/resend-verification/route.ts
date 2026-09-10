import { NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendActivationEmail } from "@/lib/email";
import {
  resendVerificationIpRateLimit,
  resendVerificationEmailRateLimit,
} from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const forwardedFor = request.headers.get("x-forwarded-for");

    const ip =
      forwardedFor?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const ipLimit = await resendVerificationIpRateLimit.limit(ip);

    if (!ipLimit.success) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Too many verification email requests from this IP address. Please try again later.",
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

    const emailLimit =
      await resendVerificationEmailRateLimit.limit(normalizedEmail);

    if (!emailLimit.success) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Too many verification email requests for this email address. Please try again later.",
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

    // Check if the account already exists
    const existingUser = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          message: "Email already registered",
        },
        { status: 409 },
      );
    }

    // Find pending registration
    const registration = await prisma.registration.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    if (!registration) {
      return NextResponse.json(
        {
          success: false,
          message: "No pending registration found",
        },
        { status: 404 },
      );
    }

    // Check whether the pending registration has expired
    if (registration.expiresAt < new Date()) {
      await prisma.registration.delete({
        where: {
          id: registration.id,
        },
      });

      await prisma.emailToken.deleteMany({
        where: {
          email: normalizedEmail,
          purpose: "ACTIVATE_ACCOUNT",
        },
      });

      return NextResponse.json(
        {
          success: false,
          message: "Your registration has expired. Please register again.",
        },
        { status: 400 },
      );
    }

    // Generate a new secure activation token
    const token = randomBytes(32).toString("hex");

    // Store only the token hash
    const tokenHash = createHash("sha256").update(token).digest("hex");

    // New activation link validity: 24 hours
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Update registration expiry
    await prisma.registration.update({
      where: {
        id: registration.id,
      },
      data: {
        expiresAt,
      },
    });

    // Remove previous activation token
    await prisma.emailToken.deleteMany({
      where: {
        email: normalizedEmail,
        purpose: "ACTIVATE_ACCOUNT",
      },
    });

    // Store new activation token
    await prisma.emailToken.create({
      data: {
        email: normalizedEmail,
        tokenHash,
        expiresAt,
        purpose: "ACTIVATE_ACCOUNT",
      },
    });

    // Send new activation email
    await sendActivationEmail(normalizedEmail, token);

    return NextResponse.json({
      success: true,
      message:
        "A new verification email has been sent. Please check your inbox and verify your email.",
      data: {
        email: normalizedEmail,
      },
    });
  } catch (error) {
    console.error("Resend verification API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong",
      },
      { status: 500 },
    );
  }
}
