import { z } from "zod";

import type { ChatErrorCode, ChatMessage } from "@/lib/chat-contract";

const gatewayConfigSchema = z.object({
  baseUrl: z.string().url(),
  apiKey: z.string().min(1),
  model: z.string().min(1),
  timeoutMs: z.coerce.number().int().positive().max(300_000),
});

const gatewayResponseSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z.string().min(1),
        }),
      }),
    )
    .min(1),
});

const SYSTEM_MESSAGE =
  "You are Studium, a focused learning partner. Answer the learner clearly and help them reason, without claiming to have assessed mastery.";

const publicErrors: Record<
  Exclude<ChatErrorCode, "INVALID_REQUEST" | "INTERNAL_ERROR">,
  string
> = {
  GATEWAY_NOT_CONFIGURED: "模型网关尚未配置，请检查本地环境变量。",
  GATEWAY_AUTH_FAILED: "模型网关鉴权失败，请检查本地配置。",
  MODEL_RATE_LIMITED: "模型请求过于频繁，请稍后重试。",
  MODEL_TIMEOUT: "模型响应超时，请稍后重试。",
  MODEL_UNAVAILABLE: "模型服务暂时不可用，请稍后重试。",
  MODEL_RESPONSE_INVALID: "模型返回了无法识别的响应，请稍后重试。",
};

export class GatewayError extends Error {
  constructor(
    public readonly code: Exclude<
      ChatErrorCode,
      "INVALID_REQUEST" | "INTERNAL_ERROR"
    >,
    public readonly status: number,
    public readonly retryable: boolean,
  ) {
    super(publicErrors[code]);
    this.name = "GatewayError";
  }
}

function readGatewayConfig() {
  const result = gatewayConfigSchema.safeParse({
    baseUrl: process.env.LLM_GATEWAY_BASE_URL,
    apiKey: process.env.LLM_GATEWAY_API_KEY,
    model: process.env.LLM_MODEL,
    timeoutMs: process.env.LLM_TIMEOUT_MS ?? "60000",
  });

  if (!result.success) {
    throw new GatewayError("GATEWAY_NOT_CONFIGURED", 503, false);
  }

  return {
    ...result.data,
    baseUrl: result.data.baseUrl.replace(/\/$/, ""),
  };
}

function mapGatewayStatus(status: number): GatewayError {
  if (status === 401 || status === 403) {
    return new GatewayError("GATEWAY_AUTH_FAILED", 502, false);
  }

  if (status === 408 || status === 504) {
    return new GatewayError("MODEL_TIMEOUT", 504, true);
  }

  if (status === 429) {
    return new GatewayError("MODEL_RATE_LIMITED", 429, true);
  }

  return new GatewayError("MODEL_UNAVAILABLE", 502, status >= 500);
}

export async function requestAssistantMessage(
  messages: ChatMessage[],
  requestId: string,
): Promise<string> {
  const config = readGatewayConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        "X-Request-ID": requestId,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: "system", content: SYSTEM_MESSAGE },
          ...messages,
        ],
        stream: false,
      }),
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw mapGatewayStatus(response.status);
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new GatewayError("MODEL_RESPONSE_INVALID", 502, true);
    }

    const parsed = gatewayResponseSchema.safeParse(body);
    if (!parsed.success) {
      throw new GatewayError("MODEL_RESPONSE_INVALID", 502, true);
    }

    return parsed.data.choices[0].message.content;
  } catch (error) {
    if (error instanceof GatewayError) {
      throw error;
    }

    if (controller.signal.aborted) {
      throw new GatewayError("MODEL_TIMEOUT", 504, true);
    }

    throw new GatewayError("MODEL_UNAVAILABLE", 502, true);
  } finally {
    clearTimeout(timeout);
  }
}
