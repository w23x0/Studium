import { describe, expect, it } from "vitest";

import { normalizeUpstreamBaseUrl } from "./bifrost-upstream-url.mjs";

describe("normalizeUpstreamBaseUrl", () => {
  it("normalizes an HTTPS origin", () => {
    expect(normalizeUpstreamBaseUrl("https://api.example.com/")).toBe(
      "https://api.example.com",
    );
  });

  it.each([
    "http://api.example.com",
    "https://user:password@api.example.com",
    "https://api.example.com/v1",
    "https://api.example.com?tenant=one",
    "https://api.example.com#config",
    "not-a-url",
  ])("rejects an unsafe or path-bearing URL: %s", (value) => {
    expect(() => normalizeUpstreamBaseUrl(value)).toThrow();
  });
});
