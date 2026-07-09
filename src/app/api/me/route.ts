import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

/** Lightweight current-user endpoint for client components (e.g. email signature). */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  return NextResponse.json({ id: session.id, name: session.name, email: session.email, role: session.role });
}
