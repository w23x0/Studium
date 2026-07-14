// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { LlmCallTrace } from "@/lib/llm/contract";
import { LlmError } from "@/lib/llm/errors";
import { requestAssistantMessage } from "@/lib/llm/service";

import { POST } from "./route";

vi.mock("@/lib/llm/service", () => ({
  requestAssistantMessage: vi.fn(),
}));

const requestAssistantMessageMock = vi.mocked(requestAssistantMessage);

function chatRequest(body: unknown) {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function successfulTrace(): LlmCallTrace {
  return {
    schemaVersion: 1,
    requestId: "internal-request-id",
    callId: "call-1",
    status: "succeeded",
    startedAt: "2026-07-14T10:00:00.000Z",
    completedAt: "2026-07-14T10:00:01.000Z",
    latencyMs: 1_000,
    messageCount: 1,
    messageCharacters: 4,
    requestedModel: "studium-openai/studium-m1",
    attempts: [
      {
        attemptId: "attempt-1",
        sequence: 1,
        status: "succeeded",
        startedAt: "2026-07-14T10:00:00.000Z",
        completedAt: "2026-07-14T10:00:01.000Z",
        latencyMs: 1_000,
        requestedModel: "studium-openai/studium-m1",
      },
    ],
  };
}

describe("POST /api/chat", () => {
  beforeEach(() => {
    requestAssistantMessageMock.mockReset();
  });

  it("rejects invalid browser input before calling the LLM service", async () => {
    const response = await POST(
      chatRequest({
        messages: [{ role: "system", content: "not allowed" }],
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "INVALID_REQUEST", retryable: false },
    });
    expect(requestAssistantMessageMock).not.toHaveBeenCalled();
  });

  it("rejects an oversized request before calling the LLM service", async () => {
    const request = chatRequest({
      messages: [{ role: "user", content: "问题" }],
    });
    request.headers.set("Content-Length", String(256 * 1024 + 1));

    const response = await POST(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "INVALID_REQUEST", retryable: false },
    });
    expect(requestAssistantMessageMock).not.toHaveBeenCalled();
  });

  it("keeps trace data server-side and forwards the request cancellation signal", async () => {
    requestAssistantMessageMock.mockResolvedValueOnce({
      content: "模型回答",
      trace: successfulTrace(),
    });
    const request = chatRequest({
      messages: [{ role: "user", content: "用户问题" }],
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      message: { role: "assistant", content: "模型回答" },
      requestId: expect.any(String),
    });
    expect(body).not.toHaveProperty("trace");
    expect(body).not.toHaveProperty("callId");
    expect(response.headers.get("X-Request-ID")).toBe(body.requestId);
    expect(requestAssistantMessageMock).toHaveBeenCalledWith(
      [{ role: "user", content: "用户问题" }],
      body.requestId,
      { signal: request.signal },
    );
  });

  it("preserves a safe public LLM error without exposing its cause", async () => {
    requestAssistantMessageMock.mockRejectedValueOnce(
      new LlmError("PROVIDER_AUTH_FAILED", 502, false, {
        stage: "provider_request",
        upstreamStatus: 401,
        safeReason: "provider_authentication_failed",
        cause: new Error("secret upstream response"),
      }),
    );

    const response = await POST(
      chatRequest({ messages: [{ role: "user", content: "用户问题" }] }),
    );
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body).toEqual({
      error: {
        code: "PROVIDER_AUTH_FAILED",
        message: "上游模型鉴权失败，请检查供应商配置。",
        retryable: false,
        requestId: expect.any(String),
      },
    });
    expect(JSON.stringify(body)).not.toContain("secret upstream response");
    expect(response.headers.get("X-Request-ID")).toBe(body.error.requestId);
  });

  it("turns an unexpected service failure into a stable internal error", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    requestAssistantMessageMock.mockRejectedValueOnce(
      new Error("must not reach the browser"),
    );

    const response = await POST(
      chatRequest({ messages: [{ role: "user", content: "用户问题" }] }),
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({
      error: {
        code: "INTERNAL_ERROR",
        message: "服务器处理请求时发生错误。",
        retryable: false,
        requestId: expect.any(String),
      },
    });
    expect(JSON.stringify(body)).not.toContain("must not reach the browser");
    expect(errorSpy).toHaveBeenCalledWith("Unexpected chat route error", {
      requestId: body.error.requestId,
      errorType: "Error",
    });
  });
});
