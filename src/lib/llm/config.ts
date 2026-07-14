import { z } from "zod";

import type { LlmRuntimeConfig } from "@/lib/llm/contract";
import { LlmError } from "@/lib/llm/errors";

const placeholderFragments = [
  "replace-with",
  "change-me",
  "provider/model-name",
];

const loopbackHttpUrlSchema = z.string().url().superRefine((value, context) => {
  const url = new URL(value);
  if (url.protocol !== "http:") {
    context.addIssue({ code: "custom", message: "Gateway must use local HTTP." });
  }
  if (url.hostname !== "127.0.0.1") {
    context.addIssue({ code: "custom", message: "Gateway must use loopback." });
  }
  if (url.port !== "4000") {
    context.addIssue({ code: "custom", message: "Gateway must use port 4000." });
  }
  if (url.pathname.replace(/\/+$/, "") !== "/openai/v1") {
    context.addIssue({
      code: "custom",
      message: "Gateway must use the locked OpenAI-compatible route.",
    });
  }
  if (url.username || url.password || url.search || url.hash) {
    context.addIssue({
      code: "custom",
      message: "Gateway URL must not contain credentials, query, or fragment.",
    });
  }
});

const runtimeConfigSchema = z.object({
  baseUrl: loopbackHttpUrlSchema,
  apiKey: z
    .string()
    .min(24)
    .startsWith("sk-bf-")
    .refine(
      (value) =>
        !placeholderFragments.some((fragment) =>
          value.toLowerCase().includes(fragment),
        ),
    ),
  model: z
    .string()
    .regex(/^studium-[a-z0-9_-]+\/studium-m1$/)
    .refine(
      (value) =>
        !placeholderFragments.some((fragment) =>
          value.toLowerCase().includes(fragment),
        ),
    ),
  timeoutMs: z.coerce.number().int().positive().max(300_000),
  auditDirectory: z.string().trim().min(1),
});

export function readLlmRuntimeConfig(
  environment: NodeJS.ProcessEnv = process.env,
): LlmRuntimeConfig {
  const result = runtimeConfigSchema.safeParse({
    baseUrl: environment.STUDIUM_LLM_GATEWAY_BASE_URL,
    apiKey: environment.STUDIUM_LLM_GATEWAY_API_KEY,
    model: environment.STUDIUM_LLM_MODEL,
    timeoutMs: environment.STUDIUM_LLM_TIMEOUT_MS ?? "60000",
    auditDirectory:
      environment.STUDIUM_LLM_AUDIT_DIR ?? "var/audit/llm-calls",
  });

  if (!result.success) {
    throw new LlmError("GATEWAY_NOT_CONFIGURED", 503, false, {
      stage: "configuration",
      safeReason: "invalid_runtime_configuration",
    });
  }

  return {
    ...result.data,
    baseUrl: result.data.baseUrl.replace(/\/+$/, ""),
  };
}
