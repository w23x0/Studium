import { z } from "zod";

export const chatMessageSchema = z
  .object({
    role: z.enum(["user", "assistant"]),
    content: z.string().trim().min(1).max(8_000),
  })
  .strict();

export const chatRequestSchema = z
  .object({
    messages: z.array(chatMessageSchema).min(1).max(20),
  })
  .strict()
  .superRefine(({ messages }, context) => {
    const totalLength = messages.reduce(
      (length, message) => length + message.content.length,
      0,
    );

    if (totalLength > 32_000) {
      context.addIssue({
        code: "custom",
        message: "消息总长度不能超过 32000 个字符。",
        path: ["messages"],
      });
    }

    if (messages.at(-1)?.role !== "user") {
      context.addIssue({
        code: "custom",
        message: "最后一条消息必须来自用户。",
        path: ["messages"],
      });
    }
  });

export const chatSuccessSchema = z
  .object({
    message: z
      .object({
        role: z.literal("assistant"),
        content: z.string().min(1),
      })
      .strict(),
    requestId: z.string().min(1),
  })
  .strict();

export const chatErrorCodeSchema = z.enum([
  "INVALID_REQUEST",
  "GATEWAY_NOT_CONFIGURED",
  "GATEWAY_AUTH_FAILED",
  "MODEL_RATE_LIMITED",
  "MODEL_TIMEOUT",
  "MODEL_UNAVAILABLE",
  "MODEL_RESPONSE_INVALID",
  "INTERNAL_ERROR",
]);

export const chatErrorSchema = z
  .object({
    error: z
      .object({
        code: chatErrorCodeSchema,
        message: z.string().min(1),
        retryable: z.boolean(),
        requestId: z.string().min(1),
      })
      .strict(),
  })
  .strict();

export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type ChatSuccess = z.infer<typeof chatSuccessSchema>;
export type ChatErrorCode = z.infer<typeof chatErrorCodeSchema>;
export type ChatError = z.infer<typeof chatErrorSchema>;
