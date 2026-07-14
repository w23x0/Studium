import { NextResponse } from "next/server";

import {
  chatRequestSchema,
  type ChatErrorCode,
} from "@/lib/chat-contract";
import { LlmError } from "@/lib/llm/errors";
import { requestAssistantMessage } from "@/lib/llm/service";

export const runtime = "nodejs";

const MAX_REQUEST_BYTES = 256 * 1024;

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

async function readJsonBody(request: Request): Promise<unknown> {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
    await request.body?.cancel();
    throw new Error("request_too_large");
  }

  if (!request.body) throw new Error("request_body_missing");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > MAX_REQUEST_BYTES) {
      await reader.cancel();
      throw new Error("request_too_large");
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();

  let body: unknown;
  try {
    body = await readJsonBody(request);
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
    const result = await requestAssistantMessage(
      parsed.data.messages,
      requestId,
      { signal: request.signal },
    );

    return NextResponse.json(
      {
        message: { role: "assistant", content: result.content },
        requestId,
      },
      { headers: { "X-Request-ID": requestId } },
    );
  } catch (error) {
    if (error instanceof LlmError) {
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
