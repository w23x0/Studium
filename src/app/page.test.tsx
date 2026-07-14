import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import Home from "./page";

const fetchMock = vi.fn<typeof fetch>();

describe("Home", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the M1 empty state and prevents empty submissions", () => {
    render(<Home />);

    expect(screen.getByText("从一个问题开始")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "发送" })).toBeDisabled();
  });

  it("sends a multi-turn conversation and renders real API responses", async () => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            message: { role: "assistant", content: "第一轮回答" },
            requestId: "request-1",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            message: { role: "assistant", content: "第二轮回答" },
            requestId: "request-2",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );

    const user = userEvent.setup();
    render(<Home />);

    const input = screen.getByLabelText("输入你正在思考的问题");
    await user.type(input, "第一轮问题");
    await user.click(screen.getByRole("button", { name: "发送" }));
    expect(await screen.findByText("第一轮回答")).toBeInTheDocument();

    await user.type(input, "第二轮问题");
    await user.click(screen.getByRole("button", { name: "发送" }));
    expect(await screen.findByText("第二轮回答")).toBeInTheDocument();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const secondRequest = JSON.parse(
      String(fetchMock.mock.calls[1][1]?.body),
    );
    expect(secondRequest.messages).toEqual([
      { role: "user", content: "第一轮问题" },
      { role: "assistant", content: "第一轮回答" },
      { role: "user", content: "第二轮问题" },
    ]);
  });

  it("shows request progress", async () => {
    vi.stubGlobal("fetch", fetchMock);
    let finishRequest: ((response: Response) => void) | undefined;
    fetchMock.mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        finishRequest = resolve;
      }),
    );

    render(<Home />);
    fireEvent.change(screen.getByLabelText("输入你正在思考的问题"), {
      target: { value: "问题" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "发送" }).closest("form")!);

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Studium 正在思考",
    );
    expect(screen.getByRole("button", { name: "发送中" })).toBeDisabled();

    finishRequest?.(
      new Response(
        JSON.stringify({
          message: { role: "assistant", content: "回答" },
          requestId: "request-progress",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    await waitFor(() => {
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });
  });

  it("restores the unsent message and displays a safe API error", async () => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: {
            code: "MODEL_TIMEOUT",
            message: "模型响应超时，请稍后重试。",
            retryable: true,
            requestId: "request-error",
          },
        }),
        { status: 504, headers: { "Content-Type": "application/json" } },
      ),
    );

    const user = userEvent.setup();
    render(<Home />);

    const input = screen.getByLabelText("输入你正在思考的问题");
    await user.type(input, "需要重试的问题");
    await user.click(screen.getByRole("button", { name: "发送" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "模型响应超时，请稍后重试。",
    );
    expect(input).toHaveValue("需要重试的问题");
    expect(
      screen.queryByText("需要重试的问题", { selector: ".message p" }),
    ).not.toBeInTheDocument();
  });
});
