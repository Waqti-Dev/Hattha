import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getAccessState, getHomePath } from "@/lib/access";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const cookieHeader = (await cookies()).getAll().map(({ name, value }) => `${name}=${value}`).join("; ");
      await fetch(new URL("/api/onboarding/bootstrap", requestUrl), { method: "POST", headers: { cookie: cookieHeader }, cache: "no-store" }).catch(() => undefined);
    }
  }
  const state = await getAccessState();
  return NextResponse.redirect(new URL(getHomePath(state), request.url));
}
