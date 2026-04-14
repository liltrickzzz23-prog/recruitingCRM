"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function NewJobPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      alert("You must be logged in to create a job.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("jobs").insert([
      {
        user_id: session.user.id,
        title,
        description,
        location,
        employment_type: employmentType,
      },
    ]);

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    alert("Job created successfully.");
    router.push("/dashboard");
  };

  return (
    <main className="min-h-screen bg-gray-100">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold">Create New Job</h1>
        <p className="text-gray-600 mt-2">
          Add a new job posting to your recruiting dashboard.
        </p>

        <form
          onSubmit={handleCreateJob}
          className="mt-8 space-y-5 bg-white p-6 rounded-xl shadow"
        >
          <div>
            <label className="block text-sm font-medium mb-1">Job Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
              placeholder="Example: Sales Associate"
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
              placeholder="Describe the role, responsibilities, and requirements"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
              placeholder="Example: Atlanta, GA"
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

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-black text-white px-4 py-2 font-medium disabled:opacity-50"
          >
            {loading ? "Creating Job..." : "Create Job"}
          </button>
        </form>
      </div>
    </main>
  );
}