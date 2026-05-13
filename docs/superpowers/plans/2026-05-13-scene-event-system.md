# シーン遷移・イベントシステム Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** イベントキューHookを中心に、next_eventチェーン・parameter/flag自動トリガー・シーン遷移・セーブロード修正・JSONエクスポートを実装する。

**Architecture:** `useEventQueue` hookがコマンド解決・チェーン展開・auto-triggerスキャンを担当し、キューを順次ドレインしながら `useGameStore.applyEvent` を呼ぶ。ストアは1イベントの状態更新のみ行い、`CommandPanel` は `onCommand` プロップ経由でhookと繋がる。シーン進行は `applyEvent` 内で `checkSceneProgression` を呼んで自動更新。

**Tech Stack:** React 19, Zustand 5, TypeScript 6, Vitest 4, @testing-library/react 16, jsdom

---

## ファイル構成

| ファイル | 種別 | 役割 |
|--------|------|------|
| `src/types/index.ts` | 変更 | `EventTrigger` に `flag_id`/`"chain"`追加、`QueuedEvent`・`Scene` 型追加 |
| `src/data/scenarios.json` | 変更 | `scenes[]` 追加、chain/auto-trigger イベント追加 |
| `src/engine/scenarioEngine.ts` | 変更 | `resolveEventById`・`resolveEventChain`・`resolveAutoEvents`・`checkSceneProgression` 追加 |
| `src/engine/scenarioEngine.test.ts` | 変更 | 上記4関数のテスト追加 |
| `src/hooks/useEventQueue.ts` | **新規** | イベントキューhook |
| `src/hooks/useEventQueue.test.ts` | **新規** | hookのテスト |
| `src/store/useGameStore.ts` | 変更 | `applyEvent`・`setCooldownUntil`・`importSaves` 追加、`saveSlots` 初期化修正 |
| `src/store/useGameStore.test.ts` | 変更 | 上記アクションのテスト追加 |
| `src/components/CommandPanel.tsx` | 変更 | `onCommand`/`isProcessing` プロップ化 |
| `src/components/GameScreen.tsx` | 変更 | `useEventQueue` 組み込み |
| `src/components/SaveLoadModal.tsx` | 変更 | JSONエクスポート/インポートUI追加 |

---

## Task 1: 型定義の更新

**Files:**
- Modify: `frontend/src/types/index.ts`

- [ ] **Step 1: EventTrigger に flag_id と "chain" 型を追加**

`src/types/index.ts` の `EventTrigger` インターフェースを以下に置き換える:

```ts
export interface EventTrigger {
  type: "command" | "parameter" | "flag" | "chain";
  command_id?: string;
  flag_id?: string;
}
```

- [ ] **Step 2: QueuedEvent と Scene 型を末尾に追加**

`src/types/index.ts` の末尾（`export type TextSpeed = ...` の後）に追記:

```ts
export interface QueuedEvent {
  event: ScenarioEvent;
  delay: number; // ms（primary: 0, chain/auto: 400）
}

export interface Scene {
  id: string;
  label: string;
  unlock_condition: {
    flags?: string[];
    sweetness?: ParameterCondition;
    curiosity?: ParameterCondition;
    trust?: ParameterCondition;
  };
}
```

- [ ] **Step 3: TypeScript コンパイル確認**

```bash
cd frontend && npx tsc --noEmit
```

Expected: エラーなし（既存エラーがあればそのまま通過）

- [ ] **Step 4: Commit**

```bash
git add frontend/src/types/index.ts
git commit -m "feat: add QueuedEvent, Scene types; expand EventTrigger with flag_id and chain"
```

---

## Task 2: scenarios.json データ更新

**Files:**
- Modify: `frontend/src/data/scenarios.json`

- [ ] **Step 1: ルートに `scenes[]` を追加**

`scenarios.json` のトップレベルに `scenes` キーを追加（`"events"` キーの直前）:

```json
"scenes": [
  {
    "id": "scene-001",
    "label": "深夜の内緒話",
    "unlock_condition": {}
  },
  {
    "id": "scene-002",
    "label": "距離が縮まる",
    "unlock_condition": {
      "flags": ["comfort_offered"],
      "sweetness": { "min": 60 }
    }
  },
  {
    "id": "scene-003",
    "label": "二人だけの時間",
    "unlock_condition": {
      "sweetness": { "min": 75 },
      "trust": { "min": 70 }
    }
  }
],
```

