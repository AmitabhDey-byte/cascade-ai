import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "cascade_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12;

type SessionPayload = {
  email: string;
  expiresAt: number;
};

type AuthConfiguration =
  | { mode: "configured"; email: string; password: string; secret: string }
  | { mode: "local-bypass"; secret: string }
  | { mode: "unavailable"; reason: string };

export function getAuthConfiguration(): AuthConfiguration {
  const email = process.env.CASCADE_AUTH_EMAIL;
  const password = process.env.CASCADE_AUTH_PASSWORD;
  const secret = process.env.CASCADE_AUTH_SECRET;
  const isProduction = process.env.NODE_ENV === "production";

  if (email && password && secret) return { mode: "configured", email, password, secret };

  if (!isProduction && process.env.LOCAL_AUTH_BYPASS !== "false") {
    return { mode: "local-bypass", secret: "cascadeai-local-development-session-secret" };
  }

  return {
    mode: "unavailable",
    reason: "Set CASCADE_AUTH_EMAIL, CASCADE_AUTH_PASSWORD, and CASCADE_AUTH_SECRET for this deployment.",
  };
}

export function authenticate(email: string, password: string): { ok: true; token: string } | { ok: false; reason: string } {
  const configuration = getAuthConfiguration();
  if (!email.trim() || !password) return { ok: false, reason: "Enter both an email address and password." };
  if (configuration.mode === "unavailable") return { ok: false, reason: configuration.reason };

  if (configuration.mode === "configured" && (!safeEqual(email, configuration.email) || !safeEqual(password, configuration.password))) {
    return { ok: false, reason: "Invalid email address or password." };
  }

  return { ok: true, token: createSessionToken(email, configuration.secret) };
}

export function verifySession(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  const configuration = getAuthConfiguration();
  if (configuration.mode === "unavailable") return null;

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;
  const expectedSignature = sign(encodedPayload, configuration.secret);
  if (!safeEqual(signature, expectedSignature)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as SessionPayload;
    return payload.email && Number.isFinite(payload.expiresAt) && payload.expiresAt > Date.now() ? payload : null;
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}

function createSessionToken(email: string, secret: string): string {
  const encodedPayload = Buffer.from(JSON.stringify({ email, expiresAt: Date.now() + SESSION_TTL_SECONDS * 1000 })).toString("base64url");
  return `${encodedPayload}.${sign(encodedPayload, secret)}`;
}

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function safeEqual(left: string, right: string): boolean {
  const leftHash = createHash("sha256").update(left).digest();
  const rightHash = createHash("sha256").update(right).digest();
  return timingSafeEqual(leftHash, rightHash);
}
