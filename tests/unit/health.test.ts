import { describe, expect, it } from "vitest";
import { evaluateHealthChecks, hasMinimumConfiguration } from "@/lib/health/status";

describe("health status", () => {
  it("is healthy only when every check succeeds", () => {
    expect(evaluateHealthChecks([
      { name: "configuration", ok: true },
      { name: "database", ok: true },
    ])).toEqual({
      status: "ok",
      checks: { configuration: "ok", database: "ok" },
    });
  });

  it("uses generic unavailable results without exposing error details", () => {
    expect(evaluateHealthChecks([
      { name: "configuration", ok: true },
      { name: "database", ok: false },
    ])).toEqual({
      status: "degraded",
      checks: { configuration: "ok", database: "unavailable" },
    });
  });

  it("requires both public Supabase settings", () => {
    expect(hasMinimumConfiguration({})).toBe(false);
    expect(hasMinimumConfiguration({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "public-key",
    })).toBe(true);
  });
});
