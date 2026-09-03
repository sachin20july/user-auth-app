import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const cookieStore = await cookies();

    const token = cookieStore.get("session_token")?.value;

    if (token) {
      await prisma.session.deleteMany({
        where: {
          token,
        },
      });
    }

    const response = NextResponse.json({
      success: true,
      message: "Logged out successfully",
    });

    response.cookies.delete("session_token");

    return response;
  } catch (error) {
    console.error("Logout API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong",
      },
      { status: 500 },
    );
  }
}
