import { createBrowserClient } from "@supabase/ssr";
import { supabaseKey, supabaseUrl } from "@/lib/env";

export const createClient = () => createBrowserClient(supabaseUrl, supabaseKey);
