import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendOtpEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { name, email, password } = body;

    // Validate required fields
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

    // Check whether the user already exists
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

    // Hash the password
    const passwordHash = await bcrypt.hash(password, 12);

    // Registration data and OTP are valid for 10 minutes
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Remove any previous pending registration
    await prisma.registration.deleteMany({
      where: {
        email: normalizedEmail,
      },
    });

    // Save pending registration
    await prisma.registration.create({
      data: {
        email: normalizedEmail,
        name: name.trim(),
        passwordHash,
        expiresAt,
      },
    });

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash OTP before storing it
    const otpHash = await bcrypt.hash(otp, 10);

    // Remove previous registration OTP
    await prisma.emailOtp.deleteMany({
      where: {
        email: normalizedEmail,
        purpose: "REGISTER",
      },
    });

    // Save hashed OTP
    await prisma.emailOtp.create({
      data: {
        email: normalizedEmail,
        otpHash,
        expiresAt,
        attempts: 0,
        purpose: "REGISTER",
      },
    });

    // Send OTP
    // Currently prints OTP to the server console.
    // Later this function will send a real email.
    await sendOtpEmail(normalizedEmail, otp);

    return NextResponse.json({
      success: true,
      message: "OTP sent successfully",
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
