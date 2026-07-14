import type { ChatErrorCode } from "@/lib/chat-contract";
import type {
  GatewayAttemptMetadata,
  LlmErrorStage,
} from "@/lib/llm/contract";

const publicErrors: Record<
  Exclude<ChatErrorCode, "INVALID_REQUEST" | "INTERNAL_ERROR">,
  string
> = {
  GATEWAY_NOT_CONFIGURED: "模型网关尚未配置，请检查本地环境变量。",
  GATEWAY_UNAVAILABLE: "模型网关暂时不可用，请稍后重试。",
  GATEWAY_AUTH_FAILED: "模型网关鉴权失败，请检查本地配置。",
  PROVIDER_AUTH_FAILED: "上游模型鉴权失败，请检查供应商配置。",
  MODEL_NOT_FOUND: "配置的模型不存在或不可用，请检查模型配置。",
  MODEL_RATE_LIMITED: "模型请求过于频繁，请稍后重试。",
  MODEL_CONTEXT_EXCEEDED: "本次对话超过了模型可处理的上下文长度。",
  MODEL_CONTENT_REJECTED: "模型供应商拒绝处理本次内容。",
  MODEL_TIMEOUT: "模型响应超时，请稍后重试。",
  MODEL_UNAVAILABLE: "模型服务暂时不可用，请稍后重试。",
  MODEL_RESPONSE_INVALID: "模型返回了无法识别的响应，请稍后重试。",
};

type PublicLlmErrorCode = Exclude<
  ChatErrorCode,
  "INVALID_REQUEST" | "INTERNAL_ERROR"
>;

export interface LlmErrorOptions {
  stage: LlmErrorStage;
  upstreamStatus?: number;
  safeReason?: string;
  attemptMetadata?: GatewayAttemptMetadata;
  cause?: unknown;
}

export class LlmError extends Error {
  readonly stage: LlmErrorStage;
  readonly upstreamStatus?: number;
  readonly safeReason?: string;
  readonly attemptMetadata?: GatewayAttemptMetadata;

  constructor(
    public readonly code: PublicLlmErrorCode,
    public readonly status: number,
    public readonly retryable: boolean,
    options: LlmErrorOptions,
  ) {
    super(publicErrors[code], { cause: options.cause });
    this.name = "LlmError";
    this.stage = options.stage;
    this.upstreamStatus = options.upstreamStatus;
    this.safeReason = options.safeReason;
    this.attemptMetadata = options.attemptMetadata;
  }
}
