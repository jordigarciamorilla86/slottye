export type HealthCheck = {
  name: "configuration" | "database";
  ok: boolean;
};

export function evaluateHealthChecks(checks: HealthCheck[]) {
  const healthy = checks.every((check) => check.ok);
  return {
    status: healthy ? ("ok" as const) : ("degraded" as const),
    checks: Object.fromEntries(
      checks.map((check) => [check.name, check.ok ? "ok" : "unavailable"])
    ),
  };
}

export function hasMinimumConfiguration(
  env: Record<string, string | undefined> = process.env
) {
  return Boolean(
    env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}
