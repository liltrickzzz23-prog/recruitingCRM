"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Job = {
  id: string;
  title: string;
  status: string | null;
};

export default function ApplyPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.jobId as string;

  const [job, setJob] = useState<Job | null>(null);
  const [loadingJob, setLoadingJob] = useState(true);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadJob = async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("id, title, status")
        .eq("id", jobId)
        .maybeSingle();

      if (error) {
        alert(error.message);
        setLoadingJob(false);
        return;
      }

      if (!data) {
        alert("Job not found.");
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

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setResumeFile(file);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!job) {
      alert("Job not loaded.");
      return;
    }

    if (!fullName.trim()) {
      alert("Please enter your full name.");
      return;
    }

    if (!email.trim()) {
      alert("Please enter your email.");
      return;
    }

    setSubmitting(true);

    let resumeUrl: string | null = null;

    if (resumeFile) {
      const safeFileName = resumeFile.name.replace(/\s+/g, "-");
      const filePath = `${jobId}/${Date.now()}-${safeFileName}`;

      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(filePath, resumeFile, {
          upsert: false,
        });

      if (uploadError) {
        alert(uploadError.message);
        setSubmitting(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("resumes")
        .getPublicUrl(filePath);

      resumeUrl = publicUrlData.publicUrl;
    }

    const { error: insertError } = await supabase.from("candidates").insert({
      job_id: jobId,
      full_name: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim() || null,
      linkedin_url: linkedinUrl.trim() || null,
      resume_url: resumeUrl,
      stage: "Applied",
      notes: null,
      interview_date: null,
    });

    if (insertError) {
      alert(insertError.message);
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    alert("Application submitted successfully.");
    router.refresh();

    setFullName("");
    setEmail("");
    setPhone("");
    setLinkedinUrl("");
    setResumeFile(null);
  };

  if (loadingJob) {
    return (
      <main className="min-h-screen bg-gray-100 px-6 py-16">
        <div className="max-w-3xl mx-auto bg-white rounded-xl shadow p-8">
          <p className="text-gray-600">Loading job...</p>
        </div>
      </main>
    );
  }

  if (!job) {
    return (
      <main className="min-h-screen bg-gray-100 px-6 py-16">
        <div className="max-w-3xl mx-auto bg-white rounded-xl shadow p-8">
          <h1 className="text-3xl font-bold">Job Not Found</h1>
          <p className="text-gray-600 mt-3">
            We could not find that application page.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 px-6 py-16">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow p-8">
        <h1 className="text-4xl font-bold">Apply for {job.title}</h1>
        <p className="text-gray-600 mt-3">
          Fill out the form below to submit your application.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <input
            type="text"
            placeholder="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-3"
            required
          />

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-3"
            required
          />

          <input
            type="text"
            placeholder="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-3"
          />

          <input
            type="text"
            placeholder="LinkedIn URL"
            value={linkedinUrl}
            onChange={(e) => setLinkedinUrl(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-3"
          />

          <div>
            <label className="block text-sm font-medium mb-2">
              Upload Resume
            </label>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleFileChange}
              className="w-full rounded-lg border border-gray-300 px-4 py-3"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-black text-white px-4 py-3 rounded-lg disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit Application"}
          </button>
        </form>
      </div>
    </main>
  );
}