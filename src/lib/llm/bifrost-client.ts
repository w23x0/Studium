import type {
  GatewayCompletion,
  GatewayCompletionRequest,
  LlmRuntimeConfig,
} from "@/lib/llm/contract";
import { LlmError } from "@/lib/llm/errors";
import {
  parseGatewayAttemptMetadata,
  parseGatewayCompletion,
} from "@/lib/llm/response-parser";

const MAX_ERROR_RESPONSE_BYTES = 64 * 1024;
const MAX_SUCCESS_RESPONSE_BYTES = 2 * 1024 * 1024;

function errorText(body: unknown): string {
  if (typeof body === "string") return body.toLowerCase();
  if (!body || typeof body !== "object") return "";

  const record = body as Record<string, unknown>;
  const nested = record.error;
  return [record.code, record.type, record.message, nested]
    .map((value) =>
      typeof value === "string" ? value : JSON.stringify(value ?? ""),
    )
    .join(" ")
    .toLowerCase();
}

function mapGatewayFailure(
  status: number,
  body: unknown,
  headers: Headers,
): LlmError {
  const detail = errorText(body);
  const attemptMetadata = parseGatewayAttemptMetadata(body, headers);
  const options = {
    upstreamStatus: status,
    stage: "provider_request" as const,
    attemptMetadata,
  };

  if ((attemptMetadata.fallbackIndex ?? 0) > 0) {
    return new LlmError("MODEL_RESPONSE_INVALID", 502, false, {
      ...options,
      stage: "response_parse",
      safeReason: "unexpected_gateway_fallback",
    });
  }

  if (status === 401 || status === 403) {
    if (
      attemptMetadata.provider ||
      detail.includes("provider") ||
      detail.includes("upstream")
    ) {
      return new LlmError("PROVIDER_AUTH_FAILED", 502, false, {
        ...options,
        safeReason: "provider_authentication_failed",
      });
    }
    return new LlmError("GATEWAY_AUTH_FAILED", 502, false, {
      ...options,
      stage: "gateway_auth",
      safeReason: "gateway_authentication_failed",
    });
  }

  if (status === 404 || detail.includes("model_not_found")) {
    return new LlmError("MODEL_NOT_FOUND", 502, false, {
      ...options,
      safeReason: "model_not_found",
    });
  }

  if (
    detail.includes("context_length") ||
    detail.includes("context window") ||
    detail.includes("too many tokens")
  ) {
    return new LlmError("MODEL_CONTEXT_EXCEEDED", 422, false, {
      ...options,
      safeReason: "context_length_exceeded",
    });
  }

  if (
    detail.includes("content_policy") ||
    detail.includes("content filter") ||
    detail.includes("moderation")
  ) {
    return new LlmError("MODEL_CONTENT_REJECTED", 422, false, {
      ...options,
      safeReason: "content_rejected",
    });
  }

  if (status === 408 || status === 504) {
    return new LlmError("MODEL_TIMEOUT", 504, true, {
      ...options,
      safeReason: "upstream_timeout",
    });
  }

  if (status === 429) {
    return new LlmError("MODEL_RATE_LIMITED", 429, true, {
      ...options,
      safeReason: "rate_limited",
    });
  }

  return new LlmError("MODEL_UNAVAILABLE", 502, status >= 500, {
    ...options,
    safeReason: status >= 500 ? "upstream_server_error" : "upstream_rejected",
  });
}

async function readBodyWithLimit(response: Response, limit: number) {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > limit) {
    await response.body?.cancel();
    throw new LlmError("MODEL_RESPONSE_INVALID", 502, true, {
      stage: "response_parse",
      safeReason: "response_too_large",
    });
  }

  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > limit) {
      await reader.cancel();
      throw new LlmError("MODEL_RESPONSE_INVALID", 502, true, {
        stage: "response_parse",
        safeReason: "response_too_large",
      });
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

async function readErrorBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  try {
    const text = await readBodyWithLimit(response, MAX_ERROR_RESPONSE_BYTES);
    return contentType.includes("json") ? JSON.parse(text) : text;
  } catch {
    return undefined;
  }
}

export async function requestBifrostCompletion(
  request: GatewayCompletionRequest,
  config: LlmRuntimeConfig,
): Promise<GatewayCompletion> {
  const timeoutSignal = AbortSignal.timeout(config.timeoutMs);
  const signal = request.signal
    ? AbortSignal.any([request.signal, timeoutSignal])
    : timeoutSignal;

  let response: Response;
  try {
    response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        "X-Request-ID": request.callId,
        "X-Studium-Request-ID": request.requestId,
        "X-Studium-Attempt-ID": request.attemptId,
      },
      body: JSON.stringify({
        model: config.model,
        messages: request.messages,
        stream: false,
        store: false,
      }),
      cache: "no-store",
      redirect: "error",
      signal,
    });
  } catch (error) {
    if (timeoutSignal.aborted) {
      throw new LlmError("MODEL_TIMEOUT", 504, true, {
        stage: "provider_request",
        safeReason: "client_timeout",
        cause: error,
      });
    }

    throw new LlmError("GATEWAY_UNAVAILABLE", 502, true, {
      stage: "gateway_connect",
      safeReason: request.signal?.aborted
        ? "caller_cancelled"
        : "gateway_connection_failed",
      cause: error,
    });
  }

  if (!response.ok) {
    throw mapGatewayFailure(
      response.status,
      await readErrorBody(response),
      response.headers,
    );
  }

  let body: unknown;
  try {
    body = JSON.parse(
      await readBodyWithLimit(response, MAX_SUCCESS_RESPONSE_BYTES),
    );
  } catch (error) {
    if (timeoutSignal.aborted) {
      throw new LlmError("MODEL_TIMEOUT", 504, true, {
        stage: "provider_request",
        safeReason: "client_timeout",
        cause: error,
      });
    }
    if (request.signal?.aborted) {
      throw new LlmError("GATEWAY_UNAVAILABLE", 502, true, {
        stage: "gateway_connect",
        safeReason: "caller_cancelled",
        cause: error,
      });
    }
    if (error instanceof LlmError) throw error;
    throw new LlmError("MODEL_RESPONSE_INVALID", 502, true, {
      stage: "response_parse",
      safeReason: "invalid_json",
      cause: error,
    });
  }

  const completion = parseGatewayCompletion(body, response.headers, config.model);
  if ((completion.fallbackIndex ?? 0) > 0) {
    throw new LlmError("MODEL_RESPONSE_INVALID", 502, false, {
      stage: "response_parse",
      safeReason: "unexpected_gateway_fallback",
      attemptMetadata: completion,
    });
  }
  return completion;
}
