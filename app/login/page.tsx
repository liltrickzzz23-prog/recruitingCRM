"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      return;
    }

    router.push("/dashboard");
  };

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-md mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold">Log In</h1>
        <p className="mt-2 text-gray-600">
          Log in to access your hiring dashboard.
        </p>

        <form onSubmit={handleLogin} className="mt-8 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
              placeholder="Enter your password"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-black text-white px-4 py-2 font-medium"
          >
            Log In
          </button>
        </form>
      </div>
    </main>
  );
}