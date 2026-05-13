import { describe, it, expect } from "vitest";
import {
	clampParam,
	resolveEvent,
	checkEnding,
	resolveSpritePath,
	resolveEventById,
	resolveEventChain,
	resolveAutoEvents,
	checkSceneProgression,
} from "./scenarioEngine";
import type {
	GameParameters,
	ScenarioEvent,
	Ending,
	Character,
	Scene,
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

const chainEvents: ScenarioEvent[] = [
	{
		id: "evt-a",
		trigger: { type: "command", command_id: "cmd-a" },
		condition: {},
		scene_context: "",
		emotion: "normal_1",
		background: "bg.jpg",
		fallback_text: "A",
		parameter_delta: { sweetness: 0, curiosity: 0, trust: 0 },
		set_flags: [],
		next_event: "evt-b",
	},
	{
		id: "evt-b",
		trigger: { type: "chain" },
		condition: {},
		scene_context: "",
		emotion: "happy_1",
		background: "bg.jpg",
		fallback_text: "B",
		parameter_delta: { sweetness: 2, curiosity: 0, trust: 1 },
		set_flags: [],
		next_event: null,
	},
];

describe("resolveEventById", () => {
	it("IDでイベントを直接取得する", () => {
		expect(resolveEventById("evt-b", chainEvents)?.id).toBe("evt-b");
	});

	it("存在しないIDはnullを返す", () => {
		expect(resolveEventById("evt-unknown", chainEvents)).toBeNull();
	});
});

describe("resolveEventChain", () => {
	it("primary と chain イベントの配列を返す", () => {
		const result = resolveEventChain("cmd-a", baseParams, [], chainEvents);
		expect(result.map((e) => e.id)).toEqual(["evt-a", "evt-b"]);
	});

	it("next_event が null の場合は primary のみ返す", () => {
		const solo: ScenarioEvent[] = [
			{ ...chainEvents[0], id: "evt-solo", trigger: { type: "command", command_id: "cmd-solo" }, next_event: null },
		];
		const result = resolveEventChain("cmd-solo", baseParams, [], solo);
		expect(result).toHaveLength(1);
		expect(result[0].id).toBe("evt-solo");
	});

	it("コマンドに合致するイベントがない場合は空配列を返す", () => {
		expect(resolveEventChain("cmd-missing", baseParams, [], chainEvents)).toHaveLength(0);
	});

	it("next_event 連鎖は最大5件で打ち切る", () => {
		const long: ScenarioEvent[] = Array.from({ length: 8 }, (_, i) => ({
			id: `evt-${i}`,
			trigger: i === 0
				? ({ type: "command" as const, command_id: "cmd-long" })
				: ({ type: "chain" as const }),
			condition: {},
			scene_context: "",
			emotion: "normal_1",
			background: "bg.jpg",
			fallback_text: `text ${i}`,
			parameter_delta: { sweetness: 0, curiosity: 0, trust: 0 },
			set_flags: [],
			next_event: i < 7 ? `evt-${i + 1}` : null,
		}));
		const result = resolveEventChain("cmd-long", baseParams, [], long);
		expect(result.length).toBeLessThanOrEqual(6);
	});
});

const autoTestEvents: ScenarioEvent[] = [
	{
		id: "evt-auto-param",
		trigger: { type: "parameter" },
		condition: { trust: { min: 70 } },
		scene_context: "",
		emotion: "happy_1",
		background: "bg.jpg",
		fallback_text: "high trust",
		parameter_delta: { sweetness: 2, curiosity: 0, trust: 0 },
		set_flags: ["_auto_fired_evt-auto-param"],
		next_event: null,
	},
	{
		id: "evt-auto-flag",
		trigger: { type: "flag", flag_id: "some_flag" },
		condition: {},
		scene_context: "",
		emotion: "normal_1",
		background: "bg.jpg",
		fallback_text: "flag triggered",
		parameter_delta: { sweetness: 0, curiosity: 0, trust: 5 },
		set_flags: ["_auto_fired_evt-auto-flag"],
		next_event: null,
	},
	{
		id: "evt-cmd",
		trigger: { type: "command", command_id: "cmd-x" },
		condition: {},
		scene_context: "",
		emotion: "normal_1",
		background: "bg.jpg",
		fallback_text: "cmd",
		parameter_delta: { sweetness: 0, curiosity: 0, trust: 0 },
		set_flags: [],
		next_event: null,
	},
];

describe("resolveAutoEvents", () => {
	it("trust >= 70 の parameter イベントを返す", () => {
		const result = resolveAutoEvents(
			{ sweetness: 50, curiosity: 0, trust: 75 },
			[],
			autoTestEvents,
		);
		expect(result.map((e) => e.id)).toContain("evt-auto-param");
	});

	it("trust < 70 の parameter イベントはスキップ", () => {
		const result = resolveAutoEvents(
			{ sweetness: 50, curiosity: 0, trust: 60 },
			[],
			autoTestEvents,
		);
		expect(result.map((e) => e.id)).not.toContain("evt-auto-param");
	});

	it("既発火フラグ付き parameter イベントはスキップ", () => {
		const result = resolveAutoEvents(
			{ sweetness: 50, curiosity: 0, trust: 80 },
			["_auto_fired_evt-auto-param"],
			autoTestEvents,
		);
		expect(result.map((e) => e.id)).not.toContain("evt-auto-param");
	});

	it("flag_id が flags に含まれる flag イベントを返す", () => {
		const result = resolveAutoEvents(baseParams, ["some_flag"], autoTestEvents);
		expect(result.map((e) => e.id)).toContain("evt-auto-flag");
	});

	it("フラグがない場合は flag イベントをスキップ", () => {
		const result = resolveAutoEvents(baseParams, [], autoTestEvents);
		expect(result.map((e) => e.id)).not.toContain("evt-auto-flag");
	});

	it("既発火フラグ付き flag イベントはスキップ", () => {
		const result = resolveAutoEvents(
			baseParams,
			["some_flag", "_auto_fired_evt-auto-flag"],
			autoTestEvents,
		);
		expect(result.map((e) => e.id)).not.toContain("evt-auto-flag");
	});

	it("command タイプのイベントは返さない", () => {
		const result = resolveAutoEvents(
			{ sweetness: 50, curiosity: 0, trust: 80 },
			["some_flag"],
			autoTestEvents,
		);
		expect(result.map((e) => e.id)).not.toContain("evt-cmd");
	});
});

const testScenes: Scene[] = [
	{ id: "scene-001", label: "Scene 1", unlock_condition: {} },
	{
		id: "scene-002",
		label: "Scene 2",
		unlock_condition: { flags: ["flag_a"], sweetness: { min: 60 } },
	},
	{
		id: "scene-003",
		label: "Scene 3",
		unlock_condition: { sweetness: { min: 80 } },
	},
];

describe("checkSceneProgression", () => {
	it("条件を満たす次のシーンIDを返す", () => {
		const result = checkSceneProgression(
			"scene-001",
			["flag_a"],
			{ sweetness: 65, curiosity: 0, trust: 50 },
			testScenes,
		);
		expect(result).toBe("scene-002");
	});

	it("条件未充足ではnullを返す", () => {
		expect(
			checkSceneProgression("scene-001", [], baseParams, testScenes),
		).toBeNull();
	});

	it("現在のシーンは対象外（現在より後のみチェック）", () => {
		const result = checkSceneProgression(
			"scene-002",
			["flag_a"],
			{ sweetness: 65, curiosity: 0, trust: 50 },
			testScenes,
		);
		expect(result).toBeNull();
	});

	it("存在しないシーンIDの場合はnullを返す", () => {
		expect(
			checkSceneProgression("scene-999", [], baseParams, testScenes),
		).toBeNull();
	});

	it("scenes が空配列の場合はnullを返す", () => {
		expect(
			checkSceneProgression("scene-001", [], baseParams, []),
		).toBeNull();
	});
});
