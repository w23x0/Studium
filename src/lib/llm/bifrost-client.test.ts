// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  GatewayCompletionRequest,
  LlmRuntimeConfig,
} from "@/lib/llm/contract";
import { requestBifrostCompletion } from "@/lib/llm/bifrost-client";

const fetchMock = vi.fn<typeof fetch>();

const config: LlmRuntimeConfig = {
  baseUrl: "http://127.0.0.1:4000/openai/v1",
  apiKey: "sk-bf-local-gateway-key-with-enough-entropy",
  model: "studium-openai/studium-m1",
  timeoutMs: 1_000,
  auditDirectory: "var/test-audit",
};

function completionRequest(
  overrides: Partial<GatewayCompletionRequest> = {},
): GatewayCompletionRequest {
  return {
    requestId: "request-1",
    callId: "call-1",
    attemptId: "attempt-1",
    messages: [{ role: "user", content: "问题" }],
    ...overrides,
  };
}

describe("requestBifrostCompletion", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls the fixed Bifrost endpoint once with correlation IDs", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: "回答" } }],
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "X-Request-ID": "provider-request-1",
          },
        },
      ),
    );

    const result = await requestBifrostCompletion(completionRequest(), config);

    expect(result).toMatchObject({
      content: "回答",
      requestedModel: "studium-openai/studium-m1",
      providerRequestId: "provider-request-1",
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://127.0.0.1:4000/openai/v1/chat/completions");
    expect(init).toMatchObject({
      method: "POST",
      cache: "no-store",
      redirect: "error",
      headers: {
        Authorization: "Bearer sk-bf-local-gateway-key-with-enough-entropy",
        "Content-Type": "application/json",
        "X-Request-ID": "call-1",
        "X-Studium-Request-ID": "request-1",
        "X-Studium-Attempt-ID": "attempt-1",
      },
    });
    expect(JSON.parse(String(init?.body))).toEqual({
      model: "studium-openai/studium-m1",
      messages: [{ role: "user", content: "问题" }],
      stream: false,
      store: false,
    });
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it.each([
    [401, { error: "invalid gateway token" }, "GATEWAY_AUTH_FAILED", false],
    [401, { error: "upstream provider rejected credentials" }, "PROVIDER_AUTH_FAILED", false],
    [404, { error: "missing" }, "MODEL_NOT_FOUND", false],
    [400, { error: { code: "context_length_exceeded" } }, "MODEL_CONTEXT_EXCEEDED", false],
    [400, { error: { type: "content_policy_violation" } }, "MODEL_CONTENT_REJECTED", false],
    [429, { error: "rate limited" }, "MODEL_RATE_LIMITED", true],
    [503, { error: "secret upstream details" }, "MODEL_UNAVAILABLE", true],
  ] as const)(
    "maps HTTP %s to %s without retrying",
    async (status, body, expectedCode, retryable) => {
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(body), {
          status,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const promise = requestBifrostCompletion(completionRequest(), config);

      await expect(promise).rejects.toMatchObject({
        code: expectedCode,
        retryable,
        upstreamStatus: status,
      });
      await expect(promise).rejects.not.toHaveProperty(
        "message",
        expect.stringContaining("secret upstream details"),
      );
      expect(fetchMock).toHaveBeenCalledOnce();
    },
  );

  it("uses structured Bifrost metadata to distinguish provider authentication", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: { code: "invalid_api_key", message: "authentication failed" },
          extra_fields: {
            latency: 24,
            routing_info: {
              provider: "studium-openai",
              resolved_key_alias: { model_id: "gpt-4o-mini" },
            },
          },
        }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
            "X-Request-ID": "provider-request-401",
          },
        },
      ),
    );

    await expect(
      requestBifrostCompletion(completionRequest(), config),
    ).rejects.toMatchObject({
      code: "PROVIDER_AUTH_FAILED",
      attemptMetadata: {
        provider: "studium-openai",
        providerRequestId: "provider-request-401",
        resolvedModel: "gpt-4o-mini",
        gatewayLatencyMs: 24,
      },
    });
  });

  it("maps invalid successful JSON to a safe response error", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response("not-json", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(
      requestBifrostCompletion(completionRequest(), config),
    ).rejects.toMatchObject({
      code: "MODEL_RESPONSE_INVALID",
      stage: "response_parse",
      safeReason: "invalid_json",
    });
  });

  it("preserves the response-too-large classification", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response("{}", {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": String(2 * 1024 * 1024 + 1),
        },
      }),
    );

    await expect(
      requestBifrostCompletion(completionRequest(), config),
    ).rejects.toMatchObject({
      code: "MODEL_RESPONSE_INVALID",
      stage: "response_parse",
      safeReason: "response_too_large",
    });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("rejects an unexpected gateway fallback instead of hiding it", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: "fallback answer" } }],
          extra_fields: {
            routing_info: { provider: "openai", is_fallback: true },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    await expect(
      requestBifrostCompletion(completionRequest(), config),
    ).rejects.toMatchObject({
      code: "MODEL_RESPONSE_INVALID",
      safeReason: "unexpected_gateway_fallback",
    });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("propagates caller cancellation to fetch without classifying it as a timeout", async () => {
    const controller = new AbortController();
    fetchMock.mockImplementationOnce((_input, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(init.signal?.reason), {
          once: true,
        });
      }),
    );

    const pending = requestBifrostCompletion(
      completionRequest({ signal: controller.signal }),
      config,
    );
    controller.abort(new DOMException("cancelled", "AbortError"));

    await expect(pending).rejects.toMatchObject({
      code: "GATEWAY_UNAVAILABLE",
      safeReason: "caller_cancelled",
    });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("distinguishes the configured model timeout from a connection failure", async () => {
    fetchMock.mockImplementationOnce((_input, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(init.signal?.reason), {
          once: true,
        });
      }),
    );

    await expect(
      requestBifrostCompletion(completionRequest(), {
        ...config,
        timeoutMs: 1,
      }),
    ).rejects.toMatchObject({
      code: "MODEL_TIMEOUT",
      safeReason: "client_timeout",
    });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("still classifies a timeout that occurs while reading the response body", async () => {
    fetchMock.mockImplementationOnce((_input, init) => {
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          init?.signal?.addEventListener(
            "abort",
            () => controller.error(init.signal?.reason),
            { once: true },
          );
        },
      });
      return Promise.resolve(
        new Response(body, {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    });

    await expect(
      requestBifrostCompletion(completionRequest(), {
        ...config,
        timeoutMs: 1,
      }),
    ).rejects.toMatchObject({
      code: "MODEL_TIMEOUT",
      safeReason: "client_timeout",
    });
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