- [ ] **Step 2: evt-support-001 の set_flags にフラグを追加**

`evt-support-001`（「疲れてるなら休もうか」）の `"set_flags": []` を以下に変更:

```json
"set_flags": ["comfort_offered"]
```

- [ ] **Step 3: evt-touch-003 に next_event を設定**

`evt-touch-003`（「頭撫でていい？」高親愛度版）の `"next_event": null` を以下に変更:

```json
"next_event": "evt-touch-003-reaction"
```

- [ ] **Step 4: chain イベントを events 末尾に追加**

```json
{
  "id": "evt-touch-003-reaction",
  "trigger": { "type": "chain" },
  "condition": {},
  "scene_context": "頭を撫でられた後の恥ずかしい反応",
  "emotion": "embarrassed_2",
  "background": "男性一人部屋３（夜・照明ON）.jpg",
  "fallback_text": "…べ、別になでてもらいたかったわけじゃないですし。ちょっと温かいだけです。",
  "parameter_delta": { "sweetness": 3, "curiosity": 0, "trust": 3 },
  "set_flags": [],
  "next_event": null
}
```

- [ ] **Step 5: parameter トリガーイベントを events 末尾に追加**

```json
{
  "id": "evt-auto-trust-high",
  "trigger": { "type": "parameter" },
  "condition": { "trust": { "min": 70 } },
  "emotion": "happy_2",
  "background": "男性一人部屋３（夜・照明ON）.jpg",
  "scene_context": "安心感が高まり、素直な気持ちが出る",
  "fallback_text": "…なんか、ここにいると、楽になれる気がします。",
  "parameter_delta": { "sweetness": 2, "curiosity": 0, "trust": 0 },
  "set_flags": ["_auto_fired_evt-auto-trust-high"],
  "next_event": null
}
```

- [ ] **Step 6: flag トリガーイベントを events 末尾に追加**

```json
{
  "id": "evt-auto-comfort-offered",
  "trigger": { "type": "flag", "flag_id": "comfort_offered" },
  "condition": {},
  "emotion": "normal_2",
  "background": "男性一人部屋３（夜・照明ON）.jpg",
  "scene_context": "休息を勧めてくれた後の呟き",
  "fallback_text": "…ありがとう。なんか、そういう言葉、久しぶりに聞いた気がします。",
  "parameter_delta": { "sweetness": 3, "curiosity": 0, "trust": 5 },
  "set_flags": ["_auto_fired_evt-auto-comfort-offered"],
  "next_event": null
}
```

- [ ] **Step 7: JSON 構文確認**

```bash
cd frontend && node -e "const d = require('./src/data/scenarios.json'); console.log('scenes:', d.scenes.length, 'events:', d.events.length)"
```

Expected: `scenes: 3 events: 30`

- [ ] **Step 8: Commit**

```bash
git add frontend/src/data/scenarios.json
git commit -m "feat: add scenes[], chain reaction, auto-trigger events to scenarios.json"
```

---

## Task 3: scenarioEngine.ts 新関数追加（TDD）

**Files:**
- Modify: `frontend/src/engine/scenarioEngine.ts`
- Modify: `frontend/src/engine/scenarioEngine.test.ts`

- [ ] **Step 1: テストに import を追記**

`scenarioEngine.test.ts` の先頭 import を以下に更新:

```ts
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
```

- [ ] **Step 2: resolveEventById のテストを追記**

`scenarioEngine.test.ts` 末尾に追加:

