"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Turnstile } from "@marsidev/react-turnstile";

import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export default function LoginPage() {
  const router = useRouter();
  const [turnstileToken, setTurnstileToken] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email");
    const password = formData.get("password");

    console.log("Login form submitted");
    console.log("Email:", email);

    if (!turnstileToken) {
      alert("Please complete the CAPTCHA");
      return;
    }

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          turnstileToken,
        }),
      });

      const result = await response.json();

      console.log("Login API response:", result);

      if (!response.ok) {
        alert(result.message || "Login failed");
        return;
      }

      router.push("/home");
    } catch (error) {
      console.error("Login error:", error);
      alert("Something went wrong");
    }
  }

  return (
    <main className="flex min-h-screen m-10 items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border p-8 shadow">
        <h1 className="mb-6 text-2xl font-bold">Login</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">
              Email
            </label>

            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium"
            >
              Password
            </label>

            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>

          <div className="flex justify-center">
            <Turnstile
              siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
              onSuccess={(token) => {
                setTurnstileToken(token);
              }}
              onExpire={() => {
                setTurnstileToken("");
              }}
              onError={() => {
                setTurnstileToken("");
              }}
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg border border-black-600 bg-blue-400 px-4 py-2 text-black transition duration-200 hover:bg-blue-800 hover:text-white hover:shadow-lg"
          >
            Login
          </button>
        </form>

        <div className="mt-6 flex justify-between text-sm">
          <a href="/register" className="text-blue-600 hover:underline">
            Create Account
          </a>

          <a href="/forgot-password" className="text-blue-600 hover:underline">
            Forgot Password?
          </a>
        </div>
      </div>
    </main>
  );
}
