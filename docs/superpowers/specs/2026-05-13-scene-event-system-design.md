# シーン遷移・イベントシステム設計

**作成日**: 2026-05-13  
**対象フェーズ**: Phase 1（固定シナリオADV）  
**ステータス**: 承認済み

---

## 1. 概要

現状の `applyCommand` に詰め込まれたイベント処理を分離し、以下の4機能を実装する。

| 機能 | 現状 | 実装後 |
|------|------|--------|
| next_event チェーン | 未実装（全 null） | チェーンイベントをキューで順次再生 |
| parameter/flag 自動トリガー | 未実装 | コマンド後に自動スキャン・発火 |
| シーン遷移 | scene-001 固定 | フラグ/パラメータ条件で自動進行 |
| セーブ起動時復元 | バグ（空になる） | localStorage から初期化 |
| JSON エクスポート/インポート | 未実装 | ダウンロード/ファイル読込 |

---

## 2. アーキテクチャ

```
GameScreen
├── useEventQueue (新規 hook)
│   ├── handleCommand(commandId)  ← CommandPanel から呼ぶ
│   ├── queue: QueuedEvent[]
│   └── isProcessing: boolean
├── CommandPanel [onCommand prop に変更]
└── useGameStore
    ├── applyEvent(event)         ← 1イベントを状態に適用
    ├── checkSceneProgression()   ← シーン進行チェック
    ├── importSaves(slots)        ← 一括インポート
    └── saveSlots 初期化修正
```

---

## 3. useEventQueue

### 3.1 型定義（types/index.ts に追記）

```ts
export interface QueuedEvent {
  event: ScenarioEvent;
  delay: number; // ms（primary: 0, chain: 400）
}

// EventTrigger 型に flag_id を追加（types/index.ts）
// Before: { type: "command" | "parameter" | "flag"; command_id?: string; }
// After:
export interface EventTrigger {
  type: "command" | "parameter" | "flag";
  command_id?: string;
  flag_id?: string;
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

### 3.2 handleCommand パイプライン

```
handleCommand(commandId)
  ①  クールダウン中 / isEnded → return
  ②  resolveEventChain(commandId, params, flags, events)
        → primary event + next_event の連鎖を配列で返す
        → chain イベントは delay: 400ms
  ③  resolveAutoEvents(newParams, newFlags, events)
        → parameter / flag トリガーの自動発火イベントを返す
  ④  checkSceneProgression(newFlags, newParams, scenes)
        → 進行条件を満たしたシーン変更イベントを返す（あれば）
  ⑤  全イベントをキューに push
  ⑥  useEffect でキューをドレイン → applyEvent() 呼び出し
  ⑦  最後のイベント適用後に checkAndApplyEnding()