```ts
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
    expect(result.length).toBeLessThanOrEqual(6); // primary(1) + chain(5) 上限
  });
});

const autoEvents: ScenarioEvent[] = [
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
      autoEvents,
    );
    expect(result.map((e) => e.id)).toContain("evt-auto-param");
  });

  it("trust < 70 の parameter イベントはスキップ", () => {
    const result = resolveAutoEvents(
      { sweetness: 50, curiosity: 0, trust: 60 },
      [],
      autoEvents,
    );
    expect(result.map((e) => e.id)).not.toContain("evt-auto-param");
  });

  it("既発火フラグ付き parameter イベントはスキップ", () => {
    const result = resolveAutoEvents(
      { sweetness: 50, curiosity: 0, trust: 80 },
      ["_auto_fired_evt-auto-param"],
      autoEvents,
    );
    expect(result.map((e) => e.id)).not.toContain("evt-auto-param");
  });

  it("flag_id が flags に含まれる flag イベントを返す", () => {
    const result = resolveAutoEvents(baseParams, ["some_flag"], autoEvents);
    expect(result.map((e) => e.id)).toContain("evt-auto-flag");
  });

  it("フラグがない場合は flag イベントをスキップ", () => {
    const result = resolveAutoEvents(baseParams, [], autoEvents);
    expect(result.map((e) => e.id)).not.toContain("evt-auto-flag");
  });

  it("既発火フラグ付き flag イベントはスキップ", () => {
    const result = resolveAutoEvents(
      baseParams,
      ["some_flag", "_auto_fired_evt-auto-flag"],
      autoEvents,
    );
    expect(result.map((e) => e.id)).not.toContain("evt-auto-flag");
  });

  it("command タイプのイベントは返さない", () => {
    const result = resolveAutoEvents(
      { sweetness: 50, curiosity: 0, trust: 80 },
      ["some_flag"],
      autoEvents,
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
    // scene-002 の条件は満たすが現在のシーンなのでスキップ
    // scene-003 は sweetness >= 80 未達
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
```

- [ ] **Step 3: テストが失敗することを確認**

```bash
cd frontend && npm test -- src/engine/scenarioEngine.test.ts --reporter=verbose 2>&1 | tail -15
```

Expected: `resolveEventById is not a function` などで FAIL

- [ ] **Step 4: scenarioEngine.ts に実装を追加**

`src/engine/scenarioEngine.ts` のインポートを更新:

```ts
import type {
  GameParameters,
  ScenarioEvent,
  Ending,
  Character,
  ParameterCondition,
  Scene,
} from "../types";
```

既存の `export function resolveSpritePath` の直前に追加:

```ts
export function resolveEventById(
  id: string,
  events: ScenarioEvent[],
): ScenarioEvent | null {
  return events.find((e) => e.id === id) ?? null;
}

export function resolveEventChain(
  commandId: string,
  params: GameParameters,
  flags: string[],
  events: ScenarioEvent[],
): ScenarioEvent[] {
  const primary = resolveEvent(commandId, params, flags, events);
  if (!primary) return [];

  const chain: ScenarioEvent[] = [primary];
  let current = primary;
  let depth = 0;

  while (current.next_event !== null && depth < 5) {
    const next = resolveEventById(current.next_event, events);
    if (!next) break;
    chain.push(next);
    current = next;
    depth++;
  }

  return chain;
}

export function resolveAutoEvents(
  params: GameParameters,
  flags: string[],
  events: ScenarioEvent[],
): ScenarioEvent[] {
  return events.filter((evt) => {
    if (evt.trigger.type === "parameter") {
      if (flags.includes(`_auto_fired_${evt.id}`)) return false;
      const { condition } = evt;
      if (condition.sweetness && !meetsCondition(params.sweetness, condition.sweetness)) return false;
      if (condition.curiosity && !meetsCondition(params.curiosity, condition.curiosity)) return false;
      if (condition.trust && !meetsCondition(params.trust, condition.trust)) return false;
      return true;
    }
    if (evt.trigger.type === "flag") {
      if (!evt.trigger.flag_id) return false;
      if (flags.includes(`_auto_fired_${evt.id}`)) return false;
      return flags.includes(evt.trigger.flag_id);
    }
    return false;
  });
}

export function checkSceneProgression(
  currentScene: string,
  flags: string[],
  params: GameParameters,
  scenes: Scene[],
): string | null {
  if (scenes.length === 0) return null;
  const sorted = [...scenes].sort((a, b) => a.id.localeCompare(b.id));
  const currentIndex = sorted.findIndex((s) => s.id === currentScene);
  if (currentIndex === -1) return null;

  for (let i = currentIndex + 1; i < sorted.length; i++) {
    const { unlock_condition: cond } = sorted[i];
    if (cond.flags?.length && !cond.flags.every((f) => flags.includes(f))) continue;
    if (cond.sweetness && !meetsCondition(params.sweetness, cond.sweetness)) continue;
    if (cond.curiosity && !meetsCondition(params.curiosity, cond.curiosity)) continue;
    if (cond.trust && !meetsCondition(params.trust, cond.trust)) continue;
    return sorted[i].id;
  }
  return null;
}
```

