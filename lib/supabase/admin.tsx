import { createClient } from "@supabase/supabase-js";


export async function createClientAdmin() {

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PRIVATE_SUPABASE_SERVICE_ROLE_KEY!,
   
  );
}
