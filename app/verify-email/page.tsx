"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = searchParams.get("token") || "";

  const [message, setMessage] = useState("Verifying your email...");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setMessage("Invalid activation link.");
      setLoading(false);
      return;
    }

    async function verifyEmail() {
      try {
        const response = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token,
          }),
        });

        const result = await response.json();

        console.log("Email verification response:", result);

        if (!response.ok) {
          setMessage(result.message || "Email verification failed");
          return;
        }

        setMessage("Email verified successfully!");

        setTimeout(() => {
          router.push("/login");
        }, 1500);
      } catch (error) {
        console.error("Email verification error:", error);
        setMessage("Something went wrong");
      } finally {
        setLoading(false);
      }
    }

    verifyEmail();
  }, [token, router]);

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border p-8 text-center shadow">
        <h1 className="mb-4 text-2xl font-bold">Email Verification</h1>

        <p className="text-gray-600">{message}</p>

        {loading && <div className="mt-4">Please wait...</div>}

        {!loading && message === "Email verified successfully!" && (
          <p className="mt-4 text-sm text-gray-500">Redirecting to login...</p>
        )}

        {!loading && (
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="mt-6 rounded-lg border border-black bg-transparent px-4 py-2 text-black transition duration-200 hover:bg-black hover:text-white"
          >
            Go to Login
          </button>
        )}
      </div>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
