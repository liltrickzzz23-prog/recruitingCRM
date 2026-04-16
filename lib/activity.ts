import { supabase } from "@/lib/supabase";

type LogActivityParams = {
  teamId?: string | null;
  userId?: string | null;
  jobId?: string | null;
  candidateId?: string | null;
  actionType: string;
  description: string;
};

export async function logActivity({
  teamId = null,
  userId = null,
  jobId = null,
  candidateId = null,
  actionType,
  description,
}: LogActivityParams) {
  const { error } = await supabase.from("activity_logs").insert({
    team_id: teamId,
    user_id: userId,
    job_id: jobId,
    candidate_id: candidateId,
    action_type: actionType,
    description,
  });

  if (error) {
    console.error("Failed to log activity:", error.message);
  }
}