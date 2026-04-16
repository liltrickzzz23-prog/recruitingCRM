import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

type Team = {
  id: string;
  name: string;
};

type Profile = {
  company_name: string | null;
  company_logo_url: string | null;
};

type Job = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  employment_type: string | null;
  status: string | null;
  created_at: string;
  team_id: string | null;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

function formatPostedDate(dateString: string) {
  return new Date(dateString).toLocaleDateString();
}

export default async function PublicJobDetailPage({
  params,
}: {
  params: Promise<{ teamId: string; jobId: string }>;
}) {
  const { teamId, jobId } = await params;

  const { data: teamData } = await supabase
    .from("teams")
    .select("id, name")
    .eq("id", teamId)
    .maybeSingle();

  if (!teamData) {
    return (
      <main className="min-h-screen bg-gray-100 px-6 py-16">
        <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow p-10 border border-gray-200">
          <h1 className="text-3xl font-bold">Job Not Found</h1>
          <p className="text-gray-600 mt-3">
            We could not find that public job page.
          </p>
        </div>
      </main>
    );
  }

  const team = teamData as Team;

  const { data: ownerProfileData } = await supabase
    .from("profiles")
    .select("company_name, company_logo_url")
    .eq("team_id", teamId)
    .eq("role", "owner")
    .limit(1)
    .maybeSingle();

  const ownerProfile = ownerProfileData as Profile | null;

  const { data: jobData } = await supabase
    .from("jobs")
    .select(
      "id, title, description, location, employment_type, status, created_at, team_id"
    )
    .eq("id", jobId)
    .eq("team_id", teamId)
    .eq("status", "open")
    .maybeSingle();

  if (!jobData) {
    return (
      <main className="min-h-screen bg-gray-100 px-6 py-16">
        <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow p-10 border border-gray-200">
          <h1 className="text-3xl font-bold">Job Not Found</h1>
          <p className="text-gray-600 mt-3">
            This role may have been removed or is no longer open.
          </p>
          <Link
            href={`/careers/${teamId}`}
            className="inline-block mt-6 bg-black text-white px-5 py-3 rounded-xl"
          >
            Back to Careers Page
          </Link>
        </div>
      </main>
    );
  }

  const job = jobData as Job;
  const brandName = ownerProfile?.company_name || team.name;

  return (
    <main className="min-h-screen bg-gray-100">
      <section className="bg-gradient-to-b from-white to-gray-100 border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-14">
          <Link
            href={`/careers/${teamId}`}
            className="inline-block text-sm text-blue-600 hover:underline mb-6"
          >
            ← Back to Careers
          </Link>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 md:p-10">
            <div className="flex flex-col md:flex-row md:items-start gap-6">
              {ownerProfile?.company_logo_url ? (
                <div className="h-20 w-20 rounded-2xl border border-gray-200 bg-white p-3 flex items-center justify-center">
                  <img
                    src={ownerProfile.company_logo_url}
                    alt="Company logo"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              ) : (
                <div className="h-20 w-20 rounded-2xl bg-black text-white flex items-center justify-center text-3xl font-bold">
                  {brandName.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="flex-1">
                <p className="text-sm uppercase tracking-wide text-gray-500 font-medium">
                  {brandName}
                </p>
                <h1 className="text-4xl md:text-5xl font-bold mt-2">
                  {job.title}
                </h1>

                <div className="mt-5 flex flex-wrap gap-3">
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1.5 text-sm text-gray-700 border border-gray-200">
                    {job.location || "Location not listed"}
                  </span>

                  <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1.5 text-sm text-blue-700 border border-blue-100">
                    {job.employment_type || "Employment type not listed"}
                  </span>

                  <span className="inline-flex items-center rounded-full bg-green-50 px-3 py-1.5 text-sm text-green-700 border border-green-100">
                    Posted {formatPostedDate(job.created_at)}
                  </span>
                </div>

                <div className="mt-8">
                  <Link
                    href={`/jobs/${job.id}/apply`}
                    className="inline-flex items-center justify-center bg-black text-white px-6 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity"
                  >
                    Apply Now
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 md:p-10">
          <h2 className="text-2xl font-bold">Job Description</h2>
          <p className="text-gray-700 mt-5 whitespace-pre-wrap leading-8">
            {job.description || "No description provided."}
          </p>

          <div className="mt-10 pt-8 border-t border-gray-200">
            <h3 className="text-xl font-bold">Ready to Apply?</h3>
            <p className="text-gray-600 mt-3">
              Submit your application online to be considered for this role.
            </p>

            <Link
              href={`/jobs/${job.id}/apply`}
              className="inline-flex items-center justify-center mt-6 bg-black text-white px-6 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity"
            >
              Continue to Application
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}