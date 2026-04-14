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

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.jobId as string;

  const [job, setJob] = useState<Job | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [candidateNotes, setCandidateNotes] = useState<Record<string, string>>(
    {}
  );
  const [candidateInterviewDates, setCandidateInterviewDates] = useState<
    Record<string, string>
  >({});
  const [loading, setLoading] = useState(true);
  const [loadingCandidates, setLoadingCandidates] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [updatingCandidateId, setUpdatingCandidateId] = useState<string | null>(
    null
  );
  const [savingNotesId, setSavingNotesId] = useState<string | null>(null);
  const [savingInterviewId, setSavingInterviewId] = useState<string | null>(
    null
  );

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
    const loadPage = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      setAuthorized(true);
      setCheckingAuth(false);

      const { data: jobData, error: jobError } = await supabase
        .from("jobs")
        .select(
          "id, title, description, location, employment_type, status, created_at"
        )
        .eq("id", jobId)
        .single();

      if (jobError) {
        console.error("Error loading job:", jobError.message);
        setLoading(false);
        setLoadingCandidates(false);
        return;
      }

      setJob(jobData);
      setLoading(false);

      const { data: candidateData, error: candidateError } = await supabase
        .from("candidates")
        .select(
          "id, full_name, email, phone, linkedin_url, resume_url, stage, notes, interview_date, created_at"
        )
        .eq("job_id", jobId)
        .order("created_at", { ascending: false });

      if (candidateError) {
        console.error("Error loading candidates:", candidateError.message);
        setLoadingCandidates(false);
        return;
      }

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
      setLoadingCandidates(false);
    };

    if (jobId) {
      loadPage();
    }
  }, [jobId, router]);

  const handleStageChange = async (candidateId: string, newStage: string) => {
    setUpdatingCandidateId(candidateId);

    const { error } = await supabase
      .from("candidates")
      .update({ stage: newStage })
      .eq("id", candidateId);

    if (error) {
      alert(error.message);
      setUpdatingCandidateId(null);
      return;
    }

    setCandidates((prevCandidates) =>
      prevCandidates.map((candidate) =>
        candidate.id === candidateId
          ? { ...candidate, stage: newStage }
          : candidate
      )
    );

    setUpdatingCandidateId(null);
  };

  const handleNotesChange = (candidateId: string, value: string) => {
    setCandidateNotes((prev) => ({
      ...prev,
      [candidateId]: value,
    }));
  };

  const handleSaveNotes = async (candidateId: string) => {
    setSavingNotesId(candidateId);

    const notesToSave = candidateNotes[candidateId] || "";

    const { error } = await supabase
      .from("candidates")
      .update({ notes: notesToSave })
      .eq("id", candidateId);

    if (error) {
      alert(error.message);
      setSavingNotesId(null);
      return;
    }

    setCandidates((prevCandidates) =>
      prevCandidates.map((candidate) =>
        candidate.id === candidateId
          ? { ...candidate, notes: notesToSave }
          : candidate
      )
    );

    setSavingNotesId(null);
  };

  const handleInterviewDateChange = (candidateId: string, value: string) => {
    setCandidateInterviewDates((prev) => ({
      ...prev,
      [candidateId]: value,
    }));
  };

  const handleSaveInterviewDate = async (candidateId: string) => {
    setSavingInterviewId(candidateId);

    const value = candidateInterviewDates[candidateId] || "";
    const interviewDateToSave = value || null;

    const { error } = await supabase
      .from("candidates")
      .update({ interview_date: interviewDateToSave })
      .eq("id", candidateId);

    if (error) {
      alert(error.message);
      setSavingInterviewId(null);
      return;
    }

    setCandidates((prevCandidates) =>
      prevCandidates.map((candidate) =>
        candidate.id === candidateId
          ? { ...candidate, interview_date: interviewDateToSave }
          : candidate
      )
    );

    setSavingInterviewId(null);
  };

  if (checkingAuth) {
    return (
      <main className="min-h-screen bg-gray-100 px-6 py-12">
        <div className="max-w-5xl mx-auto">
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
        <div className="max-w-5xl mx-auto">
          <p className="text-gray-600">Loading job...</p>
        </div>
      </main>
    );
  }

  if (!job) {
    return (
      <main className="min-h-screen bg-gray-100 px-6 py-12">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold">Job Not Found</h1>
          <p className="text-gray-600 mt-2">We could not find that job.</p>
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

  const applyLink = `${window.location.origin}/jobs/${job.id}/apply`;

  return (
    <main className="min-h-screen bg-gray-100 px-6 py-12">
      <div className="max-w-5xl mx-auto">
        <button
          onClick={() => router.push("/dashboard")}
          className="mb-6 text-sm text-blue-600 hover:underline"
        >
          ← Back to Dashboard
        </button>

        <div className="bg-white rounded-xl shadow p-8">
          <div className="flex justify-between items-start gap-4">
            <div>
              <h1 className="text-3xl font-bold">{job.title}</h1>
              <p className="text-gray-600 mt-2">
                {job.location || "No location"} •{" "}
                {job.employment_type || "No employment type"}
              </p>
              <p className="text-sm text-gray-400 mt-2">
                Status: {job.status || "open"}
              </p>
              <p className="text-sm text-gray-400">
                Created: {new Date(job.created_at).toLocaleDateString()}
              </p>
            </div>

            <button
              onClick={() => navigator.clipboard.writeText(applyLink)}
              className="bg-black text-white px-4 py-2 rounded-lg"
            >
              Copy Apply Link
            </button>
          </div>

          <div className="mt-8">
            <h2 className="text-xl font-bold mb-3">Job Description</h2>
            <p className="text-gray-700 whitespace-pre-line">
              {job.description || "No description provided."}
            </p>
          </div>

          <div className="mt-10 border-t pt-6">
            <h2 className="text-xl font-bold mb-3">Public Apply Link</h2>
            <p className="text-sm text-gray-600 break-all">{applyLink}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-8 mt-8">
          <h2 className="text-2xl font-bold mb-6">Candidates</h2>

          {loadingCandidates ? (
            <p className="text-gray-500">Loading candidates...</p>
          ) : candidates.length === 0 ? (
            <p className="text-gray-500">No candidates have applied yet.</p>
          ) : (
            <div className="space-y-4">
              {candidates.map((candidate) => (
                <div
                  key={candidate.id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex justify-between items-start gap-6">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold">
                        {candidate.full_name}
                      </h3>

                      <p className="text-sm text-gray-600 mt-1">
                        {candidate.email}
                      </p>
                      <p className="text-sm text-gray-600">
                        {candidate.phone || "No phone provided"}
                      </p>

                      {candidate.linkedin_url ? (
                        <a
                          href={candidate.linkedin_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-blue-600 hover:underline block"
                        >
                          View LinkedIn
                        </a>
                      ) : (
                        <p className="text-sm text-gray-500">No LinkedIn URL</p>
                      )}

                      {candidate.resume_url ? (
                        <a
                          href={candidate.resume_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-green-600 hover:underline block mt-1"
                        >
                          View Resume
                        </a>
                      ) : (
                        <p className="text-sm text-gray-500 mt-1">
                          No resume uploaded
                        </p>
                      )}

                      <p className="text-xs text-gray-400 mt-2">
                        Applied:{" "}
                        {new Date(candidate.created_at).toLocaleDateString()}
                      </p>

                      <div className="mt-4">
                        <label className="block text-sm font-medium mb-2">
                          Notes
                        </label>
                        <textarea
                          value={candidateNotes[candidate.id] || ""}
                          onChange={(e) =>
                            handleNotesChange(candidate.id, e.target.value)
                          }
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 min-h-[100px]"
                          placeholder="Add notes about this candidate..."
                        />
                        <button
                          onClick={() => handleSaveNotes(candidate.id)}
                          disabled={savingNotesId === candidate.id}
                          className="mt-3 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50"
                        >
                          {savingNotesId === candidate.id
                            ? "Saving Notes..."
                            : "Save Notes"}
                        </button>
                      </div>

                      <div className="mt-4">
                        <label className="block text-sm font-medium mb-2">
                          Interview Date
                        </label>
                        <input
                          type="datetime-local"
                          value={candidateInterviewDates[candidate.id] || ""}
                          onChange={(e) =>
                            handleInterviewDateChange(
                              candidate.id,
                              e.target.value
                            )
                          }
                          className="w-full rounded-lg border border-gray-300 px-3 py-2"
                        />
                        <button
                          onClick={() => handleSaveInterviewDate(candidate.id)}
                          disabled={savingInterviewId === candidate.id}
                          className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50"
                        >
                          {savingInterviewId === candidate.id
                            ? "Saving Interview..."
                            : "Save Interview Date"}
                        </button>

                        {candidate.interview_date && (
                          <p className="text-sm text-gray-600 mt-2">
                            Scheduled:{" "}
                            {formatInterviewDate(candidate.interview_date)}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="min-w-[160px]">
                      <label className="block text-xs text-gray-500 mb-1">
                        Hiring Stage
                      </label>
                      <select
                        value={candidate.stage || "Applied"}
                        onChange={(e) =>
                          handleStageChange(candidate.id, e.target.value)
                        }
                        disabled={updatingCandidateId === candidate.id}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      >
                        {STAGE_OPTIONS.map((stageOption) => (
                          <option key={stageOption} value={stageOption}>
                            {stageOption}
                          </option>
                        ))}
                      </select>

                      {updatingCandidateId === candidate.id && (
                        <p className="text-xs text-gray-400 mt-2">Saving...</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}