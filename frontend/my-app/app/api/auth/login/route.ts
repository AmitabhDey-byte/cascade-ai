import { NextResponse } from "next/server";
import { authenticate, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";

export async function POST(request: Request) {
  let credentials: { email?: unknown; password?: unknown };
  try {
    credentials = await request.json();
  } catch {
    return NextResponse.json({ detail: "Send a valid JSON login payload." }, { status: 400 });
  }

  const result = authenticate(
    typeof credentials.email === "string" ? credentials.email : "",
    typeof credentials.password === "string" ? credentials.password : "",
  );
  if (!result.ok) return NextResponse.json({ detail: result.reason }, { status: 401 });

  const response = NextResponse.json({ status: "ok" });
  response.cookies.set(SESSION_COOKIE, result.token, sessionCookieOptions());
  return response;
}
