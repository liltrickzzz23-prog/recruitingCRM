"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Candidate = {
  id: string;
  job_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  linkedin_url: string | null;
  resume_url: string | null;
  stage: string | null;
  notes: string | null;
  interview_date: string | null;
  created_at: string;
};

const STAGE_OPTIONS = [
  "Applied",
  "Reviewed",
  "Interview",
  "Offer",
  "Hired",
  "Rejected",
];

export default function CandidateDetailPage() {
  const params = useParams();
  const router = useRouter();

  const jobId = params.jobId as string;
  const candidateId = params.candidateId as string;

  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  const [stage, setStage] = useState("Applied");
  const [notes, setNotes] = useState("");
  const [interviewDate, setInterviewDate] = useState("");
  const [saving, setSaving] = useState(false);

  const formatInterviewDate = (dateString: string) => {
    const [datePart, timePart] = dateString.split("T");
    if (!datePart || !timePart) return dateString;

    const [year, month, day] = datePart.split("-");
    const [hourRaw, minute] = timePart.split(":");

    let hour = parseInt(hourRaw, 10);
    let suffix = "AM";

    if (hour >= 12) {
      suffix = "PM";
      if (hour > 12) hour -= 12;
    }

    if (hour === 0) hour = 12;

    return `${month}/${day}/${year} at ${hour}:${minute} ${suffix}`;
  };

  useEffect(() => {
    const loadCandidate = async () => {
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
        .from("candidates")
        .select(
          "id, job_id, full_name, email, phone, linkedin_url, resume_url, stage, notes, interview_date, created_at"
        )
        .eq("id", candidateId)
        .eq("job_id", jobId)
        .single();

      if (error) {
        console.error("Error loading candidate:", error.message);
        setLoading(false);
        return;
      }

      setCandidate(data);
      setStage(data.stage || "Applied");
      setNotes(data.notes || "");
      setInterviewDate(data.interview_date || "");
      setLoading(false);
    };

    if (candidateId && jobId) {
      loadCandidate();
    }
  }, [candidateId, jobId, router]);

  const handleSave = async () => {
    if (!candidate) return;

    setSaving(true);

    const { error } = await supabase
      .from("candidates")
      .update({
        stage,
        notes,
        interview_date: interviewDate || null,
      })
      .eq("id", candidate.id);

    if (error) {
      alert(error.message);
      setSaving(false);
      return;
    }

    setCandidate({
      ...candidate,
      stage,
      notes,
      interview_date: interviewDate || null,
    });

    setSaving(false);
    alert("Candidate updated.");
  };

  if (checkingAuth) {
    return (
      <main className="min-h-screen bg-gray-100 px-6 py-12">
        <div className="max-w-4xl mx-auto">
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
        <div className="max-w-4xl mx-auto">
          <p className="text-gray-600">Loading candidate...</p>
        </div>
      </main>
    );
  }

  if (!candidate) {
    return (
      <main className="min-h-screen bg-gray-100 px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold">Candidate Not Found</h1>
          <button
            onClick={() => router.push(`/jobs/${jobId}`)}
            className="mt-6 bg-black text-white px-4 py-2 rounded-lg"
          >
            Back to Job
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 px-6 py-12">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.push(`/jobs/${jobId}`)}
          className="mb-6 text-sm text-blue-600 hover:underline"
        >
          ← Back to Job
        </button>

        <div className="bg-white rounded-xl shadow p-8">
          <h1 className="text-3xl font-bold">{candidate.full_name}</h1>

          <div className="mt-6 space-y-2">
            <p className="text-gray-700">
              <span className="font-semibold">Email:</span> {candidate.email}
            </p>
            <p className="text-gray-700">
              <span className="font-semibold">Phone:</span>{" "}
              {candidate.phone || "No phone provided"}
            </p>

            {candidate.linkedin_url ? (
              <p>
                <a
                  href={candidate.linkedin_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  View LinkedIn
                </a>
              </p>
            ) : (
              <p className="text-gray-500">No LinkedIn URL</p>
            )}

            {candidate.resume_url ? (
              <p>
                <a
                  href={candidate.resume_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-green-600 hover:underline"
                >
                  View Resume
                </a>
              </p>
            ) : (
              <p className="text-gray-500">No resume uploaded</p>
            )}

            <p className="text-sm text-gray-400">
              Applied: {new Date(candidate.created_at).toLocaleDateString()}
            </p>
          </div>

          <div className="mt-8">
            <label className="block text-sm font-medium mb-2">
              Hiring Stage
            </label>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            >
              {STAGE_OPTIONS.map((stageOption) => (
                <option key={stageOption} value={stageOption}>
                  {stageOption}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium mb-2">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 min-h-[140px]"
              placeholder="Add notes about this candidate..."
            />
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium mb-2">
              Interview Date
            </label>
            <input
              type="datetime-local"
              value={interviewDate}
              onChange={(e) => setInterviewDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />

            {candidate.interview_date && (
              <p className="text-sm text-gray-600 mt-2">
                Current Scheduled Time:{" "}
                {formatInterviewDate(candidate.interview_date)}
              </p>
            )}
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-8 bg-black text-white px-6 py-3 rounded-lg disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Candidate"}
          </button>
        </div>
      </div>
    </main>
  );
}