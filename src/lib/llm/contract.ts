import type { ChatErrorCode, ChatMessage } from "@/lib/chat-contract";

export type LlmInputMessage =
  | ChatMessage
  | { role: "system"; content: string };

export interface LlmUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

export interface LlmCost {
  amount: number;
  currency: "USD";
}

export type LlmErrorStage =
  | "configuration"
  | "gateway_connect"
  | "gateway_auth"
  | "provider_request"
  | "response_parse"
  | "audit_write";

export interface GatewayCompletionRequest {
  messages: LlmInputMessage[];
  requestId: string;
  callId: string;
  attemptId: string;
  signal?: AbortSignal;
}

export interface GatewayAttemptMetadata {
  gatewayRequestId?: string;
  upstreamResponseId?: string;
  providerRequestId?: string;
  provider?: string;
  resolvedModel?: string;
  finishReason?: string;
  gatewayLatencyMs?: number;
  fallbackIndex?: number;
  usage?: LlmUsage;
  cost?: LlmCost;
}

export interface GatewayCompletion extends GatewayAttemptMetadata {
  content: string;
  requestedModel: string;
}

export interface LlmAttemptTrace {
  attemptId: string;
  sequence: number;
  status: "succeeded" | "failed";
  startedAt: string;
  completedAt: string;
  latencyMs: number;
  gatewayRequestId?: string;
  upstreamResponseId?: string;
  providerRequestId?: string;
  provider?: string;
  requestedModel: string;
  resolvedModel?: string;
  finishReason?: string;
  gatewayLatencyMs?: number;
  fallbackIndex?: number;
  usage?: LlmUsage;
  cost?: LlmCost;
  error?: {
    code: ChatErrorCode;
    stage: LlmErrorStage;
    retryable: boolean;
    upstreamStatus?: number;
    safeReason?: string;
  };
}

export interface LlmCallTrace {
  schemaVersion: 1;
  requestId: string;
  callId: string;
  status: "succeeded" | "failed";
  startedAt: string;
  completedAt: string;
  latencyMs: number;
  messageCount: number;
  messageCharacters: number;
  requestedModel: string;
  attempts: LlmAttemptTrace[];
}

export interface LlmCallResult {
  content: string;
  trace: LlmCallTrace;
}

export type GatewayCompletionClient = (
  request: GatewayCompletionRequest,
  config: LlmRuntimeConfig,
) => Promise<GatewayCompletion>;

export interface LlmRuntimeConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  timeoutMs: number;
  auditDirectory: string;
}
