import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { useGameStore } from "./useGameStore";
import type { ScenarioEvent, SaveSlot } from "../types";

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

const sampleEvent: ScenarioEvent = {
  id: "evt-test",
  trigger: { type: "command", command_id: "cmd-test" },
  condition: {},
  scene_context: "",
  emotion: "happy_1",
  background: "bg.jpg",
  fallback_text: "テストセリフ",
  parameter_delta: { sweetness: 10, curiosity: 5, trust: -3 },
  set_flags: ["test_flag"],
  next_event: null,
};

describe("useGameStore - applyEvent", () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  it("パラメータが正しく更新される（sweetness 50+10=60, curiosity 0+5=5, trust 50-3=47）", () => {
    useGameStore.getState().applyEvent(sampleEvent);
    const { params } = useGameStore.getState();
    expect(params.sweetness).toBe(60);
    expect(params.curiosity).toBe(5);
    expect(params.trust).toBe(47);
  });

  it("set_flags のフラグが追加される", () => {
    useGameStore.getState().applyEvent(sampleEvent);
    expect(useGameStore.getState().flags).toContain("test_flag");
  });

  it("ダイアログテキストと emotion が更新される", () => {
    useGameStore.getState().applyEvent(sampleEvent);
    expect(useGameStore.getState().currentDialog?.text).toBe("テストセリフ");
    expect(useGameStore.getState().currentDialog?.emotion).toBe("happy_1");
  });

  it("cooldownUntil は変更されない", () => {
    const before = useGameStore.getState().cooldownUntil;
    useGameStore.getState().applyEvent(sampleEvent);
    expect(useGameStore.getState().cooldownUntil).toBe(before);
  });

  it("パラメータは 0〜100 に収まる（sweetness 50+999=100, curiosity 0-999=0）", () => {
    const extremeEvent: ScenarioEvent = {
      ...sampleEvent,
      parameter_delta: { sweetness: 999, curiosity: -999, trust: 0 },
    };
    useGameStore.getState().applyEvent(extremeEvent);
    const { params } = useGameStore.getState();
    expect(params.sweetness).toBe(100);
    expect(params.curiosity).toBe(0);
  });
});

describe("useGameStore - setCooldownUntil", () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  it("指定した値に cooldownUntil が更新される", () => {
    const future = Date.now() + 5000;
    useGameStore.getState().setCooldownUntil(future);
    expect(useGameStore.getState().cooldownUntil).toBe(future);
  });
});

describe("useGameStore - importSaves", () => {
  afterEach(() => {
    localStorage.clear();
    useGameStore.getState().resetGame();
  });

  it("importSaves で saveSlots が上書きされる", () => {
    const slots: SaveSlot[] = [
      {
        slot: 1,
        timestamp: "2026-05-01T12:00:00.000Z",
        params: { sweetness: 80, curiosity: 20, trust: 90 },
        currentScene: "scene-002",
        flags: ["flag_a"],
        isEnded: false,
        endingId: null,
        currentDialog: null,
      },
    ];
    useGameStore.getState().importSaves(slots);
    const state = useGameStore.getState();
    expect(state.saveSlots).toHaveLength(1);
    expect(state.saveSlots[0].slot).toBe(1);
    expect(state.saveSlots[0].params.sweetness).toBe(80);
  });

  it("importSaves は localStorage にも書き込む", () => {
    const slots: SaveSlot[] = [
      {
        slot: 3,
        timestamp: "2026-05-01T00:00:00.000Z",
        params: { sweetness: 50, curiosity: 50, trust: 50 },
        currentScene: "scene-001",
        flags: [],
        isEnded: false,
        endingId: null,
        currentDialog: null,
      },
    ];
    useGameStore.getState().importSaves(slots);
    const raw = localStorage.getItem("mssp_save_slot_3");
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!).slot).toBe(3);
  });
});

describe("useGameStore - saveGame persistence", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("saveGame で localStorage に書き込まれ saveSlots に追加される", () => {
    useGameStore.getState().resetGame();
    useGameStore.getState().saveGame(0);
    const raw = localStorage.getItem("mssp_save_slot_0");
    expect(raw).not.toBeNull();
    expect(useGameStore.getState().saveSlots.find((s) => s.slot === 0)).toBeDefined();
  });
});
