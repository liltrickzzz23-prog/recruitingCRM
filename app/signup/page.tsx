"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const invitedEmail = searchParams.get("email");

    if (invitedEmail) {
      setEmail(invitedEmail);
    }
  }, [searchParams]);

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();

    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (signupError) {
      alert(signupError.message);
      setLoading(false);
      return;
    }

    const user = signupData.user;

    if (!user) {
      alert("Signup completed, but no user was returned.");
      setLoading(false);
      return;
    }

    const { data: inviteData, error: inviteLookupError } = await supabase
      .from("team_invitations")
      .select("id, team_id, status")
      .eq("email", cleanEmail)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (inviteLookupError) {
      alert(inviteLookupError.message);
      setLoading(false);
      return;
    }

    if (inviteData?.team_id) {
      const { error: profileUpdateError } = await supabase
        .from("profiles")
        .update({
          team_id: inviteData.team_id,
          role: "recruiter",
        })
        .eq("id", user.id);

      if (profileUpdateError) {
        alert(profileUpdateError.message);
        setLoading(false);
        return;
      }

      const { error: inviteUpdateError } = await supabase
        .from("team_invitations")
        .update({
          status: "accepted",
        })
        .eq("id", inviteData.id);

      if (inviteUpdateError) {
        alert(inviteUpdateError.message);
        setLoading(false);
        return;
      }
    }

    alert("Account created successfully.");
    setLoading(false);
    router.push("/dashboard");
  };

  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md bg-white rounded-xl shadow p-8">
        <h1 className="text-3xl font-bold">Create Account</h1>
        <p className="text-gray-600 mt-2">
          Sign up to use your Recruiting CRM account.
        </p>

        <form onSubmit={handleSignup} className="mt-8 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
              placeholder="Your name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Email
            </label>
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
            <label className="block text-sm font-medium mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
              placeholder="Create a password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white px-4 py-3 rounded-lg disabled:opacity-50"
          >
            {loading ? "Creating Account..." : "Sign Up"}
          </button>
        </form>

        <button
          onClick={() => router.push("/login")}
          className="mt-4 w-full text-sm text-blue-600 hover:underline"
        >
          Already have an account? Log in
        </button>
      </div>
    </main>
  );
}