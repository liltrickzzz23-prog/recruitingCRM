"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Job = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  employment_type: string | null;
};

export default function ApplyPage() {
  const params = useParams();
  const jobId = params.jobId as string;

  const [job, setJob] = useState<Job | null>(null);
  const [loadingJob, setLoadingJob] = useState(true);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const loadJob = async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("id, title, description, location, employment_type")
        .eq("id", jobId)
        .single();

      if (error) {
        console.error("Error loading job:", error.message);
        setLoadingJob(false);
        return;
      }

      setJob(data);
      setLoadingJob(false);
    };

    if (jobId) {
      loadJob();
    }
  }, [jobId]);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    let resumeUrl: string | null = null;

    if (resumeFile) {
      const fileExt = resumeFile.name.split(".").pop();
      const safeName = fullName.trim().replace(/\s+/g, "-").toLowerCase();
      const fileName = `${jobId}-${Date.now()}-${safeName}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(fileName, resumeFile);

      if (uploadError) {
        alert(uploadError.message);
        setSubmitting(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("resumes")
        .getPublicUrl(fileName);

      resumeUrl = publicUrlData.publicUrl;
    }

    const { error } = await supabase.from("candidates").insert([
      {
        job_id: jobId,
        full_name: fullName,
        email,
        phone,
        linkedin_url: linkedinUrl,
        resume_url: resumeUrl,
        stage: "Applied",
      },
    ]);

    if (error) {
      alert(error.message);
      setSubmitting(false);
      return;
    }

    setSubmitted(true);
    setSubmitting(false);
  };

  if (loadingJob) {
    return (
      <main className="min-h-screen bg-gray-100 px-6 py-12">
        <div className="max-w-3xl mx-auto">
          <p className="text-gray-600">Loading job...</p>
        </div>
      </main>
    );
  }

  if (!job) {
    return (
      <main className="min-h-screen bg-gray-100 px-6 py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold">Job Not Found</h1>
          <p className="text-gray-600 mt-2">
            We could not find that job posting.
          </p>
        </div>
      </main>
    );
  }

  if (submitted) {
    return (
      <main className="min-h-screen bg-gray-100 px-6 py-12">
        <div className="max-w-3xl mx-auto bg-white rounded-xl shadow p-8">
          <h1 className="text-3xl font-bold">Application Submitted</h1>
          <p className="text-gray-600 mt-3">
            Thanks for applying to <span className="font-semibold">{job.title}</span>.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 px-6 py-12">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-xl shadow p-8 mb-6">
          <h1 className="text-3xl font-bold">{job.title}</h1>
          <p className="text-gray-600 mt-2">
            {job.location || "No location"} •{" "}
            {job.employment_type || "No employment type"}
          </p>

          <div className="mt-6">
            <h2 className="text-xl font-bold mb-2">About This Job</h2>
            <p className="text-gray-700 whitespace-pre-line">
              {job.description || "No description provided."}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-8">
          <h2 className="text-2xl font-bold mb-6">Apply for this Job</h2>

          <form onSubmit={handleApply} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                placeholder="Your full name"
                required
              />
            </div>

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
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                placeholder="Your phone number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">LinkedIn URL</label>
              <input
                type="text"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                placeholder="https://linkedin.com/in/yourname"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Resume Upload</label>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
              <p className="text-xs text-gray-500 mt-2">
                Accepted formats: PDF, DOC, DOCX
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-black text-white px-4 py-2 font-medium disabled:opacity-50"
            >
              {submitting ? "Submitting Application..." : "Submit Application"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}