- [ ] **Step 5: テストが通ることを確認**

```bash
cd frontend && npm test -- src/engine/scenarioEngine.test.ts --reporter=verbose
```

Expected: 全テスト PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/src/engine/scenarioEngine.ts frontend/src/engine/scenarioEngine.test.ts
git commit -m "feat: add resolveEventChain, resolveAutoEvents, checkSceneProgression to scenarioEngine"
```

---

## Task 4: useGameStore 変更（TDD）

**Files:**
- Modify: `frontend/src/store/useGameStore.ts`
- Modify: `frontend/src/store/useGameStore.test.ts`

- [ ] **Step 1: テストに import を追記**

`useGameStore.test.ts` の先頭 import を更新:

```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { useGameStore } from "./useGameStore";
import type { ScenarioEvent, SaveSlot } from "../types";
```

- [ ] **Step 2: applyEvent のテストを追記**

```ts
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
```

- [ ] **Step 3: setCooldownUntil のテストを追記**

```ts
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
```

- [ ] **Step 4: importSaves のテストを追記**

```ts
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
```

- [ ] **Step 5: テストが失敗することを確認**

```bash
cd frontend && npm test -- src/store/useGameStore.test.ts --reporter=verbose 2>&1 | tail -20
```

Expected: `applyEvent`・`setCooldownUntil`・`importSaves` 関連テストが FAIL

- [ ] **Step 6: useGameStore.ts を更新**

**6a. インポートを更新**（ファイル先頭の import 群を以下に置き換え）:

```ts
import { create } from "zustand";
import type {
  GameState,
  GameParameters,
  CurrentDialog,
  SaveSlot,
  DisplayMode,
  TextSpeed,
  ScenarioEvent,
  Scene,
} from "../types";
import scenariosData from "../data/scenarios.json";
import endingsData from "../data/endings.json";
import charactersData from "../data/characters.json";
import {
  resolveEvent,
  checkEnding,
  clampParam,
  checkSceneProgression,
} from "../engine/scenarioEngine";
```

**6b. `GameStore` インターフェースに3つのアクションを追加**:

```ts
interface GameStore extends GameState {
  applyCommand: (commandId: string) => void;
  applyEvent: (event: ScenarioEvent) => void;
  setCooldownUntil: (until: number) => void;
  checkAndApplyEnding: () => void;
  saveGame: (slot: number) => void;
  loadGame: (slot: number) => boolean;
  resetGame: () => void;
  isCoolingDown: () => boolean;
  importSaves: (slots: SaveSlot[]) => void;
  setDisplayMode: (mode: DisplayMode) => void;
  setTextSpeed: (speed: TextSpeed) => void;
  setBgmVolume: (vol: number) => void;
  setSeVolume: (vol: number) => void;
}
```

**6c. `saveSlots` の初期値を修正**（`create<GameStore>` 内の初期状態 `saveSlots: []` を置き換え）:

```ts
saveSlots: Array.from({ length: 6 }, (_, i) => {
  const raw = localStorage.getItem(SAVE_KEY(i));
  try {
    return raw ? (JSON.parse(raw) as SaveSlot) : null;
  } catch {
    return null;
  }
}).filter((s): s is SaveSlot => s !== null),
```

**6d. `applyEvent` アクションを追加**（`applyCommand` の直後に追加）:

```ts
applyEvent: (event) => {
  const state = get();
  const character = charactersData.characters[0];

  const newParams: GameParameters = {
    sweetness: clampParam(state.params.sweetness + event.parameter_delta.sweetness),
    curiosity: clampParam(state.params.curiosity + event.parameter_delta.curiosity),
    trust: clampParam(state.params.trust + event.parameter_delta.trust),
  };
  const newFlags = [...new Set([...state.flags, ...event.set_flags])];
  const dialog: CurrentDialog = {
    text: event.fallback_text,
    speaker: character.name,
    emotion: event.emotion,
    background: event.background,
  };

  type ScenariosJson = { scenes?: Scene[]; events: ScenarioEvent[] };
  const scenes = (scenariosData as unknown as ScenariosJson).scenes ?? [];
  const newScene =
    scenes.length > 0
      ? checkSceneProgression(state.currentScene, newFlags, newParams, scenes)
      : null;

  set({
    params: newParams,
    flags: newFlags,
    currentDialog: dialog,
    ...(newScene ? { currentScene: newScene } : {}),
  });
},
```

**6e. `setCooldownUntil` アクションを追加**:

```ts
setCooldownUntil: (until) => set({ cooldownUntil: until }),
```

**6f. `importSaves` アクションを追加**:

```ts
importSaves: (slots) => {
  for (const slot of slots) {
    localStorage.setItem(SAVE_KEY(slot.slot), JSON.stringify(slot));
  }
  set({ saveSlots: slots });
},
```

**6g. `applyCommand` を `applyEvent` に委譲するよう簡略化**（既存の `applyCommand` を置き換え）:

```ts
applyCommand: (commandId) => {
  const state = get();
  if (state.isEnded || state.isCoolingDown()) return;

  const event = resolveEvent(
    commandId,
    state.params,
    state.flags,
    scenariosData.events as Parameters<typeof resolveEvent>[3],
  );
  if (!event) return;

  get().applyEvent(event);
  set({ cooldownUntil: Date.now() + COOLDOWN_MS });
  get().checkAndApplyEnding();
},
```

- [ ] **Step 7: テストが通ることを確認**

```bash
cd frontend && npm test -- src/store/useGameStore.test.ts --reporter=verbose
```

Expected: 全テスト PASS

- [ ] **Step 8: Commit**

```bash
git add frontend/src/store/useGameStore.ts frontend/src/store/useGameStore.test.ts
git commit -m "feat: add applyEvent, setCooldownUntil, importSaves; fix saveSlots init from localStorage"
```

---

## Task 5: useEventQueue フック作成

**Files:**
- Create: `frontend/src/hooks/useEventQueue.ts`
- Create: `frontend/src/hooks/useEventQueue.test.ts`

- [ ] **Step 1: `src/hooks/` ディレクトリ作成**

```bash
mkdir -p frontend/src/hooks
```

- [ ] **Step 2: テストファイルを作成**

`frontend/src/hooks/useEventQueue.test.ts`:

```ts
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
```

- [ ] **Step 3: テストが失敗することを確認**

```bash
cd frontend && npm test -- src/hooks/useEventQueue.test.ts --reporter=verbose 2>&1 | tail -10
```

Expected: `useEventQueue` not found で FAIL

- [ ] **Step 4: useEventQueue.ts を実装**

`frontend/src/hooks/useEventQueue.ts`:

```ts
import { useState, useEffect, useCallback } from "react";
import { useGameStore } from "../store/useGameStore";
import { resolveEventChain, resolveAutoEvents } from "../engine/scenarioEngine";
import type { QueuedEvent, ScenarioEvent, Scene } from "../types";
import scenariosData from "../data/scenarios.json";

