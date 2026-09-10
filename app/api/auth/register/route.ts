import { NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendActivationEmail } from "@/lib/email";
import {
  registrationIpRateLimit,
  registrationEmailRateLimit,
} from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    // --------------------------------------------------
    // 1. Get client IP address
    // --------------------------------------------------

    const forwardedFor = request.headers.get("x-forwarded-for");

    const ip =
      forwardedFor?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    // --------------------------------------------------
    // 2. IP-based rate limit
    // --------------------------------------------------

    const ipLimit = await registrationIpRateLimit.limit(ip);

    if (!ipLimit.success) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Too many registration attempts from this IP address. Please try again later.",
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

    // --------------------------------------------------
    // 3. Read request body
    // --------------------------------------------------

    const body = await request.json();

    const { name, email, password } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "Name, email and password are required",
        },
        { status: 400 },
      );
    }

    // --------------------------------------------------
    // 4. Normalize email
    // --------------------------------------------------

    const normalizedEmail = email.trim().toLowerCase();

    // --------------------------------------------------
    // 5. Email-based rate limit
    // --------------------------------------------------

    const emailLimit = await registrationEmailRateLimit.limit(normalizedEmail);

    if (!emailLimit.success) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Too many registration attempts for this email address. Please try again later.",
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

    // --------------------------------------------------
    // 6. Check if a verified account already exists
    // --------------------------------------------------

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

    // --------------------------------------------------
    // 7. Check for an existing pending registration
    // --------------------------------------------------

    const existingRegistration = await prisma.registration.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    if (existingRegistration) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Verification email already sent. Please check your email and verify your account.",
          data: {
            email: normalizedEmail,
          },
          pendingVerification: true,
        },
        { status: 409 },
      );
    }

    // --------------------------------------------------
    // 8. Create new pending registration
    // --------------------------------------------------

    const passwordHash = await bcrypt.hash(password, 12);

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.registration.create({
      data: {
        email: normalizedEmail,
        name: name.trim(),
        passwordHash,
        expiresAt,
      },
    });

    // --------------------------------------------------
    // 9. Generate secure activation token
    // --------------------------------------------------

    const token = randomBytes(32).toString("hex");

    // Store only the hash in database
    const tokenHash = createHash("sha256").update(token).digest("hex");

    // --------------------------------------------------
    // 10. Remove previous activation token
    // --------------------------------------------------

    await prisma.emailToken.deleteMany({
      where: {
        email: normalizedEmail,
        purpose: "ACTIVATE_ACCOUNT",
      },
    });

    // --------------------------------------------------
    // 11. Store new activation token hash
    // --------------------------------------------------

    await prisma.emailToken.create({
      data: {
        email: normalizedEmail,
        tokenHash,
        expiresAt,
        purpose: "ACTIVATE_ACCOUNT",
      },
    });

    // --------------------------------------------------
    // 12. Send activation email
    // --------------------------------------------------

    await sendActivationEmail(normalizedEmail, token);

    // --------------------------------------------------
    // 13. Return success
    // --------------------------------------------------

    return NextResponse.json({
      success: true,
      message:
        "Activation link sent successfully. Please check your email to verify your account.",
      data: {
        email: normalizedEmail,
      },
    });
  } catch (error) {
    console.error("Registration API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong",
      },
      { status: 500 },
    );
  }
}
