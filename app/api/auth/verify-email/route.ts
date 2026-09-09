import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "Activation token is required",
        },
        { status: 400 },
      );
    }

    const tokenHash = createHash("sha256").update(token).digest("hex");

    const emailToken = await prisma.emailToken.findUnique({
      where: {
        tokenHash,
      },
    });

    if (!emailToken) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid or expired activation link",
        },
        { status: 400 },
      );
    }

    if (emailToken.purpose !== "ACTIVATE_ACCOUNT") {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid activation link",
        },
        { status: 400 },
      );
    }

    if (emailToken.expiresAt < new Date()) {
      await prisma.emailToken.delete({
        where: {
          id: emailToken.id,
        },
      });

      return NextResponse.json(
        {
          success: false,
          message: "Activation link has expired",
        },
        { status: 400 },
      );
    }

    const registration = await prisma.registration.findUnique({
      where: {
        email: emailToken.email,
      },
    });

    if (!registration) {
      return NextResponse.json(
        {
          success: false,
          message: "Registration not found",
        },
        { status: 404 },
      );
    }

    if (registration.expiresAt < new Date()) {
      await prisma.registration.delete({
        where: {
          id: registration.id,
        },
      });

      await prisma.emailToken.delete({
        where: {
          id: emailToken.id,
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

    const existingUser = await prisma.user.findUnique({
      where: {
        email: registration.email,
      },
    });

    if (existingUser) {
      await prisma.emailToken.delete({
        where: {
          id: emailToken.id,
        },
      });

      await prisma.registration.delete({
        where: {
          id: registration.id,
        },
      });

      return NextResponse.json(
        {
          success: false,
          message: "An account already exists with this email",
        },
        { status: 409 },
      );
    }

    const user = await prisma.user.create({
      data: {
        email: registration.email,
        name: registration.name,
        passwordHash: registration.passwordHash,
        emailVerified: true,
      },
    });

    await prisma.registration.delete({
      where: {
        id: registration.id,
      },
    });

    await prisma.emailToken.delete({
      where: {
        id: emailToken.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Email verified and account created successfully",
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      },
    });
  } catch (error) {
    console.error("Email verification API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong",
      },
      { status: 500 },
    );
  }
}
