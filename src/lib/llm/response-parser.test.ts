// @vitest-environment node

import { describe, expect, it } from "vitest";

import { parseGatewayCompletion } from "@/lib/llm/response-parser";

describe("parseGatewayCompletion", () => {
  it("parses Bifrost routing, latency, and structured cost metadata", () => {
    const result = parseGatewayCompletion(
      {
        id: "completion-1",
        model: "studium-m1",
        choices: [
          { finish_reason: "stop", message: { content: "回答" } },
        ],
        usage: {
          prompt_tokens: 12,
          completion_tokens: 4,
          total_tokens: 16,
          cost: { total_cost: 0.0025, input_tokens_cost: 0.001 },
        },
        extra_fields: {
          latency: 321,
          routing_info: {
            provider: "openai",
            model: "studium-m1",
            resolved_key_alias: { model_id: "gpt-4o-mini" },
          },
        },
      },
      new Headers(),
      "studium-openai/studium-m1",
    );

    expect(result).toMatchObject({
      provider: "openai",
      resolvedModel: "gpt-4o-mini",
      gatewayLatencyMs: 321,
      usage: { inputTokens: 12, outputTokens: 4, totalTokens: 16 },
      cost: { amount: 0.0025, currency: "USD" },
    });
  });

  it("parses a minimal text completion", () => {
    expect(
      parseGatewayCompletion(
        { choices: [{ message: { content: "模型回答" } }] },
        new Headers(),
        "requested/model",
      ),
    ).toEqual({
      content: "模型回答",
      requestedModel: "requested/model",
      upstreamResponseId: undefined,
      providerRequestId: undefined,
      provider: undefined,
      resolvedModel: undefined,
      finishReason: undefined,
      usage: undefined,
      cost: undefined,
    });
  });

  it("extracts documented Bifrost and provider metadata", () => {
    const headers = new Headers({
      "x-request-id": "provider-request-1",
      "x-bifrost-provider": "header-provider",
      "x-bifrost-resolved-model": "header-model",
    });

    expect(
      parseGatewayCompletion(
        {
          id: "body-response-id",
          provider: "body-provider",
          model: "body-model",
          choices: [
            {
              finish_reason: "stop",
              message: { content: "回答" },
            },
          ],
          usage: {
            prompt_tokens: 11,
            completion_tokens: 7,
            total_tokens: 18,
          },
          cost: 0.002,
        },
        headers,
        "requested/model",
      ),
    ).toMatchObject({
      content: "回答",
      upstreamResponseId: "body-response-id",
      providerRequestId: "provider-request-1",
      provider: "header-provider",
      requestedModel: "requested/model",
      resolvedModel: "header-model",
      finishReason: "stop",
      usage: { inputTokens: 11, outputTokens: 7, totalTokens: 18 },
      cost: { amount: 0.002, currency: "USD" },
    });
  });

  it("keeps a valid answer when optional usage metadata is malformed", () => {
    const result = parseGatewayCompletion(
      {
        choices: [{ message: { content: "仍然有效的回答" } }],
        usage: { prompt_tokens: "not-a-number" },
      },
      new Headers(),
      "requested/model",
    );

    expect(result.content).toBe("仍然有效的回答");
    expect(result.usage).toBeUndefined();
  });

  it.each([
    { choices: [] },
    { choices: [{ message: { content: "" } }] },
    { choices: [{ message: { content: "   " } }] },
    { choices: [{ message: {} }] },
  ])("rejects a completion without non-blank assistant text", (body) => {
    expect(() =>
      parseGatewayCompletion(body, new Headers(), "requested/model"),
    ).toThrowError(
      expect.objectContaining({
        code: "MODEL_RESPONSE_INVALID",
        stage: "response_parse",
      }),
    );
  });

  it("does not trust undocumented cost headers", () => {
    const result = parseGatewayCompletion(
      { choices: [{ message: { content: "回答" } }] },
      new Headers({ "x-bifrost-cost": "NaN" }),
      "requested/model",
    );

    expect(result.cost).toBeUndefined();
  });
});
