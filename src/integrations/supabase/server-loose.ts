// Loose re-exports of the server-side Supabase helpers.
// See client-loose.ts for the rationale — same shim, applied to the
// server middleware + admin client so createServerFn handlers typecheck
// before the schoolmsystem migrations are applied.
import { requireSupabaseAuth as strictRequireSupabaseAuth } from "./auth-middleware.ts";
import { supabaseAdmin as strictSupabaseAdmin } from "./client.server.ts";
import type { SupabaseClient } from "@supabase/supabase-js";

type LooseClient = SupabaseClient<any, any, any>;

// Middleware is passed straight through to TanStack Start; its context type is
// erased at the call site via `context: any` in the handlers.
export const requireSupabaseAuth = strictRequireSupabaseAuth as unknown as typeof strictRequireSupabaseAuth & {
  __looseContext: { supabase: LooseClient; userId: string; claims: any };
};

export const supabaseAdmin = strictSupabaseAdmin as unknown as LooseClient;
