"use client";

import { FormEvent, useState } from "react";

import {
  chatErrorSchema,
  chatSuccessSchema,
  type ChatMessage,
} from "@/lib/chat-contract";

const UNKNOWN_ERROR = "没有收到可识别的响应，请稍后重试。";

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const content = input.trim();
    if (!content || isSending) {
      return;
    }

    const previousMessages = messages;
    const nextMessages: ChatMessage[] = [
      ...previousMessages,
      { role: "user", content },
    ];

    setMessages(nextMessages);
    setInput("");
    setError(null);
    setIsSending(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });

      let body: unknown;
      try {
        body = await response.json();
      } catch {
        throw new Error(UNKNOWN_ERROR);
      }

      if (!response.ok) {
        const parsedError = chatErrorSchema.safeParse(body);
        throw new Error(
          parsedError.success ? parsedError.data.error.message : UNKNOWN_ERROR,
        );
      }

      const parsedSuccess = chatSuccessSchema.safeParse(body);
      if (!parsedSuccess.success) {
        throw new Error(UNKNOWN_ERROR);
      }

      setMessages([...nextMessages, parsedSuccess.data.message]);
    } catch (requestError) {
      setMessages(previousMessages);
      setInput(content);
      setError(
        requestError instanceof Error ? requestError.message : UNKNOWN_ERROR,
      );
    } finally {
      setIsSending(false);
    }
  }

  return (
    <main className="shell">
      <section className="chat" aria-labelledby="page-title">
        <header className="chatHeader">
          <div>
            <p className="eyebrow">LEARNING SESSION</p>
            <h1 id="page-title">Studium</h1>
          </div>
          <span className="status">M1 · 真实对话</span>
        </header>

        <div className="messages" aria-live="polite">
          {messages.length === 0 ? (
            <div className="emptyState">
              <p className="emptyTitle">从一个问题开始</p>
              <p>这里先验证真实的多轮学习对话。资料与诊断将在后续里程碑加入。</p>
            </div>
          ) : (
            messages.map((message, index) => (
              <article
                className={`message message-${message.role}`}
                key={`${message.role}-${index}`}
              >
                <span>{message.role === "user" ? "你" : "Studium"}</span>
                <p>{message.content}</p>
              </article>
            ))
          )}

          {isSending ? (
            <div className="thinking" role="status">
              Studium 正在思考…
            </div>
          ) : null}
        </div>

        <form className="composer" onSubmit={handleSubmit}>
          <label htmlFor="message">输入你正在思考的问题</label>
          <textarea
            id="message"
            maxLength={8_000}
            onChange={(event) => setInput(event.target.value)}
            placeholder="例如：为什么这个结论成立？"
            rows={3}
            value={input}
          />
          <div className="composerFooter">
            <div>
              {error ? <p role="alert">{error}</p> : null}
            </div>
            <button disabled={isSending || input.trim().length === 0} type="submit">
              {isSending ? "发送中" : "发送"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
