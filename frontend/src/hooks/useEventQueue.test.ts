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

describe("useEventQueue - chain and auto-trigger behavior", () => {
	it("handleCommand を連続呼び出しすると2回目はキューが空になるまで無視される", () => {
		const { result } = renderHook(() => useEventQueue());

		act(() => {
			result.current.handleCommand("cmd-talk-001");
		});

		// isProcessing = true なので2回目は無視される
		act(() => {
			result.current.handleCommand("cmd-talk-001");
		});

		// キュードレイン後は1回分の更新のみ
		act(() => {
			vi.runAllTimers();
		});

		expect(result.current.isProcessing).toBe(false);
	});

	it("chain イベントが存在する場合 isProcessing が連続して true になる", () => {
		// evt-touch-003 は next_event: "evt-touch-003-reaction" を持つ
		// trust >= 55 が必要なので先にパラメータをセット
		useGameStore.setState({
			params: { sweetness: 60, curiosity: 0, trust: 60 },
		});
		const { result } = renderHook(() => useEventQueue());

		act(() => {
			result.current.handleCommand("cmd-touch-003");
		});

		// primary イベント適用前: isProcessing = true
		expect(result.current.isProcessing).toBe(true);

		// cascade: delay=0 fires primary, React re-renders, then delay=400 fires reaction
		act(() => {
			vi.advanceTimersByTime(0);
		});
		act(() => {
			vi.advanceTimersByTime(1000);
		});

		// chain 完了後: isProcessing = false
		expect(result.current.isProcessing).toBe(false);
	});

	it("auto-trigger イベント発火後は _auto_fired_ フラグが追加される", () => {
		// trust >= 70 にして evt-auto-trust-high を発火させる
		useGameStore.setState({
			params: { sweetness: 50, curiosity: 0, trust: 71 },
		});
		const { result } = renderHook(() => useEventQueue());

		act(() => {
			result.current.handleCommand("cmd-talk-001");
		});
		// cascade: delay=0 fires primary, React re-renders, then delay=400 fires auto event
		act(() => {
			vi.advanceTimersByTime(0);
		});
		act(() => {
			vi.advanceTimersByTime(1000);
		});

		const flags = useGameStore.getState().flags;
		expect(flags).toContain("_auto_fired_evt-auto-trust-high");
	});
});
