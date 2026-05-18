import type { ApplicationRecord, ApplicationStatus, ResumeRecord } from "./types";
import { supabase } from "./supabase";

export type ApplicationRow = {
  id: string;
  user_id: string;
  company_name: string;
  role_title: string;
  status: ApplicationStatus;
  applied_on: string;
  location: string;
  created_at: string;
  updated_at: string;
};

export type ResumeRow = {
  id: string;
  user_id: string;
  file_name: string;
  target_role: string;
  score: number;
  created_at: string;
  updated_at: string;
};

function requireSupabase() {
  if (!supabase) {
    throw new Error("Supabase is not configured");
  }

  return supabase;
}

function formatSupabaseError(error: unknown) {
  if (error && typeof error === "object") {
    const maybeMessage = (error as { message?: string }).message;
    const maybeCode = (error as { code?: string }).code;
    const maybeDetails = (error as { details?: string }).details;
    const maybeHint = (error as { hint?: string }).hint;

    return [maybeMessage, maybeCode ? `code=${maybeCode}` : "", maybeDetails, maybeHint]
      .filter(Boolean)
      .join(" | ");
  }

  return error instanceof Error ? error.message : "Unknown Supabase error";
}

export function mapApplicationRow(row: ApplicationRow): ApplicationRecord {
  return {
    id: row.id,
    userId: row.user_id,
    companyName: row.company_name,
    roleTitle: row.role_title,
    status: row.status,
    appliedOn: row.applied_on,
    location: row.location,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapResumeRow(row: ResumeRow): ResumeRecord {
  return {
    id: row.id,
    userId: row.user_id,
    fileName: row.file_name,
    targetRole: row.target_role,
    score: row.score,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function loadApplications(userId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("applications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(formatSupabaseError(error));
  return (data ?? []).map(mapApplicationRow);
}

export async function loadResumes(userId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("resumes")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(formatSupabaseError(error));
  return (data ?? []).map(mapResumeRow);
}

export async function createApplication(userId: string, input: Omit<ApplicationRow, "id" | "user_id" | "created_at" | "updated_at">) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("applications")
    .insert({
      user_id: userId,
      company_name: input.company_name,
      role_title: input.role_title,
      status: input.status,
      applied_on: input.applied_on,
      location: input.location,
    })
    .select("*")
    .single();

  if (error) throw new Error(formatSupabaseError(error));
  return mapApplicationRow(data as ApplicationRow);
}

export async function updateApplication(
  userId: string,
  id: string,
  input: Omit<ApplicationRow, "id" | "user_id" | "created_at" | "updated_at">,
) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("applications")
    .update({
      company_name: input.company_name,
      role_title: input.role_title,
      status: input.status,
      applied_on: input.applied_on,
      location: input.location,
    })
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) throw new Error(formatSupabaseError(error));
  return mapApplicationRow(data as ApplicationRow);
}

export async function deleteApplication(userId: string, id: string) {
  const client = requireSupabase();
  const { error } = await client.from("applications").delete().eq("id", id).eq("user_id", userId);
  if (error) throw new Error(formatSupabaseError(error));
}

export async function createResume(
  userId: string,
  input: Omit<ResumeRow, "id" | "user_id" | "created_at" | "updated_at">,
) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("resumes")
    .insert({
      user_id: userId,
      file_name: input.file_name,
      target_role: input.target_role,
      score: input.score,
    })
    .select("*")
    .single();

  if (error) throw new Error(formatSupabaseError(error));
  return mapResumeRow(data as ResumeRow);
}

export async function deleteResume(userId: string, id: string) {
  const client = requireSupabase();
  const { error } = await client.from("resumes").delete().eq("id", id).eq("user_id", userId);
  if (error) throw new Error(formatSupabaseError(error));
}
