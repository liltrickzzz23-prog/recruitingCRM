"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd";

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
  const [deletingJob, setDeletingJob] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [stageFilter, setStageFilter] = useState("All");
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");

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

  const handleDeleteJob = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this job? This will also remove its candidates."
    );

    if (!confirmed) return;

    setDeletingJob(true);

    const { error } = await supabase.from("jobs").delete().eq("id", jobId);

    if (error) {
      alert(error.message);
      setDeletingJob(false);
      return;
    }

    alert("Job deleted.");
    router.push("/dashboard");
  };

  const filteredCandidates = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return candidates.filter((candidate) => {
      const matchesSearch =
        normalizedSearch === "" ||
        candidate.full_name.toLowerCase().includes(normalizedSearch) ||
        candidate.email.toLowerCase().includes(normalizedSearch);

      const currentStage = candidate.stage || "Applied";
      const matchesStage =
        stageFilter === "All" || currentStage === stageFilter;

      return matchesSearch && matchesStage;
    });
  }, [candidates, searchTerm, stageFilter]);

  const candidatesByStage = useMemo(() => {
    const grouped: Record<string, Candidate[]> = {};

    STAGE_OPTIONS.forEach((stage) => {
      grouped[stage] = [];
    });

    filteredCandidates.forEach((candidate) => {
      const currentStage = candidate.stage || "Applied";
      if (!grouped[currentStage]) {
        grouped[currentStage] = [];
      }
      grouped[currentStage].push(candidate);
    });

    return grouped;
  }, [filteredCandidates]);

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const candidateId = result.draggableId;
    const newStage = result.destination.droppableId;

    if (!STAGE_OPTIONS.includes(newStage)) return;

    const candidate = candidates.find((item) => item.id === candidateId);
    if (!candidate) return;

    const currentStage = candidate.stage || "Applied";
    if (currentStage === newStage) return;

    setCandidates((prevCandidates) =>
      prevCandidates.map((item) =>
        item.id === candidateId ? { ...item, stage: newStage } : item
      )
    );

    const { error } = await supabase
      .from("candidates")
      .update({ stage: newStage })
      .eq("id", candidateId);

    if (error) {
      alert(error.message);

      setCandidates((prevCandidates) =>
        prevCandidates.map((item) =>
          item.id === candidateId ? { ...item, stage: currentStage } : item
        )
      );
    }
  };

  if (checkingAuth) {
    return (
      <main className="min-h-screen bg-gray-100 px-6 py-12">
        <div className="max-w-6xl mx-auto">
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
        <div className="max-w-6xl mx-auto">
          <p className="text-gray-600">Loading job...</p>
        </div>
      </main>
    );
  }

  if (!job) {
    return (
      <main className="min-h-screen bg-gray-100 px-6 py-12">
        <div className="max-w-6xl mx-auto">
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
      <div className="max-w-6xl mx-auto">
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

            <div className="flex gap-3">
              <button
                onClick={() => router.push(`/jobs/${jobId}/edit`)}
                className="bg-black text-white px-4 py-2 rounded-lg"
              >
                Edit Job
              </button>

              <button
                onClick={handleDeleteJob}
                disabled={deletingJob}
                className="bg-red-600 text-white px-4 py-2 rounded-lg disabled:opacity-50"
              >
                {deletingJob ? "Deleting..." : "Delete Job"}
              </button>
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-xl font-bold mb-3">Job Description</h2>
            <p className="text-gray-700 whitespace-pre-line">
              {job.description || "No description provided."}
            </p>
          </div>

          <div className="mt-10 border-t pt-6">
            <h2 className="text-xl font-bold mb-3">Public Apply Link</h2>
            <div className="flex flex-col md:flex-row gap-3 md:items-center">
              <p className="text-sm text-gray-600 break-all flex-1">{applyLink}</p>
              <button
                onClick={() => navigator.clipboard.writeText(applyLink)}
                className="bg-gray-900 text-white px-4 py-2 rounded-lg"
              >
                Copy Apply Link
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-8 mt-8">
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">Candidates</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Search, filter, and view candidates as a list or pipeline board.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode("list")}
                  className={`px-4 py-2 rounded-lg ${
                    viewMode === "list"
                      ? "bg-black text-white"
                      : "bg-gray-200 text-black"
                  }`}
                >
                  List View
                </button>

                <button
                  onClick={() => setViewMode("kanban")}
                  className={`px-4 py-2 rounded-lg ${
                    viewMode === "kanban"
                      ? "bg-black text-white"
                      : "bg-gray-200 text-black"
                  }`}
                >
                  Kanban View
                </button>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-3">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search candidates..."
                className="rounded-lg border border-gray-300 px-3 py-2 w-full md:w-64"
              />

              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 w-full md:w-48"
              >
                <option value="All">All Stages</option>
                {STAGE_OPTIONS.map((stageOption) => (
                  <option key={stageOption} value={stageOption}>
                    {stageOption}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loadingCandidates ? (
            <p className="text-gray-500">Loading candidates...</p>
          ) : filteredCandidates.length === 0 ? (
            <p className="text-gray-500">
              No candidates match your current search/filter.
            </p>
          ) : viewMode === "list" ? (
            <div className="space-y-4">
              {filteredCandidates.map((candidate) => (
                <div
                  key={candidate.id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex justify-between items-start gap-6">
                    <div className="flex-1">
                      <button
                        onClick={() =>
                          router.push(
                            `/jobs/${jobId}/candidates/${candidate.id}`
                          )
                        }
                        className="text-left"
                      >
                        <h3 className="text-lg font-semibold text-blue-600 hover:underline">
                          {candidate.full_name}
                        </h3>
                      </button>

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
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="overflow-x-auto">
                <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4 min-w-[1200px]">
                  {STAGE_OPTIONS.map((stage) => (
                    <Droppable droppableId={stage} key={stage}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`border rounded-xl p-4 min-h-[400px] ${
                            snapshot.isDraggingOver
                              ? "bg-blue-50 border-blue-300"
                              : "bg-gray-50 border-gray-200"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-lg">{stage}</h3>
                            <span className="text-sm bg-white border border-gray-200 rounded-full px-2 py-1">
                              {candidatesByStage[stage]?.length || 0}
                            </span>
                          </div>

                          <div className="space-y-3">
                            {(candidatesByStage[stage] || []).length === 0 ? (
                              <p className="text-sm text-gray-400">
                                No candidates
                              </p>
                            ) : (
                              candidatesByStage[stage].map(
                                (candidate, index) => (
                                  <Draggable
                                    draggableId={candidate.id}
                                    index={index}
                                    key={candidate.id}
                                  >
                                    {(providedDraggable, snapshotDraggable) => (
                                      <div
                                        ref={providedDraggable.innerRef}
                                        {...providedDraggable.draggableProps}
                                        {...providedDraggable.dragHandleProps}
                                        className={`w-full border rounded-lg p-3 transition ${
                                          snapshotDraggable.isDragging
                                            ? "bg-blue-100 border-blue-300 shadow-lg"
                                            : "bg-white border-gray-200"
                                        }`}
                                      >
                                        <h4 className="font-semibold text-sm">
                                          {candidate.full_name}
                                        </h4>
                                        <p className="text-xs text-gray-600 mt-1 break-words">
                                          {candidate.email}
                                        </p>

                                        {candidate.interview_date && (
                                          <p className="text-xs text-blue-600 mt-2">
                                            Interview:{" "}
                                            {formatInterviewDate(
                                              candidate.interview_date
                                            )}
                                          </p>
                                        )}

                                        {candidate.resume_url && (
                                          <p className="text-xs text-green-600 mt-2">
                                            Resume uploaded
                                          </p>
                                        )}

                                        <button
                                          type="button"
                                          onClick={() =>
                                            router.push(
                                              `/jobs/${jobId}/candidates/${candidate.id}`
                                            )
                                          }
                                          className="mt-3 text-xs bg-black text-white px-3 py-1 rounded"
                                        >
                                          Open Candidate
                                        </button>
                                      </div>
                                    )}
                                  </Draggable>
                                )
                              )
                            )}
                            {provided.placeholder}
                          </div>
                        </div>
                      )}
                    </Droppable>
                  ))}
                </div>
              </div>
            </DragDropContext>
          )}
        </div>
      </div>
    </main>
  );
}