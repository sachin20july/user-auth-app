"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      console.log("Forgot password response:", result);

      if (!response.ok) {
        setMessage(result.message || "Something went wrong");
        return;
      }

      router.push(
        `/reset-password?email=${encodeURIComponent(email.trim().toLowerCase())}`,
      );
    } catch (error) {
      console.error("Forgot password error:", error);
      setMessage("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border p-8 shadow">
        <h1 className="mb-2 text-2xl font-bold">Forgot Password</h1>

        <p className="mb-6 text-sm text-gray-600">
          Enter your registered email address and we will send you an OTP.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">
              Email
            </label>

            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border px-3 py-2"
              placeholder="Enter your email"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg border border-black-600 bg-blue-400 px-4 py-2 text-black transition duration-200 hover:bg-blue-800 hover:text-white hover:shadow-lg"
          >
            {loading ? "Sending OTP..." : "Send OTP"}
          </button>
        </form>

        {message && <p className="mt-4 text-center text-sm">{message}</p>}

        <div className="mt-6 text-center text-sm">
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="text-blue-600 hover:underline"
          >
            Back to Login
          </button>
        </div>
      </div>
    </main>
  );
}
