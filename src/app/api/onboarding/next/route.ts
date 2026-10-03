import { NextResponse } from "next/server";
import { getAccessState, getHomePath } from "@/lib/access";

export async function GET() {
  const state = await getAccessState();
  return NextResponse.json({ path: getHomePath(state) });
}
