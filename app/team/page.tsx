"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  team_id: string | null;
};

type Team = {
  id: string;
  name: string;
  owner_user_id: string | null;
  created_at: string;
};

type TeamInvitation = {
  id: string;
  email: string;
  status: string;
  created_at: string;
};

export default function TeamPage() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  const [userId, setUserId] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);

  const [teamName, setTeamName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");

  const [creatingTeam, setCreatingTeam] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);

  useEffect(() => {
    const loadTeamPage = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      setAuthorized(true);
      setCheckingAuth(false);
      setUserId(session.user.id);

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, email, full_name, team_id")
        .eq("id", session.user.id)
        .maybeSingle();

      if (profileError) {
        alert(profileError.message);
        setLoading(false);
        return;
      }

      if (!profileData) {
        setLoading(false);
        return;
      }

      setProfile(profileData);

      if (profileData.team_id) {
        const { data: teamData, error: teamError } = await supabase
          .from("teams")
          .select("id, name, owner_user_id, created_at")
          .eq("id", profileData.team_id)
          .maybeSingle();

        if (teamError) {
          alert(teamError.message);
          setLoading(false);
          return;
        }

        if (teamData) {
          setTeam(teamData);
          setTeamName(teamData.name);

          const { data: invitesData, error: invitesError } = await supabase
            .from("team_invitations")
            .select("id, email, status, created_at")
            .eq("team_id", teamData.id)
            .order("created_at", { ascending: false });

          if (invitesError) {
            alert(invitesError.message);
            setLoading(false);
            return;
          }

          setInvitations(invitesData || []);
        }
      }

      setLoading(false);
    };

    loadTeamPage();
  }, [router]);

  const reloadInvitations = async (teamId: string) => {
    const { data: invitesData, error } = await supabase
      .from("team_invitations")
      .select("id, email, status, created_at")
      .eq("team_id", teamId)
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
      return;
    }

    setInvitations(invitesData || []);
  };

  const handleCreateTeam = async (e: FormEvent) => {
    e.preventDefault();

    if (!teamName.trim()) {
      alert("Please enter a team name.");
      return;
    }

    if (!profile) {
      alert("Profile not loaded.");
      return;
    }

    setCreatingTeam(true);

    const { data: newTeam, error: teamError } = await supabase
      .from("teams")
      .insert({
        name: teamName.trim(),
        owner_user_id: userId,
      })
      .select("id, name, owner_user_id, created_at")
      .single();

    if (teamError) {
      alert(teamError.message);
      setCreatingTeam(false);
      return;
    }

    const { error: profileUpdateError } = await supabase
      .from("profiles")
      .update({
        team_id: newTeam.id,
      })
      .eq("id", userId);

    if (profileUpdateError) {
      alert(profileUpdateError.message);
      setCreatingTeam(false);
      return;
    }

    const { error: jobsUpdateError } = await supabase
      .from("jobs")
      .update({
        team_id: newTeam.id,
      })
      .eq("user_id", userId);

    if (jobsUpdateError) {
      alert(jobsUpdateError.message);
      setCreatingTeam(false);
      return;
    }

    setTeam(newTeam);
    setProfile({
      ...profile,
      team_id: newTeam.id,
    });

    setCreatingTeam(false);
    alert("Team created.");
  };

  const handleSendInvite = async (e: FormEvent) => {
    e.preventDefault();

    if (!team) {
      alert("You need a team first.");
      return;
    }

    if (!inviteEmail.trim()) {
      alert("Please enter an email.");
      return;
    }

    setSendingInvite(true);

    const cleanEmail = inviteEmail.trim().toLowerCase();

    const { data: newInvite, error: inviteInsertError } = await supabase
      .from("team_invitations")
      .insert({
        team_id: team.id,
        email: cleanEmail,
        invited_by_user_id: userId,
        status: "pending",
      })
      .select("id, email, status, created_at")
      .single();

    if (inviteInsertError) {
      alert(inviteInsertError.message);
      setSendingInvite(false);
      return;
    }

    const emailResponse = await fetch("/api/team/send-invite", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: cleanEmail,
        teamName: team.name,
        inviteId: newInvite.id,
      }),
    });

    const emailData = await emailResponse.json();

    if (!emailResponse.ok) {
      alert(emailData.error || "Invite was created, but email failed to send.");
      await reloadInvitations(team.id);
      setInviteEmail("");
      setSendingInvite(false);
      return;
    }

    await reloadInvitations(team.id);
    setInviteEmail("");
    setSendingInvite(false);

    alert("Invite created and email sent.");
  };

  if (checkingAuth) {
    return (
      <main className="min-h-screen bg-gray-100 px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <p className="text-gray-600">Checking access...</p>
        </div>
      </main>
    );
  }

  if (!authorized) {
    return null;
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <p className="text-gray-600">Loading team page...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 px-6 py-12">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.push("/dashboard")}
          className="mb-6 text-sm text-blue-600 hover:underline"
        >
          ← Back to Dashboard
        </button>

        <div className="bg-white rounded-xl shadow p-8">
          <h1 className="text-3xl font-bold">Team Settings</h1>
          <p className="text-gray-600 mt-2">
            Create a team and invite members so you can share jobs and candidates.
          </p>

          {!team ? (
            <form onSubmit={handleCreateTeam} className="mt-8 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Team Name
                </label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  placeholder="Example: KMC Recruiting Team"
                />
              </div>

              <button
                type="submit"
                disabled={creatingTeam}
                className="bg-black text-white px-5 py-3 rounded-lg disabled:opacity-50"
              >
                {creatingTeam ? "Creating Team..." : "Create Team"}
              </button>
            </form>
          ) : (
            <>
              <div className="mt-8 bg-gray-50 rounded-xl p-6 border border-gray-200">
                <h2 className="text-2xl font-bold">{team.name}</h2>
                <p className="text-sm text-gray-500 mt-2">
                  Team ID: {team.id}
                </p>
                <p className="text-sm text-gray-500">
                  Created: {new Date(team.created_at).toLocaleDateString()}
                </p>
              </div>

              <form onSubmit={handleSendInvite} className="mt-8 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Invite Team Member by Email
                  </label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    placeholder="name@example.com"
                  />
                </div>

                <button
                  type="submit"
                  disabled={sendingInvite}
                  className="bg-blue-600 text-white px-5 py-3 rounded-lg disabled:opacity-50"
                >
                  {sendingInvite ? "Sending Invite..." : "Send Invite Email"}
                </button>
              </form>

              <div className="mt-10">
                <h3 className="text-xl font-bold mb-4">Invitations</h3>

                {invitations.length === 0 ? (
                  <p className="text-gray-500">No invitations yet.</p>
                ) : (
                  <div className="space-y-3">
                    {invitations.map((invite) => (
                      <div
                        key={invite.id}
                        className="border border-gray-200 rounded-lg p-4"
                      >
                        <p className="font-medium">{invite.email}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          Status: {invite.status}
                        </p>
                        <p className="text-sm text-gray-400 mt-1">
                          Created: {new Date(invite.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}