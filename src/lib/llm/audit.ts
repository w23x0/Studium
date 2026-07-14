import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

import type { LlmCallTrace } from "@/lib/llm/contract";

let writeQueue = Promise.resolve();

export function serializeLlmAuditEvent(trace: LlmCallTrace): string {
  return `${JSON.stringify(trace)}\n`;
}

export async function writeLlmAuditEvent(
  trace: LlmCallTrace,
  auditDirectory: string,
): Promise<void> {
  const operation = writeQueue.then(async () => {
    await mkdir(auditDirectory, { recursive: true });
    const date = trace.completedAt.slice(0, 10);
    await appendFile(
      path.join(auditDirectory, `${date}.jsonl`),
      serializeLlmAuditEvent(trace),
      { encoding: "utf8" },
    );
  });

  writeQueue = operation.catch(() => undefined);
  await operation;
}
