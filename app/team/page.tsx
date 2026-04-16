"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  team_id: string | null;
  role: string | null;
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

type TeamMember = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
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
  const [members, setMembers] = useState<TeamMember[]>([]);

  const [teamName, setTeamName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");

  const [creatingTeam, setCreatingTeam] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [savingRoleId, setSavingRoleId] = useState("");

  const isOwner = profile?.role === "owner";

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
        .select("id, email, full_name, team_id, role")
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
        await loadTeamData(profileData.team_id, profileData);
      }

      setLoading(false);
    };

    loadTeamPage();
  }, [router]);

  const loadTeamData = async (teamId: string, currentProfile?: Profile) => {
    const { data: teamData, error: teamError } = await supabase
      .from("teams")
      .select("id, name, owner_user_id, created_at")
      .eq("id", teamId)
      .maybeSingle();

    if (teamError) {
      alert(teamError.message);
      return;
    }

    if (teamData) {
      setTeam(teamData);
      setTeamName(teamData.name);
    }

    const { data: invitesData, error: invitesError } = await supabase
      .from("team_invitations")
      .select("id, email, status, created_at")
      .eq("team_id", teamId)
      .order("created_at", { ascending: false });

    if (invitesError) {
      alert(invitesError.message);
      return;
    }

    setInvitations(invitesData || []);

    const { data: membersData, error: membersError } = await supabase
      .from("profiles")
      .select("id, email, full_name, role")
      .eq("team_id", teamId)
      .order("email", { ascending: true });

    if (membersError) {
      alert(membersError.message);
      return;
    }

    setMembers(membersData || []);

    if (currentProfile) {
      setProfile(currentProfile);
    }
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
        role: "owner",
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

    const updatedProfile = {
      ...profile,
      team_id: newTeam.id,
      role: "owner",
    };

    setTeam(newTeam);
    setProfile(updatedProfile);

    await loadTeamData(newTeam.id, updatedProfile);

    setCreatingTeam(false);
    alert("Team created.");
  };

  const handleSendInvite = async (e: FormEvent) => {
    e.preventDefault();

    if (!team) {
      alert("You need a team first.");
      return;
    }

    if (!isOwner) {
      alert("Only the team owner can send invites.");
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
      await loadTeamData(team.id);
      setInviteEmail("");
      setSendingInvite(false);
      return;
    }

    await loadTeamData(team.id);
    setInviteEmail("");
    setSendingInvite(false);

    alert("Invite created and email sent.");
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    if (!team || !isOwner) {
      alert("Only the team owner can change roles.");
      return;
    }

    if (memberId === userId) {
      alert("You cannot change your own owner role here.");
      return;
    }

    setSavingRoleId(memberId);

    const { error } = await supabase
      .from("profiles")
      .update({
        role: newRole,
      })
      .eq("id", memberId);

    if (error) {
      alert(error.message);
      setSavingRoleId("");
      return;
    }

    await loadTeamData(team.id);
    setSavingRoleId("");
    alert("Role updated.");
  };

  if (checkingAuth) {
    return (
      <main className="min-h-screen bg-gray-100 px-6 py-12">
        <div className="max-w-5xl mx-auto">
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
        <div className="max-w-5xl mx-auto">
          <p className="text-gray-600">Loading team page...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 px-6 py-12">
      <div className="max-w-5xl mx-auto">
        <button
          onClick={() => router.push("/dashboard")}
          className="mb-6 text-sm text-blue-600 hover:underline"
        >
          ← Back to Dashboard
        </button>

        <div className="bg-white rounded-xl shadow p-8">
          <h1 className="text-3xl font-bold">Team Settings</h1>
          <p className="text-gray-600 mt-2">
            Create a team, invite members, and manage roles.
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
                  Your Role: {profile?.role || "recruiter"}
                </p>
                <p className="text-sm text-gray-500">
                  Created: {new Date(team.created_at).toLocaleDateString()}
                </p>
              </div>

              <div className="mt-10">
                <h3 className="text-xl font-bold mb-4">Team Members</h3>

                {members.length === 0 ? (
                  <p className="text-gray-500">No team members yet.</p>
                ) : (
                  <div className="space-y-3">
                    {members.map((member) => (
                      <div
                        key={member.id}
                        className="border border-gray-200 rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                      >
                        <div>
                          <p className="font-medium">
                            {member.full_name || "No name"}
                          </p>
                          <p className="text-sm text-gray-500">
                            {member.email || "No email"}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          {isOwner ? (
                            <select
                              value={member.role || "recruiter"}
                              onChange={(e) =>
                                handleRoleChange(member.id, e.target.value)
                              }
                              disabled={
                                savingRoleId === member.id || member.id === userId
                              }
                              className="rounded-lg border border-gray-300 px-3 py-2"
                            >
                              <option value="owner">owner</option>
                              <option value="recruiter">recruiter</option>
                            </select>
                          ) : (
                            <span className="px-3 py-2 rounded-lg bg-gray-100 text-sm">
                              {member.role || "recruiter"}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <form onSubmit={handleSendInvite} className="mt-10 space-y-4">
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
                    disabled={!isOwner}
                  />
                </div>

                <button
                  type="submit"
                  disabled={sendingInvite || !isOwner}
                  className="bg-blue-600 text-white px-5 py-3 rounded-lg disabled:opacity-50"
                >
                  {sendingInvite ? "Sending Invite..." : "Send Invite Email"}
                </button>

                {!isOwner ? (
                  <p className="text-sm text-gray-500">
                    Only the team owner can invite members.
                  </p>
                ) : null}
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
                          Created:{" "}
                          {new Date(invite.created_at).toLocaleDateString()}
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