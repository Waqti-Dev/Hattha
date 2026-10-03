import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      await fetch(new URL("/api/onboarding/bootstrap", requestUrl), {
        method: "POST",
        headers: { cookie: request.headers.get("cookie") ?? "" },
        cache: "no-store",
      }).catch(() => undefined);
    }
  }
  const next = requestUrl.searchParams.get("next");
  return NextResponse.redirect(new URL(next?.startsWith("/") ? next : "/", request.url));
}
