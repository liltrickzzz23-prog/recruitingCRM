"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Profile = {
  id: string;
  team_id: string | null;
};

export default function NewJobPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [employmentType, setEmploymentType] = useState("");

  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [userId, setUserId] = useState("");
  const [teamId, setTeamId] = useState<string | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      setUserId(session.user.id);

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, team_id")
        .eq("id", session.user.id)
        .maybeSingle();

      if (profileError) {
        alert(profileError.message);
        setCheckingAuth(false);
        return;
      }

      setTeamId(profileData?.team_id || null);
      setCheckingAuth(false);
    };

    loadUser();
  }, [router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      alert("Please enter a job title.");
      return;
    }

    if (!description.trim()) {
      alert("Please enter a description.");
      return;
    }

    if (!location.trim()) {
      alert("Please enter a location.");
      return;
    }

    if (!employmentType.trim()) {
      alert("Please choose an employment type.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from("jobs")
      .insert({
        user_id: userId,
        team_id: teamId,
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        employment_type: employmentType,
        status: "open",
      })
      .select("id")
      .single();

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    router.push(`/jobs/${data.id}`);
  };

  if (checkingAuth) {
    return (
      <main className="min-h-screen bg-gray-100 px-6 py-12">
        <div className="max-w-3xl mx-auto">
          <p className="text-gray-600">Loading...</p>
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
          <h1 className="text-4xl font-bold">Create New Job</h1>
          <p className="text-gray-600 mt-2">
            Add a new job posting to your recruiting dashboard.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2">
                Job Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-3"
                placeholder="Example: Sales Associate"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 min-h-[140px]"
                placeholder="Describe the role, responsibilities, and requirements"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-3"
                placeholder="Example: Atlanta, GA"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Employment Type
              </label>
              <select
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-3"
                required
              >
                <option value="">Select one</option>
                <option value="Full-Time">Full-Time</option>
                <option value="Part-Time">Part-Time</option>
                <option value="Contract">Contract</option>
                <option value="Internship">Internship</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white px-4 py-3 rounded-lg disabled:opacity-50"
            >
              {loading ? "Creating Job..." : "Create Job"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}