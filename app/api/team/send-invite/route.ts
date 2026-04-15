import { NextResponse } from "next/server";
import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.RESEND_FROM_EMAIL;
const appUrl = process.env.NEXT_PUBLIC_APP_URL;

if (!resendApiKey) {
  throw new Error("Missing RESEND_API_KEY");
}

if (!fromEmail) {
  throw new Error("Missing RESEND_FROM_EMAIL");
}

if (!appUrl) {
  throw new Error("Missing NEXT_PUBLIC_APP_URL");
}

const resend = new Resend(resendApiKey);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const inviteeEmail = (body.email as string | undefined)?.trim().toLowerCase();
    const teamName = (body.teamName as string | undefined)?.trim();
    const inviteId = body.inviteId as string | undefined;

    if (!inviteeEmail) {
      return NextResponse.json(
        { error: "Missing invitee email" },
        { status: 400 }
      );
    }

    if (!teamName) {
      return NextResponse.json(
        { error: "Missing team name" },
        { status: 400 }
      );
    }

    if (!inviteId) {
      return NextResponse.json(
        { error: "Missing invite ID" },
        { status: 400 }
      );
    }

    const signupUrl = `${appUrl}/signup?invite=${inviteId}&email=${encodeURIComponent(
      inviteeEmail
    )}`;

    const { error } = await resend.emails.send({
      from: fromEmail,
      to: inviteeEmail,
      subject: `You’ve been invited to join ${teamName}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
          <h2>You’ve been invited to join ${teamName}</h2>
          <p>You were invited to join a team inside Recruiting CRM.</p>
          <p>
            Click the button below to create your account and join the team:
          </p>
          <p style="margin: 24px 0;">
            <a
              href="${signupUrl}"
              style="
                background: #111;
                color: #fff;
                text-decoration: none;
                padding: 12px 18px;
                border-radius: 8px;
                display: inline-block;
              "
            >
              Accept Invite
            </a>
          </p>
          <p>If the button does not work, copy and paste this link into your browser:</p>
          <p>${signupUrl}</p>
        </div>
      `,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to send invite email" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Invite email error:", error);

    return NextResponse.json(
      { error: "Failed to send invite email" },
      { status: 500 }
    );
  }
}