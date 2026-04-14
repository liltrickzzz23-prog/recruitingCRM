"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Job = {
  id: string;
  title: string;
  location: string | null;
  employment_type: string | null;
  created_at: string;
};

type Candidate = {
  id: string;
  full_name: string;
  email: string;
  stage: string | null;
  interview_date: string | null;
  created_at: string;
};

export default function DashboardPage() {
  const router = useRouter();

  const [userEmail, setUserEmail] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);

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
    const loadDashboard = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      setUserEmail(session.user.email || "");

      const { data: jobsData } = await supabase
        .from("jobs")
        .select("*")
        .order("created_at", { ascending: false });

      const { data: candidatesData } = await supabase
        .from("candidates")
        .select("*")
        .order("created_at", { ascending: false });

      setJobs(jobsData || []);
      setCandidates(candidatesData || []);

      setLoading(false);
    };

    loadDashboard();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) return null;

  const upcomingInterviews = candidates.filter(
    (candidate) => candidate.interview_date
  );

  return (
    <main className="min-h-screen bg-gray-100 px-6 py-12">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-5xl font-bold">Dashboard</h1>
            <p className="text-gray-600 mt-3">
              Welcome to your Recruiting CRM
            </p>
            <p className="text-blue-600 mt-2">
              Logged in as: {userEmail}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => router.push("/jobs/new")}
              className="bg-black text-white px-6 py-3 rounded-lg"
            >
              New Job
            </button>

            <button
              onClick={handleLogout}
              className="bg-red-500 text-white px-6 py-3 rounded-lg"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow">
            <p className="text-gray-500">Active Jobs</p>
            <h2 className="text-5xl font-bold mt-2">{jobs.length}</h2>
          </div>

          <div className="bg-white p-6 rounded-xl shadow">
            <p className="text-gray-500">Candidates</p>
            <h2 className="text-5xl font-bold mt-2">
              {candidates.length}
            </h2>
          </div>

          <div className="bg-white p-6 rounded-xl shadow">
            <p className="text-gray-500">Interviews Scheduled</p>
            <h2 className="text-5xl font-bold mt-2">
              {upcomingInterviews.length}
            </h2>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white p-8 rounded-xl shadow">
            <h2 className="text-3xl font-bold mb-6">Recent Jobs</h2>

            {jobs.length === 0 ? (
              <p>No jobs yet.</p>
            ) : (
              jobs.slice(0, 5).map((job) => (
                <div
                  key={job.id}
                  onClick={() => router.push(`/jobs/${job.id}`)}
                  className="border rounded-lg p-4 mb-4 cursor-pointer hover:bg-gray-50"
                >
                  <h3 className="font-bold text-xl">{job.title}</h3>
                  <p className="text-gray-600">
                    {job.location} • {job.employment_type}
                  </p>
                </div>
              ))
            )}
          </div>

          <div className="bg-white p-8 rounded-xl shadow">
            <h2 className="text-3xl font-bold mb-6">
              Upcoming Interviews
            </h2>

            {upcomingInterviews.length === 0 ? (
              <p>No interviews scheduled.</p>
            ) : (
              upcomingInterviews.map((candidate) => (
                <div
                  key={candidate.id}
                  className="border rounded-lg p-4 mb-4"
                >
                  <h3 className="font-bold text-xl">
                    {candidate.full_name}
                  </h3>

                  <p className="text-gray-600">{candidate.email}</p>

                  <p className="text-blue-600 mt-2">
                    {formatInterviewDate(
                      candidate.interview_date!
                    )}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}