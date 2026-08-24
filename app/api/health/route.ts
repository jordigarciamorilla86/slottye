import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  evaluateHealthChecks,
  hasMinimumConfiguration,
  type HealthCheck,
} from "@/lib/health/status";

export const dynamic = "force-dynamic";
const HEALTH_TIMEOUT_MS = 3_000;

async function checkDatabase() {
  if (!hasMinimumConfiguration()) return false;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  try {
    const query = supabase.from("categories").select("id").limit(1);
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("health check timeout")), HEALTH_TIMEOUT_MS)
    );
    const { error } = await Promise.race([query, timeout]);
    return !error;
  } catch {
    return false;
  }
}

export async function GET() {
  const checks: HealthCheck[] = [
    { name: "configuration", ok: hasMinimumConfiguration() },
    { name: "database", ok: await checkDatabase() },
  ];
  const health = evaluateHealthChecks(checks);
  return NextResponse.json(
    { ...health, timestamp: new Date().toISOString() },
    {
      status: health.status === "ok" ? 200 : 503,
      headers: { "Cache-Control": "no-store, max-age=0" },
    }
  );
}
