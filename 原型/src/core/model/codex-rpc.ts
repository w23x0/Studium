// Codex app-server 的 stdio JSON-RPC；协议按 codex-cli 0.166.0 核对。
// 只处理传输与进程生命期，业务事件在 codex-app-server.ts 转换。
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { createInterface } from 'node:readline';
import { z } from 'zod';

const envelope = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  method: z.string().optional(),
  params: z.unknown().optional(),
  result: z.unknown().optional(),
  error: z.object({ code: z.number(), message: z.string() }).optional(),
});

export type RpcId = string | number;
export interface RpcHandlers {
  notification(method: string, params: unknown): void;
  request(id: RpcId, method: string, params: unknown): Promise<void>;
  failed(error: Error): void;
}

export class CodexRpc {
  private readonly child: ChildProcessWithoutNullStreams;
  private readonly exited: Promise<void>;
  private readonly pending = new Map<
    number,
    { resolve(value: unknown): void; reject(error: Error): void; timer: NodeJS.Timeout }
  >();
  private nextId = 0;
  private failure: Error | undefined;
  private closing = false;
  private stderr = '';

  constructor(
    binary: string,
    args: string[],
    cwd: string,
    env: NodeJS.ProcessEnv,
    private readonly handlers: RpcHandlers,
  ) {
    this.child = spawn(binary, ['app-server', '--listen', 'stdio://', ...args], {
      cwd,
      env,
      stdio: 'pipe',
      detached: process.platform !== 'win32',
    });
    this.child.stderr.setEncoding('utf8');
    this.child.stderr.on('data', (text: string) => {
      this.stderr = (this.stderr + text).slice(-3000);
    });
    this.child.on('error', (error) => this.fail(new Error(`无法启动 Codex：${error.message}`)));
    this.child.stdin.on('error', (error) => this.fail(error));
    this.exited = new Promise((resolve) => {
      this.child.once('close', (code, signal) => {
        if (!this.closing) {
          this.fail(
            new Error(`Codex 进程退出（${signal ?? String(code)}）：${this.stderr.trim()}`),
          );
        }
        resolve();
      });
    });
    const lines = createInterface({ input: this.child.stdout });
    lines.on('line', (line) => {
      try {
        const msg = envelope.parse(JSON.parse(line) as unknown);
        if (msg.method !== undefined) {
          if (msg.id !== undefined) {
            void this.handlers.request(msg.id, msg.method, msg.params).catch((error: unknown) => {
              this.fail(asError(error));
            });
          } else this.handlers.notification(msg.method, msg.params);
        } else if (typeof msg.id === 'number') {
          const p = this.pending.get(msg.id);
          if (p === undefined) return;
          this.pending.delete(msg.id);
          clearTimeout(p.timer);
          if (msg.error !== undefined) p.reject(new Error(`Codex：${msg.error.message}`));
          else p.resolve(msg.result);
        }
      } catch (error) {
        this.fail(new Error(`Codex 协议处理失败：${asError(error).message}`));
      }
    });
  }

  async request(method: string, params: unknown, timeout = 60_000): Promise<unknown> {
    if (this.failure !== undefined) throw this.failure;
    if (this.closing) throw new Error('Codex 进程已关闭');
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Codex ${method} 在 ${timeout / 1000} 秒内没有响应`));
      }, timeout);
      this.pending.set(id, { resolve, reject, timer });
      this.write({ id, method, params });
    });
  }

  notify(method: string, params?: unknown): void {
    this.write({ method, ...(params !== undefined ? { params } : {}) });
  }

  respond(id: RpcId, result: unknown): void {
    this.write({ id, result });
  }

  reject(id: RpcId, message: string): void {
    this.write({ id, error: { code: -32601, message } });
  }

  private write(message: unknown): void {
    if (this.closing || this.failure !== undefined) return;
    this.child.stdin.write(`${JSON.stringify(message)}\n`);
  }

  private fail(error: Error): void {
    if (this.failure !== undefined || this.closing) return;
    this.failure = error;
    this.rejectPending(error);
    this.handlers.failed(error);
    this.kill('SIGTERM');
  }

  private rejectPending(error: Error): void {
    for (const p of this.pending.values()) {
      clearTimeout(p.timer);
      p.reject(error);
    }
    this.pending.clear();
  }

  private kill(signal: NodeJS.Signals): void {
    if (this.child.pid === undefined) return;
    try {
      if (process.platform === 'win32') this.child.kill(signal);
      else process.kill(-this.child.pid, signal);
    } catch (error) {
      // 整个进程组已经退出时无需再发信号。
      if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error;
    }
  }

  async close(): Promise<void> {
    if (this.closing) return this.exited;
    this.closing = true;
    this.rejectPending(new Error('Codex 进程已关闭'));
    this.child.stdin.end();
    this.kill('SIGTERM');
    const timer = setTimeout(() => this.kill('SIGKILL'), 2000);
    try {
      await this.exited;
    } finally {
      clearTimeout(timer);
    }
  }
}

export function asError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

/** 一轮内持续到来的通知；结束后不再接受晚到的消息。 */
export class EventQueue<T> implements AsyncIterable<T> {
  private readonly items: T[] = [];
  private waiter: ((value: IteratorResult<T>) => void) | undefined;
  private ended = false;

  push(value: T): void {
    if (this.ended) return;
    if (this.waiter !== undefined) {
      this.waiter({ value, done: false });
      this.waiter = undefined;
    } else this.items.push(value);
  }

  end(): void {
    this.ended = true;
    this.waiter?.({ value: undefined, done: true });
    this.waiter = undefined;
  }

  [Symbol.asyncIterator](): AsyncIterator<T> {
    return {
      next: () => {
        const value = this.items.shift();
        if (value !== undefined) return Promise.resolve({ value, done: false });
        if (this.ended) return Promise.resolve({ value: undefined, done: true });
        return new Promise((resolve) => {
          this.waiter = resolve;
        });
      },
    };
  }
}
