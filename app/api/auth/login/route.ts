import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginIpRateLimit, loginEmailRateLimit } from "@/lib/rate-limit";

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

    const ipLimit = await loginIpRateLimit.limit(ip);

    if (!ipLimit.success) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Too many login attempts from this IP address. Please try again later.",
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

    const { email, password, turnstileToken } = body;

    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "Email and password are required",
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

    const emailLimit = await loginEmailRateLimit.limit(normalizedEmail);

    if (!emailLimit.success) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Too many login attempts for this email address. Please try again later.",
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
    // 6. Check Turnstile CAPTCHA
    // --------------------------------------------------

    if (!turnstileToken) {
      return NextResponse.json(
        {
          success: false,
          message: "Please complete the CAPTCHA",
        },
        { status: 400 },
      );
    }

    // --------------------------------------------------
    // 7. Verify Turnstile token with Cloudflare
    // --------------------------------------------------

    const turnstileResponse = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          secret: process.env.TURNSTILE_SECRET_KEY || "",
          response: turnstileToken,
        }),
      },
    );

    const turnstileResult = await turnstileResponse.json();

    console.log("Turnstile verification:", turnstileResult.success);

    if (!turnstileResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: "CAPTCHA verification failed",
        },
        { status: 403 },
      );
    }

    // --------------------------------------------------
    // 8. Find user
    // --------------------------------------------------

    const user = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid email or password",
        },
        { status: 401 },
      );
    }

    // --------------------------------------------------
    // 9. Check email verification
    // --------------------------------------------------

    if (!user.emailVerified) {
      return NextResponse.json(
        {
          success: false,
          message: "Please verify your email first",
        },
        { status: 403 },
      );
    }

    // --------------------------------------------------
    // 10. Check password availability
    // --------------------------------------------------

    if (!user.passwordHash) {
      return NextResponse.json(
        {
          success: false,
          message: "Password login is not available for this account",
        },
        { status: 401 },
      );
    }

    // --------------------------------------------------
    // 11. Verify password
    // --------------------------------------------------

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid email or password",
        },
        { status: 401 },
      );
    }

    // --------------------------------------------------
    // 12. Create session
    // --------------------------------------------------

    const token = randomBytes(32).toString("hex");

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    // --------------------------------------------------
    // 13. Set session cookie
    // --------------------------------------------------

    const response = NextResponse.json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      },
    });

    response.cookies.set("session_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    });

    return response;
  } catch (error) {
    console.error("Login API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong",
      },
      { status: 500 },
    );
  }
}
