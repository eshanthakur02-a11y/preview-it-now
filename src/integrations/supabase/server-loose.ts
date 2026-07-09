// Loose re-exports of the server-side Supabase helpers.
// See client-loose.ts for the rationale.
import { requireSupabaseAuth as strictRequireSupabaseAuth } from "./auth-middleware.ts";
import { supabaseAdmin as strictSupabaseAdmin } from "./client.server.ts";
import type { SupabaseClient } from "@supabase/supabase-js";

// Cast to `any` so createServerFn handler `context` is typed as any (which
// makes `context.supabase.from(...).rpc(...)` accept arbitrary table/rpc names).
export const requireSupabaseAuth: any = strictRequireSupabaseAuth;

export const supabaseAdmin = strictSupabaseAdmin as unknown as SupabaseClient<any, any, any>;

