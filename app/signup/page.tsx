"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      return;
    }

    alert("Signup successful. Check your email to confirm your account.");
    setEmail("");
    setPassword("");
  };

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-md mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold">Sign Up</h1>
        <p className="mt-2 text-gray-600">
          Create your account to start managing hiring.
        </p>

        <form onSubmit={handleSignup} className="mt-8 space-y-4">
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
              placeholder="Enter a password"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-black text-white px-4 py-2 font-medium"
          >
            Create Account
          </button>
        </form>
      </div>
    </main>
  );
}