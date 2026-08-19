import { createClient } from "@supabase/supabase-js";

// These are the project's public URL and anon (publishable) key — safe to expose
// client-side; access is restricted by Postgres Row Level Security policies.
const SUPABASE_URL = "https://odacnalskwfoegrtdosp.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kYWNuYWxza3dmb2VncnRkb3NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxMzM3ODMsImV4cCI6MjEwMjcwOTc4M30.geMjcwfgI3Gf6DSnnYxDlGG1bhWS-uwvYtWBBbXImSY";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
