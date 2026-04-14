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
  created_at: string;
};

type Candidate = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  linkedin_url: string | null;
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

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.jobId as string;

  const [job, setJob] = useState<Job | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [candidateNotes, setCandidateNotes] = useState<Record<string, string>>({});
  const [candidateInterviewDates, setCandidateInterviewDates] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadingCandidates, setLoadingCandidates] = useState(true);
  const [updatingCandidateId, setUpdatingCandidateId] = useState<string | null>(null);
  const [savingNotesId, setSavingNotesId] = useState<string | null>(null);
  const [savingInterviewId, setSavingInterviewId] = useState<string | null>(null);

  const formatInterviewDate = (dateString: string) => {
    const [datePart, timePart] = dateString.split("T");

    const [year, month, day] = datePart.split("-");
    const [hourRaw, minute] = timePart.split(":");

    let hour = parseInt(hourRaw);
    let suffix = "AM";

    if (hour >= 12) {
      suffix = "PM";
      if (hour > 12) hour -= 12;
    }

    if (hour === 0) hour = 12;

    return `${month}/${day}/${year} at ${hour}:${minute} ${suffix}`;
  };

  useEffect(() => {
    const loadJobAndCandidates = async () => {
      const { data: jobData } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", jobId)
        .single();

      setJob(jobData);

      const { data: candidateData } = await supabase
        .from("candidates")
        .select("*")
        .eq("job_id", jobId)
        .order("created_at", { ascending: false });

      const loadedCandidates = candidateData || [];

      setCandidates(loadedCandidates);

      const initialNotes: Record<string, string> = {};
      const initialInterviewDates: Record<string, string> = {};

      loadedCandidates.forEach((candidate) => {
        initialNotes[candidate.id] = candidate.notes || "";
        initialInterviewDates[candidate.id] = candidate.interview_date || "";
      });

      setCandidateNotes(initialNotes);
      setCandidateInterviewDates(initialInterviewDates);

      setLoading(false);
      setLoadingCandidates(false);
    };

    loadJobAndCandidates();
  }, [jobId]);

  const handleStageChange = async (candidateId: string, newStage: string) => {
    setUpdatingCandidateId(candidateId);

    await supabase
      .from("candidates")
      .update({ stage: newStage })
      .eq("id", candidateId);

    setCandidates((prev) =>
      prev.map((candidate) =>
        candidate.id === candidateId
          ? { ...candidate, stage: newStage }
          : candidate
      )
    );

    setUpdatingCandidateId(null);
  };

  const handleSaveNotes = async (candidateId: string) => {
    setSavingNotesId(candidateId);

    await supabase
      .from("candidates")
      .update({ notes: candidateNotes[candidateId] })
      .eq("id", candidateId);

    setSavingNotesId(null);
  };

  const handleSaveInterviewDate = async (candidateId: string) => {
    setSavingInterviewId(candidateId);

    const value = candidateInterviewDates[candidateId];

    await supabase
      .from("candidates")
      .update({ interview_date: value })
      .eq("id", candidateId);

    setCandidates((prev) =>
      prev.map((candidate) =>
        candidate.id === candidateId
          ? { ...candidate, interview_date: value }
          : candidate
      )
    );

    setSavingInterviewId(null);
  };

  if (loading || !job) return null;

  const applyLink = `${window.location.origin}/jobs/${job.id}/apply`;

  return (
    <main className="min-h-screen bg-gray-100 px-6 py-12">
      <div className="max-w-5xl mx-auto">
        <button
          onClick={() => router.push("/dashboard")}
          className="mb-6 text-blue-600"
        >
          ← Back to Dashboard
        </button>

        <div className="bg-white p-8 rounded-xl shadow">
          <h1 className="text-3xl font-bold">{job.title}</h1>
          <p>{job.description}</p>

          <p className="mt-4">Public Apply Link</p>
          <p>{applyLink}</p>
        </div>

        <div className="bg-white p-8 rounded-xl shadow mt-8">
          <h2 className="text-2xl font-bold mb-6">Candidates</h2>

          {candidates.map((candidate) => (
            <div key={candidate.id} className="border rounded-lg p-4 mb-4">
              <h3 className="font-bold">{candidate.full_name}</h3>
              <p>{candidate.email}</p>
              <p>{candidate.phone}</p>

              <a
                href={candidate.linkedin_url || "#"}
                target="_blank"
                className="text-blue-600"
              >
                View LinkedIn
              </a>

              <textarea
                value={candidateNotes[candidate.id] || ""}
                onChange={(e) =>
                  setCandidateNotes({
                    ...candidateNotes,
                    [candidate.id]: e.target.value,
                  })
                }
                className="w-full border p-2 mt-4"
              />

              <button
                onClick={() => handleSaveNotes(candidate.id)}
                className="bg-black text-white px-4 py-2 rounded mt-2"
              >
                Save Notes
              </button>

              <div className="mt-4">
                <label>Interview Date</label>

                <input
                  type="datetime-local"
                  value={candidateInterviewDates[candidate.id] || ""}
                  onChange={(e) =>
                    setCandidateInterviewDates({
                      ...candidateInterviewDates,
                      [candidate.id]: e.target.value,
                    })
                  }
                  className="w-full border p-2"
                />

                <button
                  onClick={() => handleSaveInterviewDate(candidate.id)}
                  className="bg-blue-600 text-white px-4 py-2 rounded mt-2"
                >
                  Save Interview Date
                </button>

                {candidate.interview_date && (
                  <p className="mt-2">
                    Scheduled: {formatInterviewDate(candidate.interview_date)}
                  </p>
                )}
              </div>

              <select
                value={candidate.stage || "Applied"}
                onChange={(e) =>
                  handleStageChange(candidate.id, e.target.value)
                }
                className="mt-4 border p-2"
              >
                {STAGE_OPTIONS.map((stage) => (
                  <option key={stage}>{stage}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}