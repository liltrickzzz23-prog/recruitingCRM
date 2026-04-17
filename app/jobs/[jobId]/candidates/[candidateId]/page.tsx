"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

const RECOMMENDATION_OPTIONS = [
  "Move Forward",
  "Hold",
  "Reject",
];

export default function CandidatePage() {
  const params = useParams();
  const jobId = params.jobId as string;
  const candidateId = params.candidateId as string;

  const [candidate, setCandidate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [parsing, setParsing] = useState(false);
  const [savingScorecard, setSavingScorecard] = useState(false);

  const [scoreOverall, setScoreOverall] = useState("");
  const [scoreCommunication, setScoreCommunication] = useState("");
  const [scoreExperience, setScoreExperience] = useState("");
  const [scoreCultureFit, setScoreCultureFit] = useState("");
  const [scoreStrengths, setScoreStrengths] = useState("");
  const [scoreConcerns, setScoreConcerns] = useState("");
  const [scoreRecommendation, setScoreRecommendation] = useState("Hold");

  const fetchCandidate = async () => {
    const { data, error } = await supabase
      .from("candidates")
      .select("*")
      .eq("id", candidateId)
      .single();

    if (!error && data) {
      setCandidate(data);
      setScoreOverall(data.score_overall?.toString() || "");
      setScoreCommunication(data.score_communication?.toString() || "");
      setScoreExperience(data.score_experience?.toString() || "");
      setScoreCultureFit(data.score_culture_fit?.toString() || "");
      setScoreStrengths(data.score_strengths || "");
      setScoreConcerns(data.score_concerns || "");
      setScoreRecommendation(data.score_recommendation || "Hold");
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchCandidate();
  }, [candidateId]);

  const handleParseResume = async () => {
    if (!candidate?.resume_url) {
      alert("This candidate does not have a resume.");
      return;
    }

    try {
      setParsing(true);

      const res = await fetch("/api/ai/parse-resume", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          candidateId,
          resumeUrl: candidate.resume_url,
        }),
      });

      const text = await res.text();

      let data: any = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(`Server returned non-JSON response: ${text.slice(0, 200)}`);
      }

      if (!res.ok) {
        throw new Error(data.error || "Resume parsing failed");
      }

      alert("AI parsing complete!");
      await fetchCandidate();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Resume parsing failed");
      console.error(error);
    } finally {
      setParsing(false);
    }
  };

  const isValidScore = (value: string) => {
    if (value === "") return true;
    const num = Number(value);
    return Number.isInteger(num) && num >= 1 && num <= 10;
  };

  const handleSaveScorecard = async () => {
    if (
      !isValidScore(scoreOverall) ||
      !isValidScore(scoreCommunication) ||
      !isValidScore(scoreExperience) ||
      !isValidScore(scoreCultureFit)
    ) {
      alert("All scores must be whole numbers from 1 to 10.");
      return;
    }

    try {
      setSavingScorecard(true);

      const updates = {
        score_overall: scoreOverall ? Number(scoreOverall) : null,
        score_communication: scoreCommunication ? Number(scoreCommunication) : null,
        score_experience: scoreExperience ? Number(scoreExperience) : null,
        score_culture_fit: scoreCultureFit ? Number(scoreCultureFit) : null,
        score_strengths: scoreStrengths.trim() || null,
        score_concerns: scoreConcerns.trim() || null,
        score_recommendation: scoreRecommendation || null,
        score_last_updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("candidates")
        .update(updates)
        .eq("id", candidateId);

      if (error) {
        throw new Error(error.message);
      }

      alert("Scorecard saved.");
      await fetchCandidate();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to save scorecard");
    } finally {
      setSavingScorecard(false);
    }
  };

  if (loading) return <div className="p-10">Loading...</div>;
  if (!candidate) return <div className="p-10">Not found</div>;

  return (
    <div className="p-10 max-w-5xl mx-auto space-y-6">
      <a href={`/jobs/${jobId}`} className="text-blue-500">
        ← Back to Job
      </a>

      <div className="bg-white p-6 rounded-xl shadow">
        <h1 className="text-3xl font-bold">{candidate.full_name}</h1>
        <p className="text-gray-600">{candidate.email}</p>

        {candidate.resume_url && (
          <a
            href={candidate.resume_url}
            target="_blank"
            rel="noreferrer"
            className="text-green-600 underline block mt-2"
          >
            View Resume
          </a>
        )}

        <button
          onClick={handleParseResume}
          disabled={parsing}
          className="mt-4 bg-black text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {parsing ? "Parsing..." : "AI Parse Resume"}
        </button>
      </div>

      <div className="bg-white p-6 rounded-xl shadow space-y-4">
        <h2 className="text-xl font-bold">AI Resume Analysis</h2>

        {!candidate.ai_resume_summary &&
        !candidate.ai_resume_strengths &&
        !candidate.ai_resume_risks &&
        !candidate.ai_resume_fit ? (
          <p className="text-gray-500">
            No AI analysis yet. Click “AI Parse Resume”.
          </p>
        ) : (
          <>
            <div>
              <h3 className="font-semibold">Summary</h3>
              <p className="mt-1 text-gray-700">{candidate.ai_resume_summary || "—"}</p>
            </div>

            <div>
              <h3 className="font-semibold">Strengths</h3>
              <p className="mt-1 text-gray-700">{candidate.ai_resume_strengths || "—"}</p>
            </div>

            <div>
              <h3 className="font-semibold">Risks</h3>
              <p className="mt-1 text-gray-700">{candidate.ai_resume_risks || "—"}</p>
            </div>

            <div>
              <h3 className="font-semibold">Overall Fit</h3>
              <p className="mt-1 text-gray-700">{candidate.ai_resume_fit || "—"}</p>
            </div>

            {candidate.ai_resume_last_parsed_at && (
              <p className="text-xs text-gray-500">
                Last parsed:{" "}
                {new Date(candidate.ai_resume_last_parsed_at).toLocaleString()}
              </p>
            )}
          </>
        )}
      </div>

      <div className="bg-white p-6 rounded-xl shadow space-y-5">
        <div>
          <h2 className="text-xl font-bold">Candidate Scorecard</h2>
          <p className="text-gray-500 mt-1">
            Rate this candidate and record your hiring recommendation.
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Overall Score (1-10)
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={scoreOverall}
              onChange={(e) => setScoreOverall(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="8"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Communication
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={scoreCommunication}
              onChange={(e) => setScoreCommunication(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="7"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Experience
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={scoreExperience}
              onChange={(e) => setScoreExperience(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="9"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Culture Fit
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={scoreCultureFit}
              onChange={(e) => setScoreCultureFit(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="8"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Strengths
          </label>
          <textarea
            value={scoreStrengths}
            onChange={(e) => setScoreStrengths(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 min-h-[100px]"
            placeholder="Strong customer service background, clear communication, reliable work history..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Concerns
          </label>
          <textarea
            value={scoreConcerns}
            onChange={(e) => setScoreConcerns(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 min-h-[100px]"
            placeholder="Limited direct experience, short tenure in last role..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Recommendation
          </label>
          <select
            value={scoreRecommendation}
            onChange={(e) => setScoreRecommendation(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
          >
            {RECOMMENDATION_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleSaveScorecard}
          disabled={savingScorecard}
          className="bg-indigo-600 text-white px-5 py-3 rounded-lg disabled:opacity-50"
        >
          {savingScorecard ? "Saving..." : "Save Scorecard"}
        </button>

        {candidate.score_last_updated_at && (
          <p className="text-xs text-gray-500">
            Last updated:{" "}
            {new Date(candidate.score_last_updated_at).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
}