// lib/api/preferences.ts
import { api } from "./client";

export type PreferencesPayload = {
  activities: string[];
  budget: string;
  travelDistance: string | null;
  transportModes: string[];
};

export type GetPreferencesResponse = {
  ok: boolean;
  preference: PreferencesPayload;
};

export async function savePreferences(args: {
  clerkUserId: string;
  preferences: PreferencesPayload;
  token?: string; // optional if you verify auth in backend
}) {
  const headers = args.token ? { Authorization: `Bearer ${args.token}` } : undefined;

  return api.post<{ ok: true }>("/users/preferences", {
    clerkUserId: args.clerkUserId,
    preferences: args.preferences,
  }, headers);
}

export async function getPreferences(args: {
  clerkUserId: string;
  token?: string;
}) {
  const headers = args.token ? { Authorization: `Bearer ${args.token}` } : undefined;
  const response = await api.get<GetPreferencesResponse>(
    `/users/preferences`,
    { clerkUserId: args.clerkUserId },
    headers
  );
  return response.preference;
}