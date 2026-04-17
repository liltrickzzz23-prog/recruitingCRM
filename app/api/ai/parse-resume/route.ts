import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const candidateId = body.candidateId as string | undefined;
    const resumeUrl = body.resumeUrl as string | undefined;

    if (!candidateId) {
      return NextResponse.json(
        { error: "Missing candidateId" },
        { status: 400 }
      );
    }

    if (!resumeUrl) {
      return NextResponse.json(
        { error: "Candidate does not have a resume URL" },
        { status: 400 }
      );
    }

    const response = await openai.responses.create({
      model: "gpt-5-mini",
      text: {
        format: {
          type: "json_schema",
          name: "resume_analysis",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              summary: { type: "string" },
              strengths: { type: "string" },
              risks: { type: "string" },
              fit: { type: "string" },
            },
            required: ["summary", "strengths", "risks", "fit"],
          },
        },
      },
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text:
                "You are an expert recruiting assistant. Analyze the uploaded resume and return concise hiring insights.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                "Please analyze this resume and return: summary, strengths, risks, and overall fit for a recruiter.",
            },
            {
              type: "input_file",
              file_url: resumeUrl,
            },
          ],
        },
      ],
    });

    const outputText = response.output_text?.trim();

    if (!outputText) {
      return NextResponse.json(
        { error: "No parsing result returned" },
        { status: 500 }
      );
    }

    let parsed: {
      summary: string;
      strengths: string;
      risks: string;
      fit: string;
    };

    try {
      parsed = JSON.parse(outputText);
    } catch {
      return NextResponse.json(
        { error: "Model returned invalid JSON", raw: outputText },
        { status: 500 }
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from("candidates")
      .update({
        ai_resume_summary: parsed.summary || null,
        ai_resume_strengths: parsed.strengths || null,
        ai_resume_risks: parsed.risks || null,
        ai_resume_fit: parsed.fit || null,
        ai_resume_last_parsed_at: new Date().toISOString(),
      })
      .eq("id", candidateId);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      parsed,
    });
  } catch (error) {
    console.error("AI resume parsing error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to parse resume",
      },
      { status: 500 }
    );
  }
}