// Loose-typed re-export of the Supabase browser client.
//
// The schoolmsystem schema has not been migrated yet, so the generated
// Database type in ./types.ts is empty and every strictly-typed .from("...")
// call resolves to `never`. This wrapper preserves the runtime client while
// exposing an `any`-shaped surface so the imported app can typecheck.
//
// Once the real schema is migrated, delete this file and the matching
// tsconfig path override so strict types come back automatically.
import { supabase as strictSupabase } from "./client.ts";
import type { SupabaseClient } from "@supabase/supabase-js";

export const supabase = strictSupabase as unknown as SupabaseClient<any, any, any>;
