import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useEventQueue } from "./useEventQueue";
import { useGameStore } from "../store/useGameStore";

beforeEach(() => {
  useGameStore.getState().resetGame();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
});

describe("useEventQueue - handleCommand", () => {
  it("isEnded の場合はイベントを適用しない", () => {
    useGameStore.setState({ isEnded: true });
    const { result } = renderHook(() => useEventQueue());
    const spy = vi.spyOn(useGameStore.getState(), "applyEvent");

    act(() => {
      result.current.handleCommand("cmd-support-001");
    });

    expect(spy).not.toHaveBeenCalled();
  });

  it("クールダウン中はイベントを適用しない", () => {
    useGameStore.getState().setCooldownUntil(Date.now() + 5000);
    const { result } = renderHook(() => useEventQueue());
    const spy = vi.spyOn(useGameStore.getState(), "applyEvent");

    act(() => {
      result.current.handleCommand("cmd-support-001");
    });

    expect(spy).not.toHaveBeenCalled();
  });

  it("有効なコマンドを実行するとクールダウンが開始される", () => {
    const { result } = renderHook(() => useEventQueue());
    const before = Date.now();

    act(() => {
      result.current.handleCommand("cmd-talk-001");
    });
    act(() => {
      vi.runAllTimers();
    });

    expect(useGameStore.getState().cooldownUntil).toBeGreaterThan(before);
  });

  it("isProcessing: コマンド実行中は true、完了後は false", () => {
    const { result } = renderHook(() => useEventQueue());

    expect(result.current.isProcessing).toBe(false);

    act(() => {
      result.current.handleCommand("cmd-talk-001");
    });

    expect(result.current.isProcessing).toBe(true);

    act(() => {
      vi.runAllTimers();
    });

    expect(result.current.isProcessing).toBe(false);
  });

  it("コマンド実行後にダイアログが更新される", () => {
    const { result } = renderHook(() => useEventQueue());

    act(() => {
      result.current.handleCommand("cmd-talk-001");
    });
    act(() => {
      vi.runAllTimers();
    });

    expect(useGameStore.getState().currentDialog?.text).not.toBeUndefined();
  });
});
