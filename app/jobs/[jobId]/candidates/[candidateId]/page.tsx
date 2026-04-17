"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function CandidatePage() {
  const params = useParams();
  const jobId = params.jobId as string;
  const candidateId = params.candidateId as string;

  const [candidate, setCandidate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [parsing, setParsing] = useState(false);

  const fetchCandidate = async () => {
    const { data, error } = await supabase
      .from("candidates")
      .select("*")
      .eq("id", candidateId)
      .single();

    if (!error) {
      setCandidate(data);
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

  if (loading) return <div className="p-10">Loading...</div>;
  if (!candidate) return <div className="p-10">Not found</div>;

  return (
    <div className="p-10 max-w-4xl mx-auto space-y-6">
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
    </div>
  );
}