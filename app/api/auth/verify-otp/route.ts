import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { email, otp } = body;

    if (!email || !otp) {
      return NextResponse.json(
        {
          success: false,
          message: "Email and OTP are required",
        },
        { status: 400 },
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Find the latest registration OTP
    const otpRecord = await prisma.emailOtp.findFirst({
      where: {
        email: normalizedEmail,
        purpose: "REGISTER",
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!otpRecord) {
      return NextResponse.json(
        {
          success: false,
          message: "OTP not found",
        },
        { status: 404 },
      );
    }

    // Check OTP expiration
    if (otpRecord.expiresAt < new Date()) {
      await prisma.emailOtp.delete({
        where: {
          id: otpRecord.id,
        },
      });

      return NextResponse.json(
        {
          success: false,
          message: "OTP has expired",
        },
        { status: 400 },
      );
    }

    // Compare entered OTP with stored hash
    const isValid = await bcrypt.compare(otp.toString(), otpRecord.otpHash);

    if (!isValid) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid OTP",
        },
        { status: 400 },
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
          message: "Registration data not found",
        },
        { status: 404 },
      );
    }

    // Check registration expiration
    if (registration.expiresAt < new Date()) {
      await prisma.registration.delete({
        where: {
          id: registration.id,
        },
      });

      await prisma.emailOtp.delete({
        where: {
          id: otpRecord.id,
        },
      });

      return NextResponse.json(
        {
          success: false,
          message: "Registration has expired",
        },
        { status: 400 },
      );
    }

    // Create the user
    const user = await prisma.user.create({
      data: {
        email: registration.email,
        name: registration.name,
        passwordHash: registration.passwordHash,
        emailVerified: true,
      },
    });

    // OTP and temporary registration are no longer needed
    await prisma.emailOtp.delete({
      where: {
        id: otpRecord.id,
      },
    });

    await prisma.registration.delete({
      where: {
        id: registration.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Account created successfully",
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      },
    });
  } catch (error) {
    console.error("OTP verification error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong",
      },
      { status: 500 },
    );
  }
}
