// Generated from the live Supabase schema with `pnpm db:types`.
// The repository keeps a compile-safe contract until a developer supplies
// SUPABASE_ACCESS_TOKEN for the Supabase CLI type generator.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.18" };
  public: {
    Tables: Record<string, {
      Row: Record<string, unknown>;
      Insert: Record<string, unknown>;
      Update: Record<string, unknown>;
      Relationships: Array<Record<string, unknown>>;
    }>;
    Views: Record<string, never>;
    Functions: Record<string, { Args: Record<string, unknown>; Returns: unknown }>;
    Enums: Record<string, string>;
    CompositeTypes: Record<string, never>;
  };
};
