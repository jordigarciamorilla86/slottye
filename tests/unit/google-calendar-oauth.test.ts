import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getGoogleCalendarRedirectUri,
} from "../../lib/google-calendar-oauth";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getGoogleCalendarRedirectUri", () => {
  it("uses the canonical application URL in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv(
      "NEXT_PUBLIC_APP_URL",
      "https://slottye.example/base/?ignored=true"
    );

    expect(
      getGoogleCalendarRedirectUri(
        "https://untrusted-preview.example"
      )
    ).toBe(
      "https://slottye.example/api/google-calendar/callback"
    );
  });

  it("rejects a non-HTTPS production URL", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv(
      "NEXT_PUBLIC_APP_URL",
      "http://slottye.example"
    );

    expect(() =>
      getGoogleCalendarRedirectUri(
        "https://slottye.example"
      )
    ).toThrow(/HTTPS/);
  });

  it("can use the request origin during local development", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");

    expect(
      getGoogleCalendarRedirectUri(
        "http://localhost:3000"
      )
    ).toBe(
      "http://localhost:3000/api/google-calendar/callback"
    );
  });
});
