"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
    });

    const result = await response.json();

    if (!response.ok) {
      alert(result.message || "Logout failed");
      return;
    }

    router.push("/login");
  }

  return (
    <button
      onClick={handleLogout}
      className="rounded-lg bg-black px-4 py-2 text-white"
    >
      Logout
    </button>
  );
}
