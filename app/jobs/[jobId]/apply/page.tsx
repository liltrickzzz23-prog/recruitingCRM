"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ApplyPage() {
  const params = useParams();
  const jobId = params.jobId as string;

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();

    setSubmitting(true);

    let resumeUrl: string | null = null;

    if (resumeFile) {
      const fileExt = resumeFile.name.split(".").pop();

      const fileName = `${Date.now()}-${fullName.replace(/\s/g, "-")}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(fileName, resumeFile);

      if (uploadError) {
        alert(uploadError.message);
        setSubmitting(false);
        return;
      }

      const { data } = supabase.storage
        .from("resumes")
        .getPublicUrl(fileName);

      resumeUrl = data.publicUrl;
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

  if (submitted) {
    return (
      <main className="min-h-screen bg-gray-100 px-6 py-12">
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow">
          <h1 className="text-3xl font-bold">Application Submitted</h1>
          <p className="mt-4 text-gray-600">
            Thanks for applying!
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 px-6 py-12">
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow">
        <h1 className="text-3xl font-bold mb-6">Apply for this Job</h1>

        <form onSubmit={handleApply} className="space-y-4">
          <input
            type="text"
            required
            placeholder="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full border p-3 rounded"
          />

          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border p-3 rounded"
          />

          <input
            type="text"
            required
            placeholder="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full border p-3 rounded"
          />

          <input
            type="text"
            placeholder="LinkedIn URL"
            value={linkedinUrl}
            onChange={(e) => setLinkedinUrl(e.target.value)}
            className="w-full border p-3 rounded"
          />

          <input
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
            className="w-full"
          />

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-black text-white py-3 rounded"
          >
            {submitting ? "Submitting..." : "Submit Application"}
          </button>
        </form>
      </div>
    </main>
  );
}