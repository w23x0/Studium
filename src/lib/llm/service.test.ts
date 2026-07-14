// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

import type {
  GatewayCompletion,
  GatewayCompletionClient,
  LlmCallTrace,
  LlmRuntimeConfig,
} from "@/lib/llm/contract";
import { LlmError } from "@/lib/llm/errors";
import { requestAssistantMessage } from "@/lib/llm/service";

const config: LlmRuntimeConfig = {
  baseUrl: "http://127.0.0.1:4000/openai/v1",
  apiKey: "sk-bf-local-gateway-key-with-enough-entropy",
  model: "studium-openai/studium-m1",
  timeoutMs: 1_000,
  auditDirectory: "var/test-audit",
};

const completion: GatewayCompletion = {
  content: "TOP_SECRET_MODEL_RESPONSE",
  gatewayRequestId: "gateway-request-1",
  upstreamResponseId: "upstream-response-1",
  providerRequestId: "provider-request-1",
  provider: "provider-name",
  requestedModel: "studium-openai/studium-m1",
  resolvedModel: "resolved/model",
  finishReason: "stop",
  usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
  cost: { amount: 0.001, currency: "USD" },
};

interface TestDependencies {
  readConfig: () => LlmRuntimeConfig;
  complete: GatewayCompletionClient;
  writeAudit: (trace: LlmCallTrace, auditDirectory: string) => Promise<void>;
  randomUUID: () => string;
  now: () => Date;
  monotonicNow: () => number;
}

function deterministicDependencies(
  overrides: Partial<TestDependencies> = {},
) {
  const uuids = ["call-1", "attempt-1"];
  const dates = [
    new Date("2026-07-14T10:00:00.000Z"),
    new Date("2026-07-14T10:00:01.000Z"),
  ];
  const monotonicTimes = [100, 1_100];

  const dependencies = {
    readConfig: vi.fn(() => config),
    complete: vi.fn<GatewayCompletionClient>(async () => completion),
    writeAudit: vi.fn(
      async (trace: LlmCallTrace, auditDirectory: string) => {
        void trace;
        void auditDirectory;
      },
    ),
    randomUUID: vi.fn(() => uuids.shift() ?? "unexpected-id"),
    now: vi.fn(() => dates.shift() ?? dates[dates.length - 1]),
    monotonicNow: vi.fn(() => monotonicTimes.shift() ?? 1_100),
  };

  Object.assign(dependencies, overrides);
  return dependencies;
}

