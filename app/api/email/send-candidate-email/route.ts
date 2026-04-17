import { NextResponse } from "next/server";
import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY!;
const fromEmail = process.env.RESEND_FROM_EMAIL!;

if (!resendApiKey) {
  throw new Error("Missing RESEND_API_KEY");
}

if (!fromEmail) {
  throw new Error("Missing RESEND_FROM_EMAIL");
}

const resend = new Resend(resendApiKey);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const to = (body.to as string | undefined)?.trim();
    const subject = (body.subject as string | undefined)?.trim();
    const message = (body.message as string | undefined)?.trim();

    if (!to) {
      return NextResponse.json(
        { error: "Missing recipient email" },
        { status: 400 }
      );
    }

    if (!subject) {
      return NextResponse.json(
        { error: "Missing subject" },
        { status: 400 }
      );
    }

    if (!message) {
      return NextResponse.json(
        { error: "Missing message" },
        { status: 400 }
      );
    }

    const result = await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      text: message,
    });

    if (result.error) {
      return NextResponse.json(
        { error: result.error.message || "Failed to send email" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Send candidate email error:", error);

    return NextResponse.json(
      { error: "Failed to send candidate email" },
      { status: 500 }
    );
  }
}