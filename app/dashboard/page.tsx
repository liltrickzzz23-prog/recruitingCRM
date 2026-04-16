"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Job = {
  id: string;
  title: string;
  location: string | null;
  employment_type: string | null;
  status: string | null;
  created_at: string;
  user_id: string;
  team_id: string | null;
};

type Candidate = {
  id: string;
  full_name: string;
  email: string;
  stage: string | null;
  interview_date: string | null;
  created_at: string;
  job_id: string;
};

type Profile = {
  id: string;
  subscription_status: string | null;
  stripe_customer_id: string | null;
  email: string | null;
  team_id: string | null;
  role: string | null;
};

const STAGE_OPTIONS = [
  "Applied",
  "Reviewed",
  "Interview",
  "Offer",
  "Hired",
  "Rejected",
];

const PAID_STATUSES = ["active", "trialing"];

export default function DashboardPage() {
  const router = useRouter();

  const [userEmail, setUserEmail] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [startingCheckout, setStartingCheckout] = useState(false);
  const [openingPortal, setOpeningPortal] = useState(false);

  const isPaid = PAID_STATUSES.includes(profile?.subscription_status || "");

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
    const loadDashboard = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      const currentEmail = (session.user.email || "").toLowerCase();
      setUserEmail(currentEmail);

      const { data: currentProfile, error: profileError } = await supabase
        .from("profiles")
        .select("id, subscription_status, stripe_customer_id, email, team_id, role")
        .eq("id", session.user.id)
        .maybeSingle();

      if (profileError) {
        alert(profileError.message);
        setLoading(false);
        return;
      }

      let workingProfile = currentProfile || null;

      const { data: inviteData, error: inviteLookupError } = await supabase
        .from("team_invitations")
        .select("id, team_id, status")
        .eq("email", currentEmail)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (inviteLookupError) {
        alert(inviteLookupError.message);
        setLoading(false);
        return;
      }

      if (inviteData?.team_id) {
        const { error: profileUpdateError } = await supabase
          .from("profiles")
          .update({
            team_id: inviteData.team_id,
            role: "recruiter",
          })
          .eq("id", session.user.id);

        if (profileUpdateError) {
          alert(`Profile team join failed: ${profileUpdateError.message}`);
          setLoading(false);
          return;
        }

        const { error: inviteUpdateError } = await supabase
          .from("team_invitations")
          .update({
            status: "accepted",
          })
          .eq("id", inviteData.id);

        if (inviteUpdateError) {
          alert(`Invite accept failed: ${inviteUpdateError.message}`);
          setLoading(false);
          return;
        }

        const { data: refreshedProfile, error: refreshedProfileError } =
          await supabase
            .from("profiles")
            .select("id, subscription_status, stripe_customer_id, email, team_id, role")
            .eq("id", session.user.id)
            .maybeSingle();

        if (refreshedProfileError) {
          alert(refreshedProfileError.message);
          setLoading(false);
          return;
        }

        workingProfile = refreshedProfile || workingProfile;
      }

      if (workingProfile) {
        setProfile(workingProfile);
      }

      const activeTeamId = workingProfile?.team_id || null;

      let jobsQuery = supabase
        .from("jobs")
        .select("id, title, location, employment_type, status, created_at, user_id, team_id")
        .order("created_at", { ascending: false });

      if (activeTeamId) {
        jobsQuery = jobsQuery.eq("team_id", activeTeamId);
      } else {
        jobsQuery = jobsQuery.eq("user_id", session.user.id);
      }

      const { data: jobsData, error: jobsError } = await jobsQuery;

      if (jobsError) {
        console.error("Error loading jobs:", jobsError.message);
        setLoading(false);
        return;
      }

      const visibleJobs = jobsData || [];
      setJobs(visibleJobs);

      if (visibleJobs.length === 0) {
        setCandidates([]);
        setLoading(false);
        return;
      }

      const jobIds = visibleJobs.map((job) => job.id);

      const { data: candidatesData, error: candidatesError } = await supabase
        .from("candidates")
        .select("id, full_name, email, stage, interview_date, created_at, job_id")
        .in("job_id", jobIds)
        .order("created_at", { ascending: false });

      if (candidatesError) {
        console.error("Error loading candidates:", candidatesError.message);
        setLoading(false);
        return;
      }

      setCandidates(candidatesData || []);
      setLoading(false);
    };

    loadDashboard();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const handleSubscribe = async () => {
    try {
      setStartingCheckout(true);

      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: userEmail,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Unable to start checkout.");
        setStartingCheckout(false);
        return;
      }

      window.location.href = data.url;
    } catch (error) {
      console.error(error);
      alert("Unable to start checkout.");
      setStartingCheckout(false);
    }
  };

  const handleManageBilling = async () => {
    try {
      setOpeningPortal(true);

      const response = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: userEmail,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Unable to open billing portal.");
        setOpeningPortal(false);
        return;
      }

      window.location.href = data.url;
    } catch (error) {
      console.error(error);
      alert("Unable to open billing portal.");
      setOpeningPortal(false);
    }
  };

  const handleOpenInterviews = () => {
    if (!isPaid) {
      alert("Interview Scheduler is a Pro feature. Please subscribe to unlock it.");
      return;
    }

    router.push("/interviews");
  };

  const analytics = useMemo(() => {
    const totalJobs = jobs.length;
    const openJobs = jobs.filter(
      (job) => (job.status || "open") === "open"
    ).length;
    const closedJobs = jobs.filter((job) => job.status === "closed").length;

    const totalCandidates = candidates.length;
    const interviewsScheduled = candidates.filter(
      (candidate) => candidate.interview_date
    ).length;
    const hiredCount = candidates.filter(
      (candidate) => (candidate.stage || "Applied") === "Hired"
    ).length;

    const stageCounts: Record<string, number> = {};
    STAGE_OPTIONS.forEach((stage) => {
      stageCounts[stage] = candidates.filter(
        (candidate) => (candidate.stage || "Applied") === stage
      ).length;
    });

    return {
      totalJobs,
      openJobs,
      closedJobs,
      totalCandidates,
      interviewsScheduled,
      hiredCount,
      stageCounts,
    };
  }, [jobs, candidates]);

  const upcomingInterviews = useMemo(() => {
    return candidates
      .filter((candidate) => candidate.interview_date)
      .sort((a, b) => {
        const dateA = a.interview_date || "";
        const dateB = b.interview_date || "";
        return dateA.localeCompare(dateB);
      });
  }, [candidates]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 px-6 py-12">
        <div className="max-w-7xl mx-auto">
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 px-6 py-12">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-8">
          <div>
            <h1 className="text-5xl font-bold">Dashboard</h1>
            <p className="text-gray-600 mt-3">
              Welcome to your Recruiting CRM
            </p>
            <p className="text-blue-600 mt-2">Logged in as: {userEmail}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              {isPaid ? (
                <span className="inline-block rounded-full bg-green-100 text-green-700 px-3 py-1 text-sm font-medium">
                  Pro Plan Active
                </span>
              ) : (
                <span className="inline-block rounded-full bg-yellow-100 text-yellow-700 px-3 py-1 text-sm font-medium">
                  Free Plan
                </span>
              )}

              {profile?.team_id ? (
                <span className="inline-block rounded-full bg-indigo-100 text-indigo-700 px-3 py-1 text-sm font-medium">
                  Team Workspace
                </span>
              ) : (
                <span className="inline-block rounded-full bg-gray-100 text-gray-700 px-3 py-1 text-sm font-medium">
                  Personal Workspace
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => router.push("/jobs/new")}
              className="bg-black text-white px-6 py-3 rounded-lg"
            >
              New Job
            </button>

            <button
              onClick={handleOpenInterviews}
              className={`px-6 py-3 rounded-lg text-white ${
                isPaid ? "bg-blue-600" : "bg-gray-400"
              }`}
            >
              Interviews
            </button>

            <button
              onClick={() => router.push("/settings")}
              className="bg-gray-800 text-white px-6 py-3 rounded-lg"
            >
              Settings
            </button>

            <button
              onClick={() => router.push("/team")}
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg"
            >
              Team
            </button>

            {!isPaid ? (
              <button
                onClick={handleSubscribe}
                disabled={startingCheckout}
                className="bg-green-600 text-white px-6 py-3 rounded-lg disabled:opacity-50"
              >
                {startingCheckout ? "Starting..." : "Upgrade to Pro"}
              </button>
            ) : (
              <button
                onClick={handleManageBilling}
                disabled={openingPortal}
                className="bg-purple-600 text-white px-6 py-3 rounded-lg disabled:opacity-50"
              >
                {openingPortal ? "Opening..." : "Manage Billing"}
              </button>
            )}

            <button
              onClick={handleLogout}
              className="bg-red-500 text-white px-6 py-3 rounded-lg"
            >
              Logout
            </button>
          </div>
        </div>

        {!isPaid && (
          <div className="bg-white rounded-xl shadow p-6 mb-8 border border-yellow-200">
            <h2 className="text-2xl font-bold">Upgrade to Pro</h2>
            <p className="text-gray-600 mt-2">
              Unlock interview scheduling, full analytics, and more premium
              features.
            </p>
            <button
              onClick={handleSubscribe}
              disabled={startingCheckout}
              className="mt-4 bg-green-600 text-white px-5 py-3 rounded-lg disabled:opacity-50"
            >
              {startingCheckout ? "Starting..." : "Subscribe Now"}
            </button>
          </div>
        )}

        {isPaid ? (
          <>
            <div className="grid md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white p-6 rounded-xl shadow">
                <p className="text-gray-500">Total Jobs</p>
                <h2 className="text-5xl font-bold mt-2">{analytics.totalJobs}</h2>
              </div>

              <div className="bg-white p-6 rounded-xl shadow">
                <p className="text-gray-500">Open Jobs</p>
                <h2 className="text-5xl font-bold mt-2">{analytics.openJobs}</h2>
              </div>

              <div className="bg-white p-6 rounded-xl shadow">
                <p className="text-gray-500">Closed Jobs</p>
                <h2 className="text-5xl font-bold mt-2">{analytics.closedJobs}</h2>
              </div>

              <div className="bg-white p-6 rounded-xl shadow">
                <p className="text-gray-500">Total Candidates</p>
                <h2 className="text-5xl font-bold mt-2">
                  {analytics.totalCandidates}
                </h2>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-6 rounded-xl shadow">
                <p className="text-gray-500">Interviews Scheduled</p>
                <h2 className="text-5xl font-bold mt-2">
                  {analytics.interviewsScheduled}
                </h2>
              </div>

              <div className="bg-white p-6 rounded-xl shadow">
                <p className="text-gray-500">Hired</p>
                <h2 className="text-5xl font-bold mt-2">{analytics.hiredCount}</h2>
              </div>

              <div className="bg-white p-6 rounded-xl shadow">
                <p className="text-gray-500">Applied</p>
                <h2 className="text-5xl font-bold mt-2">
                  {analytics.stageCounts["Applied"]}
                </h2>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
              {STAGE_OPTIONS.map((stage) => (
                <div key={stage} className="bg-white p-6 rounded-xl shadow">
                  <p className="text-gray-500">{stage}</p>
                  <h2 className="text-4xl font-bold mt-2">
                    {analytics.stageCounts[stage]}
                  </h2>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="bg-white rounded-xl shadow p-8 mb-8">
            <h2 className="text-3xl font-bold">Analytics Locked</h2>
            <p className="text-gray-600 mt-3">
              Upgrade to Pro to unlock analytics, interview scheduling, and
              premium workflow tools.
            </p>
            <button
              onClick={handleSubscribe}
              disabled={startingCheckout}
              className="mt-5 bg-green-600 text-white px-5 py-3 rounded-lg disabled:opacity-50"
            >
              {startingCheckout ? "Starting..." : "Upgrade to Pro"}
            </button>
          </div>
        )}

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
                    {job.location || "No location"} •{" "}
                    {job.employment_type || "No employment type"}
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    Status: {job.status || "open"}
                  </p>
                  {job.team_id ? (
                    <p className="text-xs text-indigo-600 mt-2">Shared team job</p>
                  ) : null}
                </div>
              ))
            )}
          </div>

          <div className="bg-white p-8 rounded-xl shadow">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold">Upcoming Interviews</h2>

              {isPaid ? (
                <button
                  onClick={() => router.push("/interviews")}
                  className="text-sm text-blue-600 hover:underline"
                >
                  View All
                </button>
              ) : null}
            </div>

            {!isPaid ? (
              <p className="text-gray-600">
                Upgrade to Pro to unlock the interview scheduler.
              </p>
            ) : upcomingInterviews.length === 0 ? (
              <p>No interviews scheduled.</p>
            ) : (
              upcomingInterviews.slice(0, 8).map((candidate) => (
                <div key={candidate.id} className="border rounded-lg p-4 mb-4">
                  <h3 className="font-bold text-xl">{candidate.full_name}</h3>
                  <p className="text-gray-600">{candidate.email}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Stage: {candidate.stage || "Applied"}
                  </p>
                  <p className="text-blue-600 mt-2">
                    {formatInterviewDate(candidate.interview_date!)}
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