const CHAIN_DELAY_MS = 400;
const COOLDOWN_MS = 3000;

type ScenariosJson = { scenes?: Scene[]; events: ScenarioEvent[] };

interface EventQueueResult {
  handleCommand: (commandId: string) => void;
  isProcessing: boolean;
}

export function useEventQueue(): EventQueueResult {
  const [queue, setQueue] = useState<QueuedEvent[]>([]);

  const applyEvent = useGameStore((s) => s.applyEvent);
  const checkAndApplyEnding = useGameStore((s) => s.checkAndApplyEnding);
  const setCooldownUntil = useGameStore((s) => s.setCooldownUntil);

  const handleCommand = useCallback(
    (commandId: string) => {
      const state = useGameStore.getState();
      if (state.isEnded || state.isCoolingDown() || queue.length > 0) return;

      const events = (scenariosData as ScenariosJson).events as ScenarioEvent[];
      const chain = resolveEventChain(commandId, state.params, state.flags, events);
      if (chain.length === 0) return;

      // chain 適用後の状態を仮計算（auto-trigger の判定に使用）
      const chainFlags = [
        ...new Set([...state.flags, ...chain.flatMap((e) => e.set_flags)]),
      ];
      const chainParams = chain.reduce(
        (acc, evt) => ({
          sweetness: Math.min(100, Math.max(0, acc.sweetness + evt.parameter_delta.sweetness)),
          curiosity: Math.min(100, Math.max(0, acc.curiosity + evt.parameter_delta.curiosity)),
          trust: Math.min(100, Math.max(0, acc.trust + evt.parameter_delta.trust)),
        }),
        state.params,
      );

      const autoEvents = resolveAutoEvents(chainParams, chainFlags, events);

      const queued: QueuedEvent[] = [
        { event: chain[0], delay: 0 },
        ...chain.slice(1).map((e) => ({ event: e, delay: CHAIN_DELAY_MS })),
        ...autoEvents.map((e) => ({ event: e, delay: CHAIN_DELAY_MS })),
      ];

      setCooldownUntil(Date.now() + COOLDOWN_MS);
      setQueue(queued);
    },
    [queue.length, setCooldownUntil],
  );

  useEffect(() => {
    if (queue.length === 0) return;

    const [next, ...rest] = queue;
    const timer = setTimeout(() => {
      applyEvent(next.event);
      if (rest.length === 0) {
        checkAndApplyEnding();
      }
      setQueue(rest);
    }, next.delay);

    return () => clearTimeout(timer);
  }, [queue, applyEvent, checkAndApplyEnding]);

  return { handleCommand, isProcessing: queue.length > 0 };
}
```

- [ ] **Step 5: テストが通ることを確認**

```bash
cd frontend && npm test -- src/hooks/useEventQueue.test.ts --reporter=verbose
```

Expected: 全テスト PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/src/hooks/useEventQueue.ts frontend/src/hooks/useEventQueue.test.ts
git commit -m "feat: add useEventQueue hook with chain/auto-trigger event support"
```

