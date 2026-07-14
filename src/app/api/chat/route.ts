import { NextResponse } from "next/server";

import {
  chatRequestSchema,
  type ChatErrorCode,
} from "@/lib/chat-contract";
import { GatewayError, requestAssistantMessage } from "@/lib/gateway";

export const runtime = "nodejs";

const errorMessages: Record<"INVALID_REQUEST" | "INTERNAL_ERROR", string> = {
  INVALID_REQUEST: "请求格式无效，请检查消息内容。",
  INTERNAL_ERROR: "服务器处理请求时发生错误。",
};

function errorResponse(
  code: ChatErrorCode,
  message: string,
  retryable: boolean,
  requestId: string,
  status: number,
) {
  return NextResponse.json(
    {
      error: { code, message, retryable, requestId },
    },
    {
      status,
      headers: { "X-Request-ID": requestId },
    },
  );
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(
      "INVALID_REQUEST",
      errorMessages.INVALID_REQUEST,
      false,
      requestId,
      400,
    );
  }

  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      "INVALID_REQUEST",
      errorMessages.INVALID_REQUEST,
      false,
      requestId,
      400,
    );
  }

  try {
    const content = await requestAssistantMessage(
      parsed.data.messages,
      requestId,
    );

    return NextResponse.json(
      {
        message: { role: "assistant", content },
        requestId,
      },
      { headers: { "X-Request-ID": requestId } },
    );
  } catch (error) {
    if (error instanceof GatewayError) {
      return errorResponse(
        error.code,
        error.message,
        error.retryable,
        requestId,
        error.status,
      );
    }

    console.error("Unexpected chat route error", {
      requestId,
      errorType: error instanceof Error ? error.name : typeof error,
    });

    return errorResponse(
      "INTERNAL_ERROR",
      errorMessages.INTERNAL_ERROR,
      false,
      requestId,
      500,
    );
  }
}
