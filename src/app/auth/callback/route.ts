import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAccessState, getHomePath } from "@/lib/access";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { error: bootstrapError } = await supabase.rpc("bootstrap_onboarding" as never);
      if (bootstrapError) return NextResponse.redirect(new URL("/login?onboarding=retry", request.url));
    }
  }
  const state = await getAccessState();
  return NextResponse.redirect(new URL(getHomePath(state), request.url));
}
