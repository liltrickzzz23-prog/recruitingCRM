"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";

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

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  company_name: string | null;
  company_logo_url: string | null;
  recruiter_signature: string | null;
  team_id: string | null;
};

type ActivityLog = {
  id: string;
  description: string;
  created_at: string;
  action_type: string;
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
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
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

  const getSignatureText = () => {
    if (profile?.recruiter_signature && profile.recruiter_signature.trim() !== "") {
      return profile.recruiter_signature;
    }

    if (profile?.full_name && profile?.company_name) {
      return `Best,\n${profile.full_name}\n${profile.company_name}`;
    }

    if (profile?.full_name) {
      return `Best,\n${profile.full_name}`;
    }

    return "Best,\nHiring Team";
  };

  const createMailtoLink = (subjectText: string, bodyText: string) => {
    if (!candidate) return "#";

    const subject = encodeURIComponent(subjectText);
    const body = encodeURIComponent(bodyText);

    return `mailto:${candidate.email}?subject=${subject}&body=${body}`;
  };

  const getGeneralEmailLink = () => {
    if (!candidate) return "#";

    return createMailtoLink(
      "Follow up regarding your application",
      `Hi ${candidate.full_name},

Thank you for your application. I wanted to follow up with you regarding the role.

${getSignatureText()}`
    );
  };

  const getInterviewInviteLink = () => {
    if (!candidate) return "#";

    const interviewText = candidate.interview_date
      ? `We would like to invite you to interview on ${formatInterviewDate(
          candidate.interview_date
        )}.`
      : "We would like to invite you to an interview.";

    return createMailtoLink(
      "Interview Invitation",
      `Hi ${candidate.full_name},

Thank you for your application.

${interviewText}

Please reply to confirm your availability.

${getSignatureText()}`
    );
  };

  const getRejectionEmailLink = () => {
    if (!candidate) return "#";

    return createMailtoLink(
      "Update on your application",
      `Hi ${candidate.full_name},

Thank you for taking the time to apply for this role.

At this time, we have decided to move forward with other candidates. We appreciate your interest and wish you the best in your job search.

${getSignatureText()}`
    );
  };

  const getFollowUpEmailLink = () => {
    if (!candidate) return "#";

    return createMailtoLink(
      "Application Follow-Up",
      `Hi ${candidate.full_name},

I wanted to follow up regarding your application and see if you have any questions for us.

Looking forward to hearing from you.

${getSignatureText()}`
    );
  };

  const loadActivity = async () => {
    const { data } = await supabase
      .from("activity_logs")
      .select("id, description, created_at, action_type")
      .eq("candidate_id", candidateId)
      .order("created_at", { ascending: false });

    setActivityLogs(data || []);
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

      const { data: profileData } = await supabase
        .from("profiles")
        .select(
          "id, email, full_name, company_name, company_logo_url, recruiter_signature, team_id"
        )
        .eq("id", session.user.id)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData);
      }

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
      await loadActivity();
      setLoading(false);
    };

    if (candidateId && jobId) {
      loadCandidate();
    }
  }, [candidateId, jobId, router]);

  const handleSave = async () => {
    if (!candidate || !profile) return;

    const previousStage = candidate.stage || "Applied";
    const previousNotes = candidate.notes || "";
    const previousInterviewDate = candidate.interview_date || "";

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

    if (stage !== previousStage) {
      await logActivity({
        teamId: profile.team_id,
        userId: profile.id,
        jobId,
        candidateId: candidate.id,
        actionType: "candidate_stage_changed",
        description: `${candidate.full_name} stage changed from ${previousStage} to ${stage}`,
      });
    }

    if (notes !== previousNotes) {
      await logActivity({
        teamId: profile.team_id,
        userId: profile.id,
        jobId,
        candidateId: candidate.id,
        actionType: "candidate_notes_updated",
        description: `Updated notes for ${candidate.full_name}`,
      });
    }

    if ((interviewDate || "") !== previousInterviewDate) {
      await logActivity({
        teamId: profile.team_id,
        userId: profile.id,
        jobId,
        candidateId: candidate.id,
        actionType: "candidate_interview_updated",
        description: interviewDate
          ? `Set interview for ${candidate.full_name} to ${formatInterviewDate(
              interviewDate
            )}`
          : `Cleared interview date for ${candidate.full_name}`,
      });
    }

    setCandidate({
      ...candidate,
      stage,
      notes,
      interview_date: interviewDate || null,
    });

    await loadActivity();

    setSaving(false);
    alert("Candidate updated.");
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
          <p className="text-gray-600">Loading candidate...</p>
        </div>
      </main>
    );
  }

  if (!candidate) {
    return (
      <main className="min-h-screen bg-gray-100 px-6 py-12">
        <div className="max-w-5xl mx-auto">
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
      <div className="max-w-5xl mx-auto">
        <button
          onClick={() => router.push(`/jobs/${jobId}`)}
          className="mb-6 text-sm text-blue-600 hover:underline"
        >
          ← Back to Job
        </button>

        <div className="grid lg:grid-cols-[2fr_1fr] gap-6">
          <div className="bg-white rounded-xl shadow p-8">
            <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
              <div className="flex items-start gap-4">
                {profile?.company_logo_url ? (
                  <img
                    src={profile.company_logo_url}
                    alt="Company logo"
                    className="h-14 w-14 rounded-lg object-contain border border-gray-200 bg-white p-2"
                  />
                ) : null}

                <div>
                  <h1 className="text-3xl font-bold">{candidate.full_name}</h1>

                  {profile?.company_name ? (
                    <p className="text-sm text-gray-500 mt-1">
                      {profile.company_name}
                    </p>
                  ) : null}

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
                </div>
              </div>

              <div className="flex flex-col gap-3 w-full md:w-auto">
                <a
                  href={getGeneralEmailLink()}
                  className="bg-black text-white px-4 py-2 rounded-lg text-center"
                >
                  Email Candidate
                </a>

                <a
                  href={getInterviewInviteLink()}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-center"
                >
                  Send Interview Invite
                </a>

                <a
                  href={getRejectionEmailLink()}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg text-center"
                >
                  Send Rejection
                </a>

                <a
                  href={getFollowUpEmailLink()}
                  className="bg-gray-700 text-white px-4 py-2 rounded-lg text-center"
                >
                  Send Follow-up
                </a>

                <button
                  onClick={() => router.push("/interviews")}
                  className="bg-gray-200 text-black px-4 py-2 rounded-lg text-center"
                >
                  View All Interviews
                </button>
              </div>
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

          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-2xl font-bold">Recent Activity</h2>
            <p className="text-gray-500 mt-2 text-sm">
              Changes made to this candidate.
            </p>

            <div className="mt-6 space-y-4">
              {activityLogs.length === 0 ? (
                <p className="text-gray-500 text-sm">No activity yet.</p>
              ) : (
                activityLogs.map((log) => (
                  <div
                    key={log.id}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <p className="text-sm font-medium">{log.description}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(log.created_at).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}