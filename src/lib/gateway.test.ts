// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GatewayError, requestAssistantMessage } from "@/lib/gateway";

const fetchMock = vi.fn<typeof fetch>();

describe("requestAssistantMessage", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("LLM_GATEWAY_BASE_URL", "http://127.0.0.1:4000/v1/");
    vi.stubEnv("LLM_GATEWAY_API_KEY", "gateway-secret");
    vi.stubEnv("LLM_MODEL", "studium-m1");
    vi.stubEnv("LLM_TIMEOUT_MS", "1000");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("calls the configured alias without exposing model selection to the browser", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: "这是来自模型的回答。" } }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const content = await requestAssistantMessage(
      [{ role: "user", content: "解释一下。" }],
      "request-1",
    );

    expect(content).toBe("这是来自模型的回答。");
    expect(fetchMock).toHaveBeenCalledOnce();

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://127.0.0.1:4000/v1/chat/completions");
    expect(init?.headers).toMatchObject({
      Authorization: "Bearer gateway-secret",
      "X-Request-ID": "request-1",
    });

    const requestBody = JSON.parse(String(init?.body));
    expect(requestBody.model).toBe("studium-m1");
    expect(requestBody.stream).toBe(false);
    expect(requestBody.messages).toEqual([
      expect.objectContaining({ role: "system" }),
      { role: "user", content: "解释一下。" },
    ]);
  });

  it.each([
    [401, "GATEWAY_AUTH_FAILED", false],
    [429, "MODEL_RATE_LIMITED", true],
    [503, "MODEL_UNAVAILABLE", true],
  ] as const)(
    "maps gateway status %s to %s",
    async (status, expectedCode, retryable) => {
      fetchMock.mockResolvedValueOnce(
        new Response("upstream detail must not escape", { status }),
      );

      await expect(
        requestAssistantMessage(
          [{ role: "user", content: "问题" }],
          "request-2",
        ),
      ).rejects.toMatchObject({
        code: expectedCode,
        retryable,
      });
    },
  );

  it("rejects an invalid successful gateway response", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ choices: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(
      requestAssistantMessage(
        [{ role: "user", content: "问题" }],
        "request-3",
      ),
    ).rejects.toMatchObject({ code: "MODEL_RESPONSE_INVALID" });
  });

  it("reports missing configuration without calling the gateway", async () => {
    vi.stubEnv("LLM_GATEWAY_API_KEY", "");

    await expect(
      requestAssistantMessage(
        [{ role: "user", content: "问题" }],
        "request-4",
      ),
    ).rejects.toEqual(
      expect.objectContaining<Partial<GatewayError>>({
        code: "GATEWAY_NOT_CONFIGURED",
      }),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
