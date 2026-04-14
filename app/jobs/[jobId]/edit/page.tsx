"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Job = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  employment_type: string | null;
  status: string | null;
};

export default function EditJobPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.jobId as string;

  const [job, setJob] = useState<Job | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [status, setStatus] = useState("open");

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadJob = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      setAuthorized(true);
      setCheckingAuth(false);

      const { data, error } = await supabase
        .from("jobs")
        .select("id, title, description, location, employment_type, status")
        .eq("id", jobId)
        .single();

      if (error) {
        alert(error.message);
        setLoading(false);
        return;
      }

      setJob(data);
      setTitle(data.title || "");
      setDescription(data.description || "");
      setLocation(data.location || "");
      setEmploymentType(data.employment_type || "");
      setStatus(data.status || "open");
      setLoading(false);
    };

    if (jobId) {
      loadJob();
    }
  }, [jobId, router]);

  const handleSaveJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase
      .from("jobs")
      .update({
        title,
        description,
        location,
        employment_type: employmentType,
        status,
      })
      .eq("id", jobId);

    if (error) {
      alert(error.message);
      setSaving(false);
      return;
    }

    alert("Job updated successfully.");
    router.push(`/jobs/${jobId}`);
  };

  if (checkingAuth) {
    return (
      <main className="min-h-screen bg-gray-100">
        <div className="max-w-2xl mx-auto px-6 py-12">
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
      <main className="min-h-screen bg-gray-100">
        <div className="max-w-2xl mx-auto px-6 py-12">
          <p className="text-gray-600">Loading job...</p>
        </div>
      </main>
    );
  }

  if (!job) {
    return (
      <main className="min-h-screen bg-gray-100">
        <div className="max-w-2xl mx-auto px-6 py-12">
          <h1 className="text-3xl font-bold">Job Not Found</h1>
          <button
            onClick={() => router.push("/dashboard")}
            className="mt-6 bg-black text-white px-4 py-2 rounded-lg"
          >
            Back to Dashboard
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <button
          onClick={() => router.push(`/jobs/${jobId}`)}
          className="mb-6 text-sm text-blue-600 hover:underline"
        >
          ← Back to Job
        </button>

        <h1 className="text-3xl font-bold">Edit Job</h1>
        <p className="text-gray-600 mt-2">
          Update this job listing.
        </p>

        <form
          onSubmit={handleSaveJob}
          className="mt-8 space-y-5 bg-white p-6 rounded-xl shadow"
        >
          <div>
            <label className="block text-sm font-medium mb-1">Job Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 min-h-[120px]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Employment Type
            </label>
            <select
              value={employmentType}
              onChange={(e) => setEmploymentType(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
              required
            >
              <option value="">Select one</option>
              <option value="Full-Time">Full-Time</option>
              <option value="Part-Time">Part-Time</option>
              <option value="Contract">Contract</option>
              <option value="Internship">Internship</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            >
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-black text-white px-4 py-2 font-medium disabled:opacity-50"
          >
            {saving ? "Saving Job..." : "Save Job"}
          </button>
        </form>
      </div>
    </main>
  );
}