// @vitest-environment node

import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  serializeLlmAuditEvent,
  writeLlmAuditEvent,
} from "@/lib/llm/audit";
import type { LlmCallTrace } from "@/lib/llm/contract";

const temporaryDirectories: string[] = [];

async function temporaryDirectory() {
  const directory = await mkdtemp(path.join(os.tmpdir(), "studium-audit-"));
  temporaryDirectories.push(directory);
  return directory;
}

function trace(callId: string): LlmCallTrace {
  return {
    schemaVersion: 1,
    requestId: `request-${callId}`,
    callId,
    status: "succeeded",
    startedAt: "2026-07-14T23:59:59.000Z",
    completedAt: "2026-07-15T00:00:01.000Z",
    latencyMs: 2_000,
    messageCount: 1,
    messageCharacters: 21,
    requestedModel: "requested/model",
    attempts: [
      {
        attemptId: `attempt-${callId}`,
        sequence: 1,
        status: "succeeded",
        startedAt: "2026-07-14T23:59:59.000Z",
        completedAt: "2026-07-15T00:00:01.000Z",
        latencyMs: 2_000,
        requestedModel: "requested/model",
      },
    ],
  };
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("LLM JSONL audit", () => {
  it("serializes one versioned JSON object per line without content fields", () => {
    const serialized = serializeLlmAuditEvent(trace("call-1"));

    expect(serialized.endsWith("\n")).toBe(true);
    expect(serialized.split("\n")).toHaveLength(2);
    expect(JSON.parse(serialized.trim())).toMatchObject({
      schemaVersion: 1,
      callId: "call-1",
      messageCount: 1,
      messageCharacters: 21,
    });
    expect(serialized).not.toContain("messages");
    expect(serialized).not.toContain("content");
    expect(serialized).not.toContain("Authorization");
  });

  it("serializes concurrent writes into complete JSONL records", async () => {
    const root = await temporaryDirectory();
    const auditDirectory = path.join(root, "nested", "audit");
    const traces = Array.from({ length: 50 }, (_, index) =>
      trace(`call-${index}`),
    );

    await Promise.all(
      traces.map((event) => writeLlmAuditEvent(event, auditDirectory)),
    );

    const contents = await readFile(
      path.join(auditDirectory, "2026-07-15.jsonl"),
      "utf8",
    );
    const records = contents
      .trimEnd()
      .split("\n")
      .map((line) => JSON.parse(line) as LlmCallTrace);

    expect(records).toHaveLength(50);
    expect(new Set(records.map((record) => record.callId)).size).toBe(50);
    expect(records.every((record) => record.schemaVersion === 1)).toBe(true);
  });

  it("recovers the write queue after an individual filesystem failure", async () => {
    const root = await temporaryDirectory();
    const pathThatIsAFile = path.join(root, "not-a-directory");
    await writeFile(pathThatIsAFile, "occupied", "utf8");

    await expect(
      writeLlmAuditEvent(trace("failed"), pathThatIsAFile),
    ).rejects.toBeInstanceOf(Error);

    const healthyDirectory = path.join(root, "healthy");
    await writeLlmAuditEvent(trace("recovered"), healthyDirectory);
    const contents = await readFile(
      path.join(healthyDirectory, "2026-07-15.jsonl"),
      "utf8",
    );

    expect(JSON.parse(contents).callId).toBe("recovered");
  });
});
