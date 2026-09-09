"use client";

import { FormEvent, useState } from "react";

export default function RegisterPage() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [pendingEmail, setPendingEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;

    setMessage("");
    setError("");
    setResendMessage("");
    setPendingEmail("");
    setLoading(true);

    const formData = new FormData(form);

    const name = formData.get("name");
    const email = formData.get("email");
    const password = formData.get("password");

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
        }),
      });

      const result = await response.json();

      console.log("API response:", result);

      if (!response.ok) {
        if (result.pendingVerification) {
          setPendingEmail(result.data?.email || String(email));
          setMessage(result.message);
        } else {
          setError(result.message || "Registration failed");
        }

        return;
      }

      setMessage(
        "Activation link has been sent to your registered email address. Please check your inbox and click the link to verify your account.",
      );

      form.reset();
    } catch (error) {
      console.error("Registration error:", error);

      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendVerification() {
    if (!pendingEmail) {
      return;
    }

    setResending(true);
    setResendMessage("");
    setError("");

    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: pendingEmail,
        }),
      });

      const result = await response.json();

      console.log("Resend verification response:", result);

      if (!response.ok) {
        setError(result.message || "Unable to resend verification email");
        return;
      }

      setResendMessage(
        "A new verification email has been sent. Please check your inbox.",
      );
    } catch (error) {
      console.error("Resend verification error:", error);

      setError("Something went wrong");
    } finally {
      setResending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-lg border p-8 shadow">
        <h1 className="mb-6 text-2xl font-bold">Create Account</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-medium">
              Name
            </label>

            <input
              id="name"
              name="name"
              type="text"
              required
              className="w-full rounded border px-3 py-2"
            />
          </div>

          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">
              Email
            </label>

            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full rounded border px-3 py-2"
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
              className="w-full rounded border px-3 py-2"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg border border-black bg-blue-400 px-4 py-2 text-black transition duration-200 hover:bg-blue-800 hover:text-white hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Registering..." : "Register"}
          </button>
        </form>

        {message && (
          <div className="mt-6 rounded-lg border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-800">
            <p className="font-bold text-center">
              {pendingEmail
                ? "Verification Required"
                : "Registration successful!"}
            </p>

            <p className="mt-1">{message}</p>

            {pendingEmail && (
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={resending}
                className="mt-4 w-full rounded-lg border border-black bg-transparent px-4 py-2 text-black transition duration-200 hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {resending ? "Sending..." : "Resend Verification Email"}
              </button>
            )}

            {resendMessage && (
              <p className="mt-3 text-green-700">{resendMessage}</p>
            )}
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}
      </div>
    </main>
  );
}