---

## Task 6: CommandPanel を onCommand プロップ化

**Files:**
- Modify: `frontend/src/components/CommandPanel.tsx`

- [ ] **Step 1: Props インターフェースを追加し store 直参照を削除**

`CommandPanel.tsx` の先頭部分を以下に変更:

**変更前:**
```tsx
export function CommandPanel() {
  const applyCommand = useGameStore((s) => s.applyCommand);
  const cooldownUntil = useGameStore((s) => s.cooldownUntil);
```

**変更後:**
```tsx
interface Props {
  onCommand: (id: string) => void;
  isProcessing: boolean;
}

export function CommandPanel({ onCommand, isProcessing }: Props) {
  const cooldownUntil = useGameStore((s) => s.cooldownUntil);
```

- [ ] **Step 2: isCooling 判定に isProcessing を加える**

```tsx
// 変更前
const isCooling = remaining > 0;
// 変更後
const isCooling = remaining > 0 || isProcessing;
```

- [ ] **Step 3: onSelect に applyCommand の代わりに onCommand を渡す**

`CommandPanel` 本体 JSX 内の2箇所を変更:

```tsx
// デスクトップ版（CommandGroup）
<CommandGroup
  ...
  onSelect={onCommand}   // applyCommand → onCommand
  ...
/>

// モバイル版（MobileCategoryButton）
<MobileCategoryButton
  ...
  onSelect={onCommand}   // applyCommand → onCommand
  ...
/>
```

- [ ] **Step 4: TypeScript 確認（GameScreen.tsx でエラーが出ることを確認）**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep CommandPanel
```

Expected: `CommandPanel` への `onCommand`/`isProcessing` prop が不足している旨のエラー

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/CommandPanel.tsx
git commit -m "refactor: CommandPanel accepts onCommand/isProcessing props"
```

---

## Task 7: GameScreen に useEventQueue を組み込む

**Files:**
- Modify: `frontend/src/components/GameScreen.tsx`

- [ ] **Step 1: GameScreen.tsx を更新**

**変更前:**
```tsx
import { useState } from "react";
import { StatusBar } from "./StatusBar";
import { SceneView } from "./SceneView";
import { CommandPanel } from "./CommandPanel";
import { SaveLoadModal } from "./SaveLoadModal";
import { MenuModal } from "./MenuModal";
import { EndingScreen } from "./EndingScreen";
import { useGameStore } from "../store/useGameStore";

export function GameScreen() {
  const [showSave, setShowSave] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const isEnded = useGameStore((s) => s.isEnded);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0d0d1a] overflow-hidden">
      <StatusBar
        onSave={() => setShowSave(true)}
        onMenu={() => setShowMenu(true)}
      />
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        <SceneView />
        <CommandPanel />
      </div>
      {isEnded && <EndingScreen />}
      {showSave && <SaveLoadModal onClose={() => setShowSave(false)} />}
      {showMenu && <MenuModal onClose={() => setShowMenu(false)} />}
    </div>
  );
}
```

