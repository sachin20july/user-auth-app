import { NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { sendActivationEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
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

    const normalizedEmail = email.trim().toLowerCase();

    // --------------------------------------------------
    // 1. Check if a verified account already exists
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
    // 2. Check for an existing pending registration
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
          data: { email: normalizedEmail },
          pendingVerification: true,
        },
        { status: 409 },
      );
    }

    // --------------------------------------------------
    // 3. Create new pending registration
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
    // 4. Generate secure activation token
    // --------------------------------------------------

    const token = randomBytes(32).toString("hex");

    // Store only the hash in database
    const tokenHash = createHash("sha256").update(token).digest("hex");

    // --------------------------------------------------
    // 5. Remove previous activation token
    // --------------------------------------------------

    await prisma.emailToken.deleteMany({
      where: {
        email: normalizedEmail,
        purpose: "ACTIVATE_ACCOUNT",
      },
    });

    // --------------------------------------------------
    // 6. Store new activation token hash
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
    // 7. Send activation email
    // --------------------------------------------------

    await sendActivationEmail(normalizedEmail, token);

    // --------------------------------------------------
    // 8. Return success
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
