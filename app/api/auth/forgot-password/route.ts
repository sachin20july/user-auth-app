import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendOtpEmail } from "@/lib/email";

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

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash the OTP before storing it
    const otpHash = await bcrypt.hash(otp, 10);

    // OTP valid for 10 minutes
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Remove previous password-reset OTPs
    await prisma.emailOtp.deleteMany({
      where: {
        email: normalizedEmail,
        purpose: "RESET_PASSWORD",
      },
    });

    // Store new OTP
    await prisma.emailOtp.create({
      data: {
        email: normalizedEmail,
        otpHash,
        expiresAt,
        attempts: 0,
        purpose: "RESET_PASSWORD",
      },
    });

    // Send OTP
    await sendOtpEmail(normalizedEmail, otp);

    return NextResponse.json({
      success: true,
      message: "OTP sent successfully",
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
