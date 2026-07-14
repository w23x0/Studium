// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

import { GatewayError, requestAssistantMessage } from "@/lib/gateway";

import { POST } from "./route";

vi.mock("@/lib/gateway", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/gateway")>();
  return {
    ...original,
    requestAssistantMessage: vi.fn(),
  };
});

const requestAssistantMessageMock = vi.mocked(requestAssistantMessage);

function chatRequest(body: unknown) {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/chat", () => {
  beforeEach(() => {
    requestAssistantMessageMock.mockReset();
  });

  it("rejects invalid browser input before calling the gateway", async () => {
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

  it("returns a validated assistant response and request id", async () => {
    requestAssistantMessageMock.mockResolvedValueOnce("模型回答");

    const response = await POST(
      chatRequest({ messages: [{ role: "user", content: "用户问题" }] }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      message: { role: "assistant", content: "模型回答" },
      requestId: expect.any(String),
    });
    expect(response.headers.get("X-Request-ID")).toBe(body.requestId);
    expect(requestAssistantMessageMock).toHaveBeenCalledWith(
      [{ role: "user", content: "用户问题" }],
      body.requestId,
    );
  });

  it("preserves the public gateway error without upstream details", async () => {
    requestAssistantMessageMock.mockRejectedValueOnce(
      new GatewayError("MODEL_RATE_LIMITED", 429, true),
    );

    const response = await POST(
      chatRequest({ messages: [{ role: "user", content: "用户问题" }] }),
    );

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "MODEL_RATE_LIMITED",
        retryable: true,
        requestId: expect.any(String),
      },
    });
  });
});