```

### 3.3 クールダウン制御

- primary イベント発火時点でクールダウン開始（従来通り 3000ms）
- キューが空になる前に次のコマンドは受け付けない（`isProcessing || isCooling` でガード）

---

## 4. scenarioEngine.ts 追加関数

### resolveEventById
```ts
function resolveEventById(id: string, events: ScenarioEvent[]): ScenarioEvent | null
```
`next_event` の ID で直接イベントを引く。

### resolveEventChain
```ts
function resolveEventChain(
  commandId: string,
  params: GameParameters,
  flags: string[],
  events: ScenarioEvent[],
): ScenarioEvent[]
```
- primary を `resolveEvent` で取得
- `next_event !== null` の間、`resolveEventById` で連鎖を最大 5 件まで展開（無限ループ防止）

### resolveAutoEvents
```ts
function resolveAutoEvents(
  params: GameParameters,
  flags: string[],
  events: ScenarioEvent[],
): ScenarioEvent[]
```
- `trigger.type === "parameter"` かつ条件を満たすイベントを返す
- `trigger.type === "flag"` かつ `trigger.flag_id` が `flags` に含まれるイベントを返す
- 再発火防止: `flags` に `_auto_fired_<event_id>` が含まれるイベントはスキップ
  （各 auto イベントの `set_flags` に `"_auto_fired_<id>"` を含めておく）

### checkSceneProgression
```ts
function checkSceneProgression(
  currentScene: string,
  flags: string[],
  params: GameParameters,
  scenes: Scene[],
): string | null  // 次のシーン ID または null
```
- `scenes` を ID 順に並べ、`currentScene` の次以降で条件を満たす最初のシーンを返す

---

## 5. useGameStore 変更点

### applyEvent（新規アクション）
```ts
applyEvent: (event: ScenarioEvent) => void
```
- パラメータ・フラグ・ダイアログを更新
- クールダウンは **設定しない**（useEventQueue が制御）

### applyCommand（既存を変更）
```ts
applyCommand: (commandId: string) => void
// ← useEventQueue が呼ぶ場合は廃止せず互換保持
//    ただし内部は resolveEventChain を呼ぶだけに簡略化
```
後方互換のため残すが、`useEventQueue.handleCommand` が主経路。

### saveSlots 初期化修正
```ts
saveSlots: Array.from({ length: 6 }, (_, i) => {
  const raw = localStorage.getItem(SAVE_KEY(i));
  try { return raw ? (JSON.parse(raw) as SaveSlot) : null; }
  catch { return null; }
}).filter((s): s is SaveSlot => s !== null),
```

### importSaves（新規アクション）
```ts
importSaves: (slots: SaveSlot[]) => void
```
- `saveSlots` を上書き
- 各スロットを localStorage に書き込む

---

## 6. CommandPanel 変更

```tsx
// Before
const applyCommand = useGameStore(s => s.applyCommand);
// After
interface Props { onCommand: (id: string) => void; }
export function CommandPanel({ onCommand }: Props) { ... }
```

`GameScreen` から `useEventQueue().handleCommand` を渡す。

---

## 7. SaveLoadModal 変更

```
既存のセーブ/ロード UI の下に追加:
  [JSON エクスポート]  ← saveSlots を JSON ダウンロード
  [JSON インポート]    ← <input type="file"> でファイル選択 → importSaves()
```

---

## 8. scenarios.json スキーマ変更

`events[]` の既存構造はそのまま。以下を追記:

```json
{
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
        "flags": ["horror_event_done"],
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
  "events": [
    // （既存27件はそのまま残す。以下は追加するサンプルイベント）
    // parameter トリガー例:
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
    },
    // flag トリガー例:
    {
      "id": "evt-auto-horror-comfort",
      "trigger": { "type": "flag", "flag_id": "horror_event_done" },
      "condition": {},
      "emotion": "normal_3",
      "background": "男性一人部屋３（夜・照明ON）.jpg",
      "scene_context": "ホラー配信後の落ち着いたフォロー",
      "fallback_text": "…もう大丈夫、ですよ。ちゃんと終わりましたから。",
      "parameter_delta": { "sweetness": 0, "curiosity": 0, "trust": 5 },
      "set_flags": ["_auto_fired_evt-auto-horror-comfort"],
      "next_event": null
    }
  ]
}
```

---

## 9. 変更ファイル一覧

| ファイル | 変更種別 | 内容 |
|---------|---------|------|
| `src/types/index.ts` | 追記 | `QueuedEvent`, `Scene` 型 |
| `src/engine/scenarioEngine.ts` | 追記 | `resolveEventById`, `resolveEventChain`, `resolveAutoEvents`, `checkSceneProgression` |
| `src/hooks/useEventQueue.ts` | **新規** | イベントキュー Hook |
| `src/store/useGameStore.ts` | 変更 | `applyEvent`, `importSaves`, saveSlots 初期化修正 |
| `src/components/CommandPanel.tsx` | 変更 | `onCommand` prop 化 |
| `src/components/GameScreen.tsx` | 変更 | `useEventQueue` 組み込み |
| `src/components/SaveLoadModal.tsx` | 変更 | エクスポート/インポート UI |
| `src/data/scenarios.json` | 変更 | `scenes[]` 追記、サンプル auto-trigger イベント追加 |

---

## 10. テスト方針

- `scenarioEngine.ts` の新関数は既存の vitest でユニットテスト追加
- `useEventQueue` は `renderHook` でテスト（handleCommand → queue drain → applyEvent 呼び出し確認）
- E2E: セーブ → リロード → ロードでパラメータ復元を確認