describe("requestAssistantMessage", () => {
  it("injects the server-owned prompt and returns a structured, audited trace", async () => {
    const controller = new AbortController();
    const dependencies = deterministicDependencies();

    const result = await requestAssistantMessage(
      [
        { role: "user", content: "TOP_SECRET_USER_MESSAGE" },
        { role: "assistant", content: "之前的回答" },
        { role: "user", content: "继续" },
      ],
      "request-1",
      { signal: controller.signal, dependencies },
    );

    expect(dependencies.complete).toHaveBeenCalledOnce();
    const [gatewayRequest, receivedConfig] = dependencies.complete.mock.calls[0];
    expect(receivedConfig).toBe(config);
    expect(gatewayRequest).toMatchObject({
      requestId: "request-1",
      callId: "call-1",
      attemptId: "attempt-1",
      signal: controller.signal,
      messages: [
        expect.objectContaining({ role: "system" }),
        { role: "user", content: "TOP_SECRET_USER_MESSAGE" },
        { role: "assistant", content: "之前的回答" },
        { role: "user", content: "继续" },
      ],
    });
    expect(result.content).toBe("TOP_SECRET_MODEL_RESPONSE");
    expect(result.trace).toEqual({
      schemaVersion: 1,
      requestId: "request-1",
      callId: "call-1",
      status: "succeeded",
      startedAt: "2026-07-14T10:00:00.000Z",
      completedAt: "2026-07-14T10:00:01.000Z",
      latencyMs: 1_000,
      messageCount: 3,
      messageCharacters:
        "TOP_SECRET_USER_MESSAGE".length + "之前的回答".length + "继续".length,
      requestedModel: "studium-openai/studium-m1",
      attempts: [
        expect.objectContaining({
          attemptId: "attempt-1",
          sequence: 1,
          status: "succeeded",
          gatewayRequestId: "gateway-request-1",
          upstreamResponseId: "upstream-response-1",
          providerRequestId: "provider-request-1",
          provider: "provider-name",
          requestedModel: "studium-openai/studium-m1",
          resolvedModel: "resolved/model",
          usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
          cost: { amount: 0.001, currency: "USD" },
        }),
      ],
    });
    expect(dependencies.writeAudit).toHaveBeenCalledWith(
      result.trace,
      "var/test-audit",
    );
    const serializedTrace = JSON.stringify(result.trace);
    expect(serializedTrace).not.toContain("TOP_SECRET_USER_MESSAGE");
    expect(serializedTrace).not.toContain("TOP_SECRET_MODEL_RESPONSE");
  });

  it("audits a sanitized failure once and rethrows the original LLM error", async () => {
    const failure = new LlmError("MODEL_RATE_LIMITED", 429, true, {
      stage: "provider_request",
      upstreamStatus: 429,
      safeReason: "rate_limited",
      attemptMetadata: {
        provider: "studium-openai",
        resolvedModel: "gpt-4o-mini",
        providerRequestId: "provider-request-429",
        gatewayLatencyMs: 27,
      },
      cause: new Error("RAW_SECRET_UPSTREAM_BODY"),
    });
    const dependencies = deterministicDependencies({
      complete: vi.fn(async () => {
        throw failure;
      }),
    });

    const promise = requestAssistantMessage(
      [{ role: "user", content: "SECRET_QUESTION" }],
      "request-1",
      { dependencies },
    );

    await expect(promise).rejects.toBe(failure);
    expect(dependencies.complete).toHaveBeenCalledOnce();
    expect(dependencies.writeAudit).toHaveBeenCalledOnce();
    const [trace] = dependencies.writeAudit.mock.calls[0];
    expect(trace).toMatchObject({
      status: "failed",
      attempts: [
        {
          attemptId: "attempt-1",
          sequence: 1,
          status: "failed",
          startedAt: "2026-07-14T10:00:00.000Z",
          completedAt: "2026-07-14T10:00:01.000Z",
          latencyMs: 1_000,
          provider: "studium-openai",
          resolvedModel: "gpt-4o-mini",
          providerRequestId: "provider-request-429",
          gatewayLatencyMs: 27,
          requestedModel: "studium-openai/studium-m1",
          error: {
            code: "MODEL_RATE_LIMITED",
            stage: "provider_request",
            retryable: true,
            upstreamStatus: 429,
            safeReason: "rate_limited",
          },
        },
      ],
    });
    expect(JSON.stringify(trace)).not.toContain("RAW_SECRET_UPSTREAM_BODY");
    expect(JSON.stringify(trace)).not.toContain("SECRET_QUESTION");
  });

  it("does not turn a successful model call into a failure when audit writing fails", async () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    const dependencies = deterministicDependencies({
      writeAudit: vi.fn(async () => {
        throw new Error("disk path with secret details");
      }),
    });

    const result = await requestAssistantMessage(
      [{ role: "user", content: "问题" }],
      "request-1",
      { dependencies },
    );

    expect(result.content).toBe("TOP_SECRET_MODEL_RESPONSE");
    expect(warning).toHaveBeenCalledWith("Failed to write LLM audit event", {
      requestId: "request-1",
      callId: "call-1",
      errorType: "Error",
    });
    expect(JSON.stringify(warning.mock.calls)).not.toContain(
      "disk path with secret details",
    );
  });

  it("preserves the model failure when failure auditing also fails", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const failure = new LlmError("MODEL_TIMEOUT", 504, true, {
      stage: "provider_request",
      safeReason: "client_timeout",
    });
    const dependencies = deterministicDependencies({
      complete: vi.fn(async () => {
        throw failure;
      }),
      writeAudit: vi.fn(async () => {
        throw new Error("audit failed");
      }),
    });

    await expect(
      requestAssistantMessage(
        [{ role: "user", content: "问题" }],
        "request-1",
        { dependencies },
      ),
    ).rejects.toBe(failure);
    expect(dependencies.complete).toHaveBeenCalledOnce();
    expect(dependencies.writeAudit).toHaveBeenCalledOnce();
  });
});