**変更後:**
```tsx
import { useState } from "react";
import { StatusBar } from "./StatusBar";
import { SceneView } from "./SceneView";
import { CommandPanel } from "./CommandPanel";
import { SaveLoadModal } from "./SaveLoadModal";
import { MenuModal } from "./MenuModal";
import { EndingScreen } from "./EndingScreen";
import { useGameStore } from "../store/useGameStore";
import { useEventQueue } from "../hooks/useEventQueue";

export function GameScreen() {
  const [showSave, setShowSave] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const isEnded = useGameStore((s) => s.isEnded);
  const { handleCommand, isProcessing } = useEventQueue();

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0d0d1a] overflow-hidden">
      <StatusBar
        onSave={() => setShowSave(true)}
        onMenu={() => setShowMenu(true)}
      />
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        <SceneView />
        <CommandPanel onCommand={handleCommand} isProcessing={isProcessing} />
      </div>
      {isEnded && <EndingScreen />}
      {showSave && <SaveLoadModal onClose={() => setShowSave(false)} />}
      {showMenu && <MenuModal onClose={() => setShowMenu(false)} />}
    </div>
  );
}
```

- [ ] **Step 2: TypeScript 確認**

```bash
cd frontend && npx tsc --noEmit
```

Expected: エラーなし

- [ ] **Step 3: 開発サーバーで動作確認**

```bash
cd frontend && npm run dev
```

ブラウザで `http://localhost:5173/llm_game/` を開いて確認:
1. コマンドクリック → ダイアログ更新・クールダウン開始
2. 「疲れてるなら休もうか」を選択 → 通常セリフ後、400ms後に自動で「ありがとう。なんか…」が表示される（comfort_offered flag trigger）
3. 「頭撫でていい？」（親愛度55以上で）→ セリフ後 400ms で「べ、別に…」が続く
4. ブラウザコンソールにエラーなし

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/GameScreen.tsx
git commit -m "feat: wire useEventQueue into GameScreen, CommandPanel uses onCommand prop"
```

---

## Task 8: SaveLoadModal にエクスポート/インポート UI 追加

**Files:**
- Modify: `frontend/src/components/SaveLoadModal.tsx`

- [ ] **Step 1: SaveLoadModal.tsx を更新**

`src/components/SaveLoadModal.tsx` の `SaveLoadModal` コンポーネント全体を以下に置き換える（既存のセーブ/ロードスロット部分は保持）:

```tsx
import { useRef } from "react";
import { useGameStore } from "../store/useGameStore";

const SLOT_COUNT = 6;

interface Props {
  onClose: () => void;
}

