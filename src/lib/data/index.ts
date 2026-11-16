import { DemoDataSource } from "./demo/demo-source";
import { SupabaseDataSource } from "./supabase/supabase-source";
import { isSupabaseConfigured, type DataSource } from "./source";

let instance: DataSource | null = null;

/** Picks Supabase when NEXT_PUBLIC_SUPABASE_URL/ANON_KEY are set, otherwise demo mode. */
export function getDataSource(): DataSource {
  if (!instance) instance = isSupabaseConfigured() ? new SupabaseDataSource() : new DemoDataSource();
  return instance;
}

export type { DataSource, DataMode, Session } from "./source";
