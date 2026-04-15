"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  company_name: string | null;
  company_logo_url: string | null;
  recruiter_signature: string | null;
};

export default function SettingsPage() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyLogoUrl, setCompanyLogoUrl] = useState("");
  const [recruiterSignature, setRecruiterSignature] = useState("");

  useEffect(() => {
    const loadSettings = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      setAuthorized(true);
      setCheckingAuth(false);

      const currentUserId = session.user.id;
      const currentEmail = session.user.email || "";

      setUserId(currentUserId);
      setEmail(currentEmail);

      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, email, full_name, company_name, company_logo_url, recruiter_signature"
        )
        .eq("id", currentUserId)
        .maybeSingle();

      if (error) {
        alert(error.message);
        setLoading(false);
        return;
      }

      if (data) {
        const profile = data as Profile;
        setFullName(profile.full_name || "");
        setCompanyName(profile.company_name || "");
        setCompanyLogoUrl(profile.company_logo_url || "");
        setRecruiterSignature(profile.recruiter_signature || "");
      }

      setLoading(false);
    };

    loadSettings();
  }, [router]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase.from("profiles").upsert({
      id: userId,
      email,
      full_name: fullName || null,
      company_name: companyName || null,
      company_logo_url: companyLogoUrl || null,
      recruiter_signature: recruiterSignature || null,
    });

    if (error) {
      alert(error.message);
      setSaving(false);
      return;
    }

    alert("Settings saved.");
    setSaving(false);
  };

  if (checkingAuth) {
    return (
      <main className="min-h-screen bg-gray-100 px-6 py-12">
        <div className="max-w-3xl mx-auto">
          <p className="text-gray-600">Checking access...</p>
        </div>
      </main>
    );
  }

  if (!authorized) {
    return null;
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 px-6 py-12">
        <div className="max-w-3xl mx-auto">
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 px-6 py-12">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => router.push("/dashboard")}
          className="mb-6 text-sm text-blue-600 hover:underline"
        >
          ← Back to Dashboard
        </button>

        <div className="bg-white rounded-xl shadow p-8">
          <h1 className="text-3xl font-bold">Company Settings</h1>
          <p className="text-gray-600 mt-2">
            Save your branding and recruiter information.
          </p>

          <form onSubmit={handleSaveSettings} className="mt-8 space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1">
                Recruiter Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                placeholder="Your name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Company Name
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                placeholder="Your company name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Company Logo URL
              </label>
              <input
                type="text"
                value={companyLogoUrl}
                onChange={(e) => setCompanyLogoUrl(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                placeholder="https://yourcompany.com/logo.png"
              />
            </div>

            {companyLogoUrl && (
              <div>
                <p className="text-sm font-medium mb-2">Logo Preview</p>
                <img
                  src={companyLogoUrl}
                  alt="Company logo preview"
                  className="h-16 w-auto border border-gray-200 rounded-lg p-2 bg-white"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">
                Recruiter Signature
              </label>
              <textarea
                value={recruiterSignature}
                onChange={(e) => setRecruiterSignature(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 min-h-[140px]"
                placeholder={`Best,\nYour Name\nYour Company`}
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg bg-black text-white px-4 py-2 font-medium disabled:opacity-50"
            >
              {saving ? "Saving Settings..." : "Save Settings"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}