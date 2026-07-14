import { z } from "zod";

import type {
  GatewayAttemptMetadata,
  GatewayCompletion,
  LlmCost,
  LlmUsage,
} from "@/lib/llm/contract";
import { LlmError } from "@/lib/llm/errors";

const completionCoreSchema = z
  .object({
    choices: z
      .array(
        z.object({
          finish_reason: z.string().nullish(),
          message: z.object({
            content: z.string().trim().min(1),
          }),
        }),
      )
      .min(1),
  })
  .passthrough();

const costValueSchema = z.union([
  z.number().nonnegative(),
  z.object({ total_cost: z.number().nonnegative().optional() }).passthrough(),
]);

const optionalMetadataSchema = z.object({
  id: z.string().trim().min(1).max(512).optional(),
  model: z.string().trim().min(1).max(512).optional(),
  provider: z.string().trim().min(1).max(128).optional(),
  usage: z
    .object({
      prompt_tokens: z.number().int().nonnegative().optional(),
      completion_tokens: z.number().int().nonnegative().optional(),
      total_tokens: z.number().int().nonnegative().optional(),
      cost: costValueSchema.optional(),
    })
    .passthrough()
    .optional(),
  cost: costValueSchema.optional(),
  extra_fields: z
    .object({
      provider: z.string().trim().min(1).max(128).optional(),
      resolved_model_used: z.string().trim().min(1).max(512).optional(),
      latency: z.number().int().nonnegative().optional(),
      routing_info: z
        .object({
          provider: z.string().trim().min(1).max(128).optional(),
          model: z.string().trim().min(1).max(512).optional(),
          is_fallback: z.boolean().optional(),
          resolved_key_alias: z
            .object({
              model_id: z.string().trim().min(1).max(512),
            })
            .passthrough()
            .optional(),
        })
        .passthrough()
        .optional(),
    })
    .passthrough()
    .optional(),
});

function firstHeader(headers: Headers, names: string[]) {
  for (const name of names) {
    const value = headers.get(name)?.trim();
    if (value && value.length <= 512) return value;
  }
  return undefined;
}

function parseNonNegativeNumber(value: string | undefined) {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function parseNonNegativeInteger(value: string | undefined) {
  const parsed = parseNonNegativeNumber(value);
  return parsed !== undefined && Number.isInteger(parsed) ? parsed : undefined;
}

function parseUsage(
  usage: z.infer<typeof optionalMetadataSchema>["usage"],
): LlmUsage | undefined {
  if (!usage) return undefined;

  const parsed: LlmUsage = {
    inputTokens: usage.prompt_tokens,
    outputTokens: usage.completion_tokens,
    totalTokens: usage.total_tokens,
  };

  return Object.values(parsed).some((value) => value !== undefined)
    ? parsed
    : undefined;
}

function parseCost(
  bodyCost: z.infer<typeof costValueSchema> | undefined,
  usageCost: z.infer<typeof costValueSchema> | undefined,
): LlmCost | undefined {
  const costAmount = (value: z.infer<typeof costValueSchema> | undefined) =>
    typeof value === "number" ? value : value?.total_cost;
  const amount =
    costAmount(bodyCost) ??
    costAmount(usageCost);

  return amount === undefined ? undefined : { amount, currency: "USD" };
}

function optionalMetadata(body: unknown) {
  const topLevel = optionalMetadataSchema.safeParse(body);
  const nestedError =
    body && typeof body === "object" && "error" in body
      ? optionalMetadataSchema.safeParse(
          (body as Record<string, unknown>).error,
        )
      : undefined;
  const top = topLevel.success ? topLevel.data : {};
  const nested = nestedError?.success ? nestedError.data : {};
  return {
    id: top.id ?? nested.id,
    model: top.model ?? nested.model,
    provider: top.provider ?? nested.provider,
    usage: top.usage ?? nested.usage,
    cost: top.cost ?? nested.cost,
    extraFields: top.extra_fields ?? nested.extra_fields,
  };
}

export function parseGatewayAttemptMetadata(
  body: unknown,
  headers: Headers,
): GatewayAttemptMetadata {
  const metadata = optionalMetadata(body);
  const routing = metadata.extraFields?.routing_info;
  return {
    upstreamResponseId: metadata.id,
    providerRequestId: firstHeader(headers, [
      "x-request-id",
      "x-provider-request-id",
      "x-upstream-request-id",
    ]),
    provider:
      firstHeader(headers, ["x-bifrost-provider"]) ??
      routing?.provider ??
      metadata.extraFields?.provider ??
      metadata.provider,
    resolvedModel:
      firstHeader(headers, ["x-bifrost-resolved-model"]) ??
      routing?.resolved_key_alias?.model_id ??
      metadata.extraFields?.resolved_model_used ??
      metadata.model,
    gatewayLatencyMs: metadata.extraFields?.latency,
    fallbackIndex:
      parseNonNegativeInteger(
        firstHeader(headers, ["x-bifrost-fallback-index"]),
      ) ?? (routing?.is_fallback ? 1 : undefined),
    usage: parseUsage(metadata.usage),
    cost: parseCost(metadata.cost, metadata.usage?.cost),
  };
}

export function parseGatewayCompletion(
  body: unknown,
  headers: Headers,
  requestedModel: string,
): GatewayCompletion {
  const parsed = completionCoreSchema.safeParse(body);
  if (!parsed.success) {
    throw new LlmError("MODEL_RESPONSE_INVALID", 502, true, {
      stage: "response_parse",
      safeReason: "invalid_completion_schema",
    });
  }

  const response = parsed.data;
  const metadata = parseGatewayAttemptMetadata(body, headers);
  return {
    content: response.choices[0].message.content,
    ...metadata,
    requestedModel,
    finishReason: response.choices[0].finish_reason ?? undefined,
  };
}
