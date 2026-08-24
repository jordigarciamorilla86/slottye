import {
  describe,
  expect,
  it,
} from "vitest";

import {
  isUuid,
  readJsonBody,
} from "../../lib/api/request";

describe("isUuid", () => {
  it.each([
    "550e8400-e29b-41d4-a716-446655440000",
    "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    "F47AC10B-58CC-4372-A567-0E02B2C3D479",
  ])("accepts a supported RFC 4122 UUID: %s", (value) => {
    expect(isUuid(value)).toBe(true);
  });

  it.each([
    "",
    "550e8400e29b41d4a716446655440000",
    "550e8400-e29b-61d4-a716-446655440000",
    "550e8400-e29b-41d4-c716-446655440000",
    "550e8400-e29b-41d4-a716-44665544000g",
    " 550e8400-e29b-41d4-a716-446655440000",
    "550e8400-e29b-41d4-a716-446655440000 ",
  ])("rejects a malformed or unsupported UUID: %s", (value) => {
    expect(isUuid(value)).toBe(false);
  });
});

describe("readJsonBody", () => {
  it("returns a parsed object", async () => {
    const request = new Request("https://slottye.test/api/example", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        bookingId: "550e8400-e29b-41d4-a716-446655440000",
      }),
    });

    const result = await readJsonBody<{ bookingId: string }>(request);

    expect(result).toEqual({
      ok: true,
      data: {
        bookingId: "550e8400-e29b-41d4-a716-446655440000",
      },
    });
  });

  it.each([
    ["an array", ["first", "second"]],
    ["JSON null", null],
    ["a primitive", 42],
  ])("preserves %s for endpoint-level validation", async (_label, body) => {
    const request = new Request("https://slottye.test/api/example", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const result = await readJsonBody<unknown>(request);

    expect(result).toEqual({
      ok: true,
      data: body,
    });
  });

  it.each([
    ["an empty body", undefined],
    ["malformed JSON", '{"bookingId":'],
  ])("returns a Spanish 400 response for %s", async (_label, body) => {
    const request = new Request("https://slottye.test/api/example", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body,
    });

    const result = await readJsonBody<unknown>(request);

    expect(result.ok).toBe(false);

    if (result.ok) {
      throw new Error("Expected invalid JSON to return an error response");
    }

    expect(result.response.status).toBe(400);
    expect(result.response.headers.get("content-type")).toContain(
      "application/json"
    );
    const responseBody = (await result.response.json()) as {
      error?: unknown;
    };

    expect(responseBody).toHaveProperty("error");
    expect(typeof responseBody.error).toBe("string");
    expect(responseBody.error).not.toBe("");
  });
});
