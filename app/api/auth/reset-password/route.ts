import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, otp, password } = body;

    if (!email || !otp || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "Email, OTP and password are required",
        },
        { status: 400 },
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (password.length < 6) {
      return NextResponse.json(
        {
          success: false,
          message: "Password must be at least 6 characters",
        },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found",
        },
        { status: 404 },
      );
    }

    const otpRecord = await prisma.emailOtp.findFirst({
      where: {
        email: normalizedEmail,
        purpose: "RESET_PASSWORD",
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

    const isValidOtp = await bcrypt.compare(otp.toString(), otpRecord.otpHash);

    if (!isValidOtp) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid OTP",
        },
        { status: 400 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        passwordHash,
      },
    });

    await prisma.session.deleteMany({
      where: {
        userId: user.id,
      },
    });

    await prisma.emailOtp.delete({
      where: {
        id: otpRecord.id,
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
