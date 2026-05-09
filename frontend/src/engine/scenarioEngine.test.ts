import { describe, it, expect } from "vitest";
import {
	clampParam,
	resolveEvent,
	checkEnding,
	resolveSpritePath,
} from "./scenarioEngine";
import type {
	GameParameters,
	ScenarioEvent,
	Ending,
	Character,
} from "../types";

const baseParams: GameParameters = { sweetness: 50, curiosity: 0, trust: 50 };

describe("clampParam", () => {
	it("値を0〜100に収める", () => {
		expect(clampParam(110)).toBe(100);
		expect(clampParam(-5)).toBe(0);
		expect(clampParam(50)).toBe(50);
	});
});

describe("resolveEvent", () => {
	const events: ScenarioEvent[] = [
		{
			id: "evt-high",
			trigger: { type: "command", command_id: "cmd-test" },
			condition: { trust: { min: 40 }, flags: [] },
			scene_context: "",
			emotion: "happy_1",
			background: "bg.jpg",
			fallback_text: "high trust response",
			parameter_delta: { sweetness: 5, curiosity: 0, trust: 5 },
			set_flags: [],
			next_event: null,
		},
		{
			id: "evt-low",
			trigger: { type: "command", command_id: "cmd-test" },
			condition: { trust: { max: 39 }, flags: [] },
			scene_context: "",
			emotion: "normal_1",
			background: "bg.jpg",
			fallback_text: "low trust response",
			parameter_delta: { sweetness: 0, curiosity: 0, trust: 2 },
			set_flags: [],
			next_event: null,
		},
	];

	it("条件に合致する最初のイベントを返す", () => {
		const result = resolveEvent(
			"cmd-test",
			{ ...baseParams, trust: 60 },
			[],
			events,
		);
		expect(result?.id).toBe("evt-high");
	});

	it("trust が低い場合はフォールバックイベントを返す", () => {
		const result = resolveEvent(
			"cmd-test",
			{ ...baseParams, trust: 20 },
			[],
			events,
		);
		expect(result?.id).toBe("evt-low");
	});

	it("コマンドIDが合致しない場合は null を返す", () => {
		const result = resolveEvent("cmd-other", baseParams, [], events);
		expect(result).toBeNull();
	});

	it("フラグ条件が未充足の場合はスキップする", () => {
		const flagEvent: ScenarioEvent = {
			...events[0],
			id: "evt-flag",
			condition: { flags: ["required_flag"] },
		};
		const result = resolveEvent("cmd-test", baseParams, [], [flagEvent]);
		expect(result).toBeNull();
	});

	it("フラグが揃っている場合はイベントを返す", () => {
		const flagEvent: ScenarioEvent = {
			...events[0],
			id: "evt-flag",
			condition: { flags: ["required_flag"] },
		};
		const result = resolveEvent(
			"cmd-test",
			baseParams,
			["required_flag"],
			[flagEvent],
		);
		expect(result?.id).toBe("evt-flag");
	});
});

describe("checkEnding", () => {
	const endings: Ending[] = [
		{
			id: "ending-true",
			label: "トゥルー",
			condition: {
				sweetness: { min: 80 },
				curiosity: { min: 80 },
				trust: { min: 80 },
			},
			priority: 1,
			cg: null,
			text: "",
		},
		{
			id: "ending-bad",
			label: "バッド",
			condition: { trust: { max: 15 } },
			priority: 4,
			cg: null,
			text: "",
		},
	];

	it("条件を満たすエンディングを priority 順に返す", () => {
		const result = checkEnding(
			{ sweetness: 85, curiosity: 85, trust: 85 },
			endings,
		);
		expect(result?.id).toBe("ending-true");
	});

	it("バッドエンド条件（trust <= 15）を検出する", () => {
		const result = checkEnding(
			{ sweetness: 30, curiosity: 10, trust: 10 },
			endings,
		);
		expect(result?.id).toBe("ending-bad");
	});

	it("条件未充足の場合は null を返す", () => {
		const result = checkEnding(baseParams, endings);
		expect(result).toBeNull();
	});
});

describe("resolveSpritePath", () => {
	const character: Character = {
		id: "rize",
		name: "リゼ",
		sprites: { normal_1: "images/normal1.png", happy_1: "images/happy1.png" },
		emotion_map: { default: "normal_1", happy: "happy_1" },
	};

	it("直接キーで立ち絵パスを解決する", () => {
		expect(resolveSpritePath(character, "normal_1")).toBe("images/normal1.png");
	});

	it("emotion_map 経由で立ち絵パスを解決する", () => {
		expect(resolveSpritePath(character, "happy")).toBe("images/happy1.png");
	});

	it("未知の感情は default にフォールバックする", () => {
		expect(resolveSpritePath(character, "unknown")).toBe("images/normal1.png");
	});
});
