import type { ChatMessage } from "@/lib/chat-contract";
import { writeLlmAuditEvent } from "@/lib/llm/audit";
import { requestBifrostCompletion } from "@/lib/llm/bifrost-client";
import { readLlmRuntimeConfig } from "@/lib/llm/config";
import type {
  GatewayCompletionClient,
  LlmCallResult,
  LlmCallTrace,
  LlmRuntimeConfig,
} from "@/lib/llm/contract";
import { LlmError } from "@/lib/llm/errors";

const SYSTEM_MESSAGE =
  "You are Studium, a focused learning partner. Answer the learner clearly and help them reason, without claiming to have assessed mastery.";

interface LlmServiceDependencies {
  readConfig: () => LlmRuntimeConfig;
  complete: GatewayCompletionClient;
  writeAudit: typeof writeLlmAuditEvent;
  randomUUID: () => string;
  now: () => Date;
  monotonicNow: () => number;
}

const defaultDependencies: LlmServiceDependencies = {
  readConfig: readLlmRuntimeConfig,
  complete: requestBifrostCompletion,
  writeAudit: writeLlmAuditEvent,
  randomUUID: () => crypto.randomUUID(),
  now: () => new Date(),
  monotonicNow: () => performance.now(),
};

export interface LlmCallOptions {
  signal?: AbortSignal;
  dependencies?: Partial<LlmServiceDependencies>;
}

async function persistAuditSafely(
  trace: LlmCallTrace,
  config: LlmRuntimeConfig,
  dependencies: LlmServiceDependencies,
) {
  try {
    await dependencies.writeAudit(trace, config.auditDirectory);
  } catch (error) {
    console.warn("Failed to write LLM audit event", {
      requestId: trace.requestId,
      callId: trace.callId,
      errorType: error instanceof Error ? error.name : typeof error,
    });
  }
}

export async function requestAssistantMessage(
  messages: ChatMessage[],
  requestId: string,
  options: LlmCallOptions = {},
): Promise<LlmCallResult> {
  const dependencies = { ...defaultDependencies, ...options.dependencies };
  const config = dependencies.readConfig();
  const callId = dependencies.randomUUID();
  const attemptId = dependencies.randomUUID();
  const startedAt = dependencies.now().toISOString();
  const started = dependencies.monotonicNow();

  try {
    const completion = await dependencies.complete(
      {
        requestId,
        callId,
        attemptId,
        signal: options.signal,
        messages: [{ role: "system", content: SYSTEM_MESSAGE }, ...messages],
      },
      config,
    );
    const completedAt = dependencies.now().toISOString();
    const latencyMs = Math.max(0, dependencies.monotonicNow() - started);
    const trace: LlmCallTrace = {
      schemaVersion: 1,
      requestId,
      callId,
      status: "succeeded",
      startedAt,
      completedAt,
      latencyMs,
      messageCount: messages.length,
      messageCharacters: messages.reduce(
        (total, message) => total + message.content.length,
        0,
      ),
      requestedModel: config.model,
      attempts: [
        {
          attemptId,
          sequence: 1,
          status: "succeeded",
          startedAt,
          completedAt,
          latencyMs,
          gatewayRequestId: completion.gatewayRequestId,
          upstreamResponseId: completion.upstreamResponseId,
          providerRequestId: completion.providerRequestId,
          provider: completion.provider,
          requestedModel: completion.requestedModel,
          resolvedModel: completion.resolvedModel,
          finishReason: completion.finishReason,
          gatewayLatencyMs: completion.gatewayLatencyMs,
          fallbackIndex: completion.fallbackIndex,
          usage: completion.usage,
          cost: completion.cost,
        },
      ],
    };

    await persistAuditSafely(trace, config, dependencies);
    return { content: completion.content, trace };
  } catch (error) {
    const llmError =
      error instanceof LlmError
        ? error
        : new LlmError("MODEL_UNAVAILABLE", 502, true, {
            stage: "provider_request",
            safeReason: "unexpected_client_error",
            cause: error,
          });
    const completedAt = dependencies.now().toISOString();
    const latencyMs = Math.max(0, dependencies.monotonicNow() - started);
    const trace: LlmCallTrace = {
      schemaVersion: 1,
      requestId,
      callId,
      status: "failed",
      startedAt,
      completedAt,
      latencyMs,
      messageCount: messages.length,
      messageCharacters: messages.reduce(
        (total, message) => total + message.content.length,
        0,
      ),
      requestedModel: config.model,
      attempts: [
        {
          attemptId,
          sequence: 1,
          status: "failed",
          startedAt,
          completedAt,
          latencyMs,
          gatewayRequestId: llmError.attemptMetadata?.gatewayRequestId,
          upstreamResponseId: llmError.attemptMetadata?.upstreamResponseId,
          providerRequestId: llmError.attemptMetadata?.providerRequestId,
          provider: llmError.attemptMetadata?.provider,
          requestedModel: config.model,
          resolvedModel: llmError.attemptMetadata?.resolvedModel,
          gatewayLatencyMs: llmError.attemptMetadata?.gatewayLatencyMs,
          fallbackIndex: llmError.attemptMetadata?.fallbackIndex,
          usage: llmError.attemptMetadata?.usage,
          cost: llmError.attemptMetadata?.cost,
          error: {
            code: llmError.code,
            stage: llmError.stage,
            retryable: llmError.retryable,
            upstreamStatus: llmError.upstreamStatus,
            safeReason: llmError.safeReason,
          },
        },
      ],
    };

    await persistAuditSafely(trace, config, dependencies);
    throw llmError;
  }
}
