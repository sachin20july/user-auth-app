"use client";

import { FormEvent, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function VerifyOtpPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const email = searchParams.get("email") || "";

  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");

    if (!otp) {
      setMessage("Please enter the OTP");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          otp,
        }),
      });

      const result = await response.json();

      console.log("OTP verification response:", result);

      if (!response.ok) {
        setMessage(result.message || "OTP verification failed");
        return;
      }

      setMessage("Account created successfully!");

      // We will change this later when authentication/session
      // handling is implemented.
      setTimeout(() => {
        router.push("/");
      }, 1500);
    } catch (error) {
      console.error("OTP verification error:", error);
      setMessage("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border p-6 shadow">
        <h1 className="mb-2 text-2xl font-bold">Verify Your Email</h1>

        <p className="mb-6 text-sm text-gray-600">Enter the OTP sent to:</p>

        <p className="mb-6 font-medium">{email}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="otp" className="mb-1 block text-sm font-medium">
              OTP
            </label>

            <input
              id="otp"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(event) =>
                setOtp(event.target.value.replace(/\D/g, ""))
              }
              placeholder="Enter 6-digit OTP"
              className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-black px-4 py-2 text-white disabled:opacity-50"
          >
            {loading ? "Verifying..." : "Verify OTP"}
          </button>
        </form>

        {message && <p className="mt-4 text-center text-sm">{message}</p>}
      </div>
    </main>
  );
}
