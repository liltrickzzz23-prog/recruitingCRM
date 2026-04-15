"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Job = {
  id: string;
  title: string;
};

type Candidate = {
  id: string;
  job_id: string;
  full_name: string;
  email: string;
  stage: string | null;
  interview_date: string | null;
};

type Profile = {
  id: string;
  subscription_status: string | null;
};

const PAID_STATUSES = ["active", "trialing"];

export default function InterviewsPage() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  const [jobsMap, setJobsMap] = useState<Record<string, string>>({});
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isPaid, setIsPaid] = useState(false);

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
    const loadInterviews = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      setAuthorized(true);
      setCheckingAuth(false);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, subscription_status")
        .eq("id", session.user.id)
        .maybeSingle();

      const paid = PAID_STATUSES.includes(profileData?.subscription_status || "");
      setIsPaid(paid);

      if (!paid) {
        setLoading(false);
        return;
      }

      const { data: jobsData, error: jobsError } = await supabase
        .from("jobs")
        .select("id, title")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (jobsError) {
        alert(jobsError.message);
        setLoading(false);
        return;
      }

      const jobs = (jobsData || []) as Job[];

      if (jobs.length === 0) {
        setJobsMap({});
        setCandidates([]);
        setLoading(false);
        return;
      }

      const mappedJobs: Record<string, string> = {};
      jobs.forEach((job) => {
        mappedJobs[job.id] = job.title;
      });
      setJobsMap(mappedJobs);

      const jobIds = jobs.map((job) => job.id);

      const { data: candidatesData, error: candidatesError } = await supabase
        .from("candidates")
        .select("id, job_id, full_name, email, stage, interview_date")
        .in("job_id", jobIds)
        .not("interview_date", "is", null)
        .order("interview_date", { ascending: true });

      if (candidatesError) {
        alert(candidatesError.message);
        setLoading(false);
        return;
      }

      setCandidates((candidatesData || []) as Candidate[]);
      setLoading(false);
    };

    loadInterviews();
  }, [router]);

  const groupedInterviews = useMemo(() => {
    const grouped: Record<string, Candidate[]> = {};

    candidates.forEach((candidate) => {
      if (!candidate.interview_date) return;

      const dateKey = candidate.interview_date.split("T")[0] || "Unknown Date";

      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }

      grouped[dateKey].push(candidate);
    });

    return grouped;
  }, [candidates]);

  const orderedDateKeys = useMemo(() => {
    return Object.keys(groupedInterviews).sort((a, b) => a.localeCompare(b));
  }, [groupedInterviews]);

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
          <p className="text-gray-600">Loading interviews...</p>
        </div>
      </main>
    );
  }

  if (!isPaid) {
    return (
      <main className="min-h-screen bg-gray-100 px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => router.push("/dashboard")}
            className="mb-6 text-sm text-blue-600 hover:underline"
          >
            ← Back to Dashboard
          </button>

          <div className="bg-white rounded-xl shadow p-8">
            <h1 className="text-3xl font-bold">Interview Scheduler Locked</h1>
            <p className="text-gray-600 mt-3">
              Upgrade to Pro to access interview scheduling.
            </p>

            <button
              onClick={() => router.push("/dashboard")}
              className="mt-6 bg-black text-white px-5 py-3 rounded-lg"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </main>
    );
  }

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
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold">Interview Scheduler</h1>
              <p className="text-gray-600 mt-2">
                View all scheduled interviews in one place.
              </p>
            </div>

            <button
              onClick={() => router.push("/dashboard")}
              className="bg-black text-white px-5 py-3 rounded-lg"
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        <div className="mt-8">
          {orderedDateKeys.length === 0 ? (
            <div className="bg-white rounded-xl shadow p-8">
              <h2 className="text-2xl font-bold">No Interviews Scheduled</h2>
              <p className="text-gray-600 mt-2">
                Set interview dates on candidate pages and they will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {orderedDateKeys.map((dateKey) => (
                <div key={dateKey}>
                  <h2 className="text-2xl font-bold mb-4">
                    {new Date(`${dateKey}T00:00`).toLocaleDateString()}
                  </h2>

                  <div className="grid md:grid-cols-2 gap-4">
                    {groupedInterviews[dateKey].map((candidate) => (
                      <div
                        key={candidate.id}
                        className="bg-white rounded-xl shadow p-6 border border-gray-200"
                      >
                        <h3 className="text-xl font-bold">
                          {candidate.full_name}
                        </h3>

                        <p className="text-gray-600 mt-2">{candidate.email}</p>

                        <p className="text-sm text-gray-500 mt-2">
                          Job: {jobsMap[candidate.job_id] || "Unknown Job"}
                        </p>

                        <p className="text-sm text-gray-500">
                          Stage: {candidate.stage || "Applied"}
                        </p>

                        <p className="text-blue-600 font-medium mt-3">
                          {candidate.interview_date
                            ? formatInterviewDate(candidate.interview_date)
                            : "No date"}
                        </p>

                        <button
                          onClick={() =>
                            router.push(
                              `/jobs/${candidate.job_id}/candidates/${candidate.id}`
                            )
                          }
                          className="mt-4 bg-black text-white px-4 py-2 rounded-lg"
                        >
                          Open Candidate
                        </button>
                      </div>
                    ))}
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