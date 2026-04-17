"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Profile = {
  id: string;
  team_id: string | null;
};

type Job = {
  id: string;
  user_id: string;
  team_id: string | null;
  title: string;
  description: string | null;
  location: string | null;
  employment_type: string | null;
  status: string | null;
  created_at: string;
};

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
  score_overall: number | null;
  score_recommendation: string | null;
};

const STAGE_OPTIONS = [
  "Applied",
  "Reviewed",
  "Interview",
  "Offer",
  "Hired",
  "Rejected",
];

const RECOMMENDATION_OPTIONS = [
  "All Recommendations",
  "Move Forward",
  "Hold",
  "Reject",
];

const SORT_OPTIONS = [
  "Newest",
  "Oldest",
  "Highest Score",
  "Lowest Score",
  "Interview Date",
];

export default function JobDetailPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params.jobId as string;

  const [loading, setLoading] = useState(true);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);

  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("All Stages");
  const [recommendationFilter, setRecommendationFilter] = useState("All Recommendations");
  const [sortBy, setSortBy] = useState("Newest");

  const loadPage = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.replace("/login");
      return;
    }

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id, team_id")
      .eq("id", session.user.id)
      .maybeSingle();

    if (profileError) {
      alert(profileError.message);
      setLoading(false);
      return;
    }

    const activeTeamId = profileData?.team_id || null;
    setTeamId(activeTeamId);

    let jobQuery = supabase
      .from("jobs")
      .select(
        "id, user_id, team_id, title, description, location, employment_type, status, created_at"
      )
      .eq("id", jobId);

    if (activeTeamId) {
      jobQuery = jobQuery.eq("team_id", activeTeamId);
    } else {
      jobQuery = jobQuery.eq("user_id", session.user.id);
    }

    const { data: jobData, error: jobError } = await jobQuery.maybeSingle();

    if (jobError) {
      alert(jobError.message);
      setLoading(false);
      return;
    }

    if (!jobData) {
      alert("Job not found.");
      router.push("/dashboard");
      return;
    }

    setJob(jobData);

    const { data: candidatesData, error: candidatesError } = await supabase
      .from("candidates")
      .select(
        "id, job_id, full_name, email, phone, linkedin_url, resume_url, stage, notes, interview_date, created_at, score_overall, score_recommendation"
      )
      .eq("job_id", jobId);

    if (candidatesError) {
      alert(candidatesError.message);
      setLoading(false);
      return;
    }

    setCandidates(candidatesData || []);
    setLoading(false);
  };

  useEffect(() => {
    loadPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  const filteredCandidates = useMemo(() => {
    let result = [...candidates];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((candidate) => {
        return (
          candidate.full_name.toLowerCase().includes(q) ||
          candidate.email.toLowerCase().includes(q)
        );
      });
    }

    if (stageFilter !== "All Stages") {
      result = result.filter((candidate) => {
        const currentStage = candidate.stage || "Applied";
        return currentStage === stageFilter;
      });
    }

    if (recommendationFilter !== "All Recommendations") {
      result = result.filter((candidate) => {
        return (candidate.score_recommendation || "") === recommendationFilter;
      });
    }

    result.sort((a, b) => {
      if (sortBy === "Newest") {
        return b.created_at.localeCompare(a.created_at);
      }

      if (sortBy === "Oldest") {
        return a.created_at.localeCompare(b.created_at);
      }

      if (sortBy === "Highest Score") {
        return (b.score_overall || 0) - (a.score_overall || 0);
      }

      if (sortBy === "Lowest Score") {
        return (a.score_overall || 0) - (b.score_overall || 0);
      }

      if (sortBy === "Interview Date") {
        const aDate = a.interview_date || "9999-12-31T23:59";
        const bDate = b.interview_date || "9999-12-31T23:59";
        return aDate.localeCompare(bDate);
      }

      return 0;
    });

    return result;
  }, [candidates, search, stageFilter, recommendationFilter, sortBy]);

  const groupedCandidates = useMemo(() => {
    const groups: Record<string, Candidate[]> = {};

    STAGE_OPTIONS.forEach((stage) => {
      groups[stage] = [];
    });

    filteredCandidates.forEach((candidate) => {
      const stage = candidate.stage || "Applied";
      if (!groups[stage]) {
        groups[stage] = [];
      }
      groups[stage].push(candidate);
    });

    return groups;
  }, [filteredCandidates]);

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

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 px-6 py-12">
        <div className="max-w-7xl mx-auto">
          <p className="text-gray-600">Loading job...</p>
        </div>
      </main>
    );
  }

  if (!job) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gray-100 px-6 py-12">
      <div className="max-w-7xl mx-auto">
        <button
          onClick={() => router.push("/dashboard")}
          className="mb-6 text-sm text-blue-600 hover:underline"
        >
          ← Back to Dashboard
        </button>

        <div className="bg-white rounded-xl shadow p-8 mb-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold">{job.title}</h1>
              <p className="text-gray-600 mt-2">
                {job.location || "No location"} •{" "}
                {job.employment_type || "No employment type"}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Status: {job.status || "open"}
              </p>
              {teamId ? (
                <p className="text-sm text-indigo-600 mt-2">Shared Team Job</p>
              ) : null}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => router.push(`/jobs/${job.id}/apply`)}
                className="bg-black text-white px-5 py-3 rounded-lg"
              >
                Public Apply Link
              </button>

              <button
                onClick={() => router.push(`/jobs/${job.id}/edit`)}
                className="bg-gray-800 text-white px-5 py-3 rounded-lg"
              >
                Edit Job
              </button>
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-2xl font-bold">Job Description</h2>
            <p className="text-gray-700 mt-3 whitespace-pre-wrap">
              {job.description || "No description provided."}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-8">
          <div className="mb-6">
            <h2 className="text-3xl font-bold">Candidates</h2>
            <p className="text-gray-600 mt-2">
              Search, filter, and sort candidates for this job.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-3 mb-8">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search candidates..."
              className="rounded-lg border border-gray-300 px-4 py-3"
            />

            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="rounded-lg border border-gray-300 px-4 py-3"
            >
              <option>All Stages</option>
              {STAGE_OPTIONS.map((stage) => (
                <option key={stage} value={stage}>
                  {stage}
                </option>
              ))}
            </select>

            <select
              value={recommendationFilter}
              onChange={(e) => setRecommendationFilter(e.target.value)}
              className="rounded-lg border border-gray-300 px-4 py-3"
            >
              {RECOMMENDATION_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-lg border border-gray-300 px-4 py-3"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {STAGE_OPTIONS.map((stage) => (
              <div
                key={stage}
                className="bg-gray-50 rounded-xl p-5 border border-gray-200"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold">{stage}</h3>
                  <span className="text-sm bg-white border border-gray-300 rounded-full px-3 py-1">
                    {groupedCandidates[stage]?.length || 0}
                  </span>
                </div>

                <div className="space-y-3">
                  {(groupedCandidates[stage] || []).length === 0 ? (
                    <p className="text-sm text-gray-500">No candidates</p>
                  ) : (
                    groupedCandidates[stage].map((candidate) => (
                      <div
                        key={candidate.id}
                        onClick={() =>
                          router.push(`/jobs/${job.id}/candidates/${candidate.id}`)
                        }
                        className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:bg-gray-50"
                      >
                        <p className="font-semibold">{candidate.full_name}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          {candidate.email}
                        </p>

                        {candidate.score_overall ? (
                          <p className="text-sm text-indigo-600 mt-2">
                            Score: {candidate.score_overall}/10
                          </p>
                        ) : null}

                        {candidate.score_recommendation ? (
                          <p className="text-sm text-gray-700 mt-1">
                            {candidate.score_recommendation}
                          </p>
                        ) : null}

                        {candidate.resume_url ? (
                          <p className="text-sm text-green-600 mt-2">
                            Resume uploaded
                          </p>
                        ) : null}

                        {candidate.interview_date ? (
                          <p className="text-sm text-blue-600 mt-2">
                            {formatInterviewDate(candidate.interview_date)}
                          </p>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}