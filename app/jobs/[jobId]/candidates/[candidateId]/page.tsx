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

    if (!error) setCandidate(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchCandidate();
  }, []);

  const handleParseResume = async () => {
    setParsing(true);

    const res = await fetch("/api/ai/parse-resume", {
      method: "POST",
      body: JSON.stringify({
        candidateId,
        resumeUrl: candidate.resume_url,
      }),
    });

    const data = await res.json();

    if (data.error) {
      alert(data.error);
    } else {
      alert("AI parsing complete!");
      fetchCandidate();
    }

    setParsing(false);
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
            className="text-green-600 underline block mt-2"
          >
            View Resume
          </a>
        )}

        <button
          onClick={handleParseResume}
          disabled={parsing}
          className="mt-4 bg-black text-white px-4 py-2 rounded"
        >
          {parsing ? "Parsing..." : "AI Parse Resume"}
        </button>
      </div>

      {candidate.ai_summary && (
        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="text-xl font-bold mb-2">AI Resume Analysis</h2>
          <p>{candidate.ai_summary}</p>
        </div>
      )}
    </div>
  );
}