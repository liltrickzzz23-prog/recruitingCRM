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

function shortenText(text: string | null, maxLength: number) {
  if (!text) return "No description provided.";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
}

function formatPostedDate(dateString: string) {
  return new Date(dateString).toLocaleDateString();
}

export default async function PublicCareersPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;

  const { data: teamData } = await supabase
    .from("teams")
    .select("id, name")
    .eq("id", teamId)
    .maybeSingle();

  if (!teamData) {
    return (
      <main className="min-h-screen bg-gray-100 px-6 py-16">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-2xl shadow p-10 border border-gray-200">
            <h1 className="text-3xl font-bold">Careers Page Not Found</h1>
            <p className="text-gray-600 mt-3">
              We could not find that careers page.
            </p>
          </div>
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

  const { data: jobsData } = await supabase
    .from("jobs")
    .select(
      "id, title, description, location, employment_type, status, created_at, team_id"
    )
    .eq("team_id", teamId)
    .eq("status", "open")
    .order("created_at", { ascending: false });

  const jobs = (jobsData || []) as Job[];

  const brandName = ownerProfile?.company_name || team.name;

  return (
    <main className="min-h-screen bg-gray-100">
      <section className="bg-gradient-to-b from-white to-gray-100 border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 md:p-10">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
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
                  Careers
                </p>
                <h1 className="text-4xl md:text-5xl font-bold mt-2">
                  Join {brandName}
                </h1>
                <p className="text-gray-600 mt-4 max-w-2xl text-lg">
                  Explore open opportunities and apply online. We’re looking for
                  talented people to join our growing team.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-4 py-2 text-sm text-gray-700 border border-gray-200">
                    {jobs.length} Open {jobs.length === 1 ? "Role" : "Roles"}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-indigo-50 px-4 py-2 text-sm text-indigo-700 border border-indigo-100">
                    Public Job Board
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-12">
        {jobs.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-10 border border-gray-200 text-center">
            <h2 className="text-2xl font-bold">No Open Jobs Right Now</h2>
            <p className="text-gray-600 mt-3">
              Please check back later for new opportunities.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h2 className="text-3xl font-bold">Open Positions</h2>
              <p className="text-gray-600 mt-2">
                Browse our current openings and apply to the role that fits you
                best.
              </p>
            </div>

            <div className="grid gap-6">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold">{job.title}</h3>

                      <div className="mt-4 flex flex-wrap gap-3">
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

                      <p className="text-gray-700 mt-5 whitespace-pre-wrap leading-7">
                        {shortenText(job.description, 280)}
                      </p>
                    </div>

                    <div className="lg:w-auto">
                      <Link
                        href={`/jobs/${job.id}/apply`}
                        className="inline-flex items-center justify-center bg-black text-white px-6 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity w-full lg:w-auto"
                      >
                        Apply Now
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}