export function SaveLoadModal({ onClose }: Props) {
  const saveGame = useGameStore((s) => s.saveGame);
  const loadGame = useGameStore((s) => s.loadGame);
  const saveSlots = useGameStore((s) => s.saveSlots);
  const resetGame = useGameStore((s) => s.resetGame);
  const importSaves = useGameStore((s) => s.importSaves);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function getSlot(slot: number) {
    return saveSlots.find((s) => s.slot === slot) ?? null;
  }

  function handleLoad(slot: number) {
    const ok = loadGame(slot);
    if (ok) onClose();
  }

  function handleReset() {
    if (confirm("ゲームをリセットしますか？")) {
      resetGame();
      onClose();
    }
  }

  function handleExport() {
    const slots = useGameStore.getState().saveSlots;
    const json = JSON.stringify(slots, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mssp_saves_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const slots = JSON.parse(ev.target?.result as string);
        if (!Array.isArray(slots)) throw new Error("invalid format");
        importSaves(slots);
        alert("インポートしました");
        onClose();
      } catch {
        alert("ファイルの形式が正しくありません");
      }
    };
    reader.readAsText(file);
    // input をリセット（同じファイルを再選択できるよう）
    e.target.value = "";
  }

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#0d0d1a] border border-purple-500/30 rounded-xl p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-purple-300 font-semibold tracking-wide">
            SAVE / LOAD
          </h2>
          <button
            onClick={onClose}
            className="text-purple-500/60 hover:text-purple-300 text-sm"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          {Array.from({ length: SLOT_COUNT }, (_, i) => i).map((slot) => {
            const data = getSlot(slot);
            return (
              <div
                key={slot}
                className="border border-purple-500/20 rounded-lg p-3 bg-purple-500/5"
              >
                <p className="text-[10px] text-purple-400/60 mb-1">
                  SLOT {slot + 1}
                </p>
                {data ? (
                  <>
                    <p className="text-[10px] text-purple-200/70 mb-2 truncate">
                      {new Date(data.timestamp).toLocaleString("ja-JP", {
                        month: "numeric",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    <p className="text-[9px] text-purple-300/50 mb-2">
                      ♥{data.params.sweetness} ✦{data.params.curiosity} 🛡
                      {data.params.trust}
                    </p>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => saveGame(slot)}
                        className="flex-1 text-[10px] py-1 rounded border border-purple-500/30 text-purple-300 hover:bg-purple-500/15"
                      >
                        上書き
                      </button>
                      <button
                        onClick={() => handleLoad(slot)}
                        className="flex-1 text-[10px] py-1 rounded border border-blue-400/30 text-blue-300 hover:bg-blue-400/15"
                      >
                        ロード
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    onClick={() => saveGame(slot)}
                    className="w-full text-[10px] py-1 rounded border border-purple-500/20 text-purple-400/50 hover:text-purple-300 hover:border-purple-500/40"
                  >
                    セーブ
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <button
          onClick={handleReset}
          className="w-full text-xs py-2 rounded border border-red-500/30 text-red-400/70 hover:bg-red-500/10 hover:text-red-300"
        >
          ゲームをリセット
        </button>

        <div className="flex gap-2 mt-2">
          <button
            onClick={handleExport}
            className="flex-1 text-xs py-2 rounded border border-green-500/30 text-green-400/70 hover:bg-green-500/10 hover:text-green-300"
          >
            JSON 書き出し
          </button>
          <label className="flex-1 text-xs py-2 rounded border border-yellow-500/30 text-yellow-400/70 hover:bg-yellow-500/10 hover:text-yellow-300 text-center cursor-pointer">
            JSON 読み込み
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImport}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: TypeScript 確認**

```bash
cd frontend && npx tsc --noEmit
```

Expected: エラーなし

- [ ] **Step 3: 動作確認**

ブラウザで確認:
1. SAVE ボタン → スロット 1 に保存 → 「JSON 書き出し」→ ファイルがダウンロードされる
2. ゲームリセット → 「JSON 読み込み」→ ダウンロードしたファイルを選択 → スロットが復元・モーダルが閉じる
3. ページリロード → SaveLoadModal を開く → スロットが空でない（起動時復元が動作している）

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/SaveLoadModal.tsx
git commit -m "feat: add JSON export/import to SaveLoadModal"
```

---

## Task 9: 全テスト確認・最終検証

- [ ] **Step 1: 全テスト実行**

```bash
cd frontend && npm test -- --reporter=verbose
```

Expected: 全テスト PASS（新規テストを含む）

- [ ] **Step 2: chain イベント確認**

ブラウザで親愛度 55 以上の状態で「頭撫でていい？」を選択 → 最初のセリフ → 400ms 後に「べ、別になでてもらいたかったわけじゃ…」が自動表示される

- [ ] **Step 3: auto-trigger（parameter）確認**

サポート系コマンドを繰り返して trust を 70 以上に上げる → 「ここにいると、楽になれる気がします」が自動表示される（1回のみ）

- [ ] **Step 4: auto-trigger（flag）確認**

「疲れてるなら休もうか」を選択 → 主セリフの後 400ms で「ありがとう。なんか…」が自動表示される（1回のみ）

- [ ] **Step 5: シーン遷移確認**

「疲れてるなら休もうか」選択 + sweetness ≥ 60 の状態で DevTools（React DevTools 等）または `useGameStore.getState().currentScene` をコンソールで確認 → `"scene-002"` に変わっている

- [ ] **Step 6: セーブ/ロード確認**

セーブ → ページリロード → SaveLoadModal 開く → スロットが空でない

- [ ] **Step 7: 最終 Commit**

```bash
cd frontend && npm test
git add -A
git commit -m "feat: scene transition and event queue system complete"
```
