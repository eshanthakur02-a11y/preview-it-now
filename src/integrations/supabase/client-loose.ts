// Temporary loose-typed re-export of the Supabase browser client.
//
// The generated Database type in ./types.ts is empty until the schoolmsystem
// schema migrations are applied. Until then, typing .from("...") strictly
// would fail every table access with `never`. This shim keeps the runtime
// client identical while allowing the app to typecheck.
//
// Remove this file (and the tsconfig path override) once real migrations
// regenerate types.ts with the full schema.
import { supabase as typedSupabase } from "./client.ts";
import type { SupabaseClient } from "@supabase/supabase-js";

export const supabase = typedSupabase as unknown as SupabaseClient<any, any, any>;
