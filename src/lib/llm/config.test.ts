// @vitest-environment node

import { describe, expect, it } from "vitest";

import { readLlmRuntimeConfig } from "@/lib/llm/config";

function validEnvironment(
  overrides: Partial<NodeJS.ProcessEnv> = {},
): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "test",
    STUDIUM_LLM_GATEWAY_BASE_URL: "http://127.0.0.1:4000/openai/v1/",
    STUDIUM_LLM_GATEWAY_API_KEY: "sk-bf-local-gateway-key-with-enough-entropy",
    STUDIUM_LLM_MODEL: "studium-openai/studium-m1",
    STUDIUM_LLM_TIMEOUT_MS: "45000",
    STUDIUM_LLM_AUDIT_DIR: "var/test-audit",
    ...overrides,
  };
}

describe("readLlmRuntimeConfig", () => {
  it("reads a complete runtime configuration and normalizes trailing slashes", () => {
    expect(readLlmRuntimeConfig(validEnvironment())).toEqual({
      baseUrl: "http://127.0.0.1:4000/openai/v1",
      apiKey: "sk-bf-local-gateway-key-with-enough-entropy",
      model: "studium-openai/studium-m1",
      timeoutMs: 45_000,
      auditDirectory: "var/test-audit",
    });
  });

  it("applies bounded defaults without reading the real process environment", () => {
    const environment = validEnvironment({
      STUDIUM_LLM_TIMEOUT_MS: undefined,
      STUDIUM_LLM_AUDIT_DIR: undefined,
    });

    expect(readLlmRuntimeConfig(environment)).toMatchObject({
      timeoutMs: 60_000,
      auditDirectory: "var/audit/llm-calls",
    });
  });

  it.each([
    ["missing gateway token", { STUDIUM_LLM_GATEWAY_API_KEY: undefined }],
    ["placeholder gateway token", { STUDIUM_LLM_GATEWAY_API_KEY: "replace-with-random-local-token" }],
    ["token without Bifrost prefix", { STUDIUM_LLM_GATEWAY_API_KEY: "local-gateway-key-with-enough-entropy" }],
    ["placeholder model", { STUDIUM_LLM_MODEL: "provider/model-name" }],
    ["zero timeout", { STUDIUM_LLM_TIMEOUT_MS: "0" }],
    ["excessive timeout", { STUDIUM_LLM_TIMEOUT_MS: "300001" }],
  ])("rejects %s", (_label, overrides) => {
    expect(() =>
      readLlmRuntimeConfig(validEnvironment(overrides)),
    ).toThrowError(
      expect.objectContaining({
        code: "GATEWAY_NOT_CONFIGURED",
        stage: "configuration",
      }),
    );
  });

  it.each([
    "ftp://127.0.0.1:4000/openai/v1",
    "https://127.0.0.1:4000/openai/v1",
    "http://localhost:4000/openai/v1",
    "http://127.0.0.1:8080/openai/v1",
    "http://127.0.0.1:4000/v1",
    "http://user:password@127.0.0.1:4000/openai/v1",
    "http://127.0.0.1:4000/openai/v1?target=remote",
    "http://127.0.0.1:4000/openai/v1#fragment",
    "http://127.0.0.1.evil.example:4000/openai/v1",
  ])("rejects an unsafe or ambiguous gateway URL: %s", (baseUrl) => {
    expect(() =>
      readLlmRuntimeConfig(
        validEnvironment({ STUDIUM_LLM_GATEWAY_BASE_URL: baseUrl }),
      ),
    ).toThrowError(expect.objectContaining({ code: "GATEWAY_NOT_CONFIGURED" }));
  });
});
