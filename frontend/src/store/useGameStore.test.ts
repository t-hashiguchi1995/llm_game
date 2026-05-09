import { describe, it, expect, beforeEach } from "vitest";
import { useGameStore } from "./useGameStore";

describe("useGameStore - display settings", () => {
	beforeEach(() => {
		useGameStore.getState().resetGame();
	});

	it("displayMode のデフォルトは auto", () => {
		expect(useGameStore.getState().displayMode).toBe("auto");
	});

	it("setDisplayMode で displayMode が変わる", () => {
		useGameStore.getState().setDisplayMode("pc");
		expect(useGameStore.getState().displayMode).toBe("pc");

		useGameStore.getState().setDisplayMode("mobile");
		expect(useGameStore.getState().displayMode).toBe("mobile");
	});

	it("textSpeed のデフォルトは normal", () => {
		expect(useGameStore.getState().textSpeed).toBe("normal");
	});

	it("setTextSpeed で textSpeed が変わる", () => {
		useGameStore.getState().setTextSpeed("fast");
		expect(useGameStore.getState().textSpeed).toBe("fast");
	});

	it("setBgmVolume は 0〜100 に収める", () => {
		useGameStore.getState().setBgmVolume(150);
		expect(useGameStore.getState().bgmVolume).toBe(100);

		useGameStore.getState().setBgmVolume(-10);
		expect(useGameStore.getState().bgmVolume).toBe(0);

		useGameStore.getState().setBgmVolume(60);
		expect(useGameStore.getState().bgmVolume).toBe(60);
	});

	it("setSeVolume は 0〜100 に収める", () => {
		useGameStore.getState().setSeVolume(200);
		expect(useGameStore.getState().seVolume).toBe(100);

		useGameStore.getState().setSeVolume(50);
		expect(useGameStore.getState().seVolume).toBe(50);
	});
});
