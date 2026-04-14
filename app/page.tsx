import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-100">
      <div className="max-w-6xl mx-auto px-6 py-20">
        <div className="bg-white rounded-2xl shadow p-10">
          <h1 className="text-5xl font-bold text-black">
            Recruiting CRM for Small Businesses
          </h1>

          <p className="mt-6 text-lg text-gray-600 max-w-2xl">
            Post jobs, collect applicants, track candidates, manage interview
            stages, save notes, and stay on top of upcoming interviews.
          </p>

          <div className="mt-8 flex gap-4">
            <Link
              href="/login"
              className="bg-black text-white px-6 py-3 rounded-lg font-medium"
            >
              Log In
            </Link>

            <Link
              href="/dashboard"
              className="bg-white border border-gray-300 text-black px-6 py-3 rounded-lg font-medium"
            >
              Go to Dashboard
            </Link>
          </div>

          <div className="mt-12 grid md:grid-cols-3 gap-6">
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
              <h2 className="text-xl font-bold">Post Jobs</h2>
              <p className="mt-2 text-gray-600">
                Create job listings and manage hiring in one place.
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
              <h2 className="text-xl font-bold">Track Candidates</h2>
              <p className="mt-2 text-gray-600">
                Move applicants through stages, add notes, and stay organized.
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
              <h2 className="text-xl font-bold">Schedule Interviews</h2>
              <p className="mt-2 text-gray-600">
                Save interview dates and view upcoming interviews on your dashboard.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}