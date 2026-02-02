// lib/api/preferences.ts
import { api } from "./client";

export type PreferencesPayload = {
  activities: string[];
  budget: string;
  travelDistance: string | null;
  transportModes: string[];
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
