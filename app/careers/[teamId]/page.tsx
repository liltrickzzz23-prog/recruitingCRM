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
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow p-8">
          <h1 className="text-3xl font-bold">Careers Page Not Found</h1>
          <p className="text-gray-600 mt-3">
            We could not find that careers page.
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

  const { data: jobsData } = await supabase
    .from("jobs")
    .select(
      "id, title, description, location, employment_type, status, created_at, team_id"
    )
    .eq("team_id", teamId)
    .eq("status", "open")
    .order("created_at", { ascending: false });

  const jobs = (jobsData || []) as Job[];

  return (
    <main className="min-h-screen bg-gray-100 px-6 py-16">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-xl shadow p-8 mb-8">
          <div className="flex items-start gap-4">
            {ownerProfile?.company_logo_url ? (
              <img
                src={ownerProfile.company_logo_url}
                alt="Company logo"
                className="h-16 w-16 rounded-lg object-contain border border-gray-200 bg-white p-2"
              />
            ) : null}

            <div>
              <h1 className="text-4xl font-bold">
                {ownerProfile?.company_name || team.name}
              </h1>
              <p className="text-gray-600 mt-2">
                Explore open roles and apply online.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {jobs.length === 0 ? (
            <div className="bg-white rounded-xl shadow p-8">
              <h2 className="text-2xl font-bold">No Open Jobs Right Now</h2>
              <p className="text-gray-600 mt-2">
                Please check back later for new opportunities.
              </p>
            </div>
          ) : (
            jobs.map((job) => (
              <div
                key={job.id}
                className="bg-white rounded-xl shadow p-8 border border-gray-200"
              >
                <h2 className="text-2xl font-bold">{job.title}</h2>
                <p className="text-gray-600 mt-2">
                  {job.location || "No location"} •{" "}
                  {job.employment_type || "No employment type"}
                </p>

                <p className="text-gray-700 mt-4 whitespace-pre-wrap">
                  {job.description || "No description provided."}
                </p>

                <div className="mt-6">
                  <Link
                    href={`/jobs/${job.id}/apply`}
                    className="inline-block bg-black text-white px-5 py-3 rounded-lg"
                  >
                    Apply Now
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}