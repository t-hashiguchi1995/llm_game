# Menu Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PC版立ち絵崩れを修正し、MENUボタンから表示モード切替・テキスト速度・BGM/SE音量・セーブ/ロードが設定できるMenuModalを追加する。

**Architecture:** `useGameStore` に `displayMode` / `textSpeed` / `bgmVolume` / `seVolume` を追加し、新設 `MenuModal` コンポーネントから操作する。`CommandPanel` は `displayMode` を参照して PC/スマホレイアウトを強制切替する。立ち絵は `max-h-[85%]` で制限してPC崩れを防ぐ。

**Tech Stack:** React, TypeScript, Zustand, Tailwind CSS, Vitest

---

## ファイル構成

| 操作 | ファイル | 変更内容 |
|------|---------|---------|
| Modify | `src/types/index.ts` | `DisplayMode` / `TextSpeed` 型と `GameState` へのフィールド追加 |
| Modify | `src/store/useGameStore.ts` | `displayMode` / `textSpeed` / `bgmVolume` / `seVolume` の状態と setter 追加 |
| Modify | `src/components/CharacterSprite.tsx` | `h-full` → `max-h-[85%]` に変更 |
| Create | `src/components/MenuModal.tsx` | MENUモーダル（表示モード・速度・音量・セーブ/ロード） |
| Modify | `src/components/StatusBar.tsx` | `onMenu` プロップをそのまま使用（配線は GameScreen 側で変更） |
| Modify | `src/components/GameScreen.tsx` | `showMenu` 状態追加・MenuModal を配線 |
| Modify | `src/components/CommandPanel.tsx` | `displayMode` を store から読んでレイアウト切替 |

---

### Task 1: 型定義とストア拡張（TDD）

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/store/useGameStore.ts`
- Create: `src/store/useGameStore.test.ts`

- [ ] **Step 1: `types/index.ts` に型を追加する**

`GameState` インターフェースの末尾に以下を追加する:

```typescript
// types/index.ts の末尾に追加
export type DisplayMode = "auto" | "pc" | "mobile";
export type TextSpeed = "slow" | "normal" | "fast";
```

また `GameState` インターフェースに以下4フィールドを追加する:

```typescript
export interface GameState {
  // ...既存フィールドはそのまま...
  displayMode: DisplayMode;
  textSpeed: TextSpeed;
  bgmVolume: number;   // 0〜100
  seVolume: number;    // 0〜100
}
```

- [ ] **Step 2: ストアのテストを先に書く（TDD）**

`frontend/src/store/useGameStore.test.ts` を新規作成:

```typescript
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
```

- [ ] **Step 3: テストが失敗することを確認する**

```bash
cd frontend && npm test -- --run useGameStore
```

Expected: FAIL（`setDisplayMode` などがまだ存在しない）

- [ ] **Step 4: `useGameStore.ts` にデフォルト値とsetterを追加する**

`INITIAL_STATE` に以下を追加:

```typescript
const INITIAL_STATE: Omit<GameState, "saveSlots"> = {
  // ...既存フィールドはそのまま...
  displayMode: "auto",
  textSpeed: "normal",
  bgmVolume: 80,
  seVolume: 80,
};
```

`GameStore` インターフェースに setter を追加:

```typescript
interface GameStore extends GameState {
  // ...既存メソッドはそのまま...
  setDisplayMode: (mode: DisplayMode) => void;
  setTextSpeed: (speed: TextSpeed) => void;
  setBgmVolume: (vol: number) => void;
  setSeVolume: (vol: number) => void;
}
```

`create` の中に実装を追加:

```typescript
setDisplayMode: (mode) => set({ displayMode: mode }),
setTextSpeed: (speed) => set({ textSpeed: speed }),
setBgmVolume: (vol) => set({ bgmVolume: Math.min(100, Math.max(0, vol)) }),
setSeVolume: (vol) => set({ seVolume: Math.min(100, Math.max(0, vol)) }),
```

- [ ] **Step 5: テストがパスすることを確認する**

```bash
cd frontend && npm test -- --run useGameStore
```

Expected: 全テスト PASS

- [ ] **Step 6: TS エラーがないことを確認する**

```bash
cd frontend && npx tsc --noEmit
```

Expected: エラーなし（または型追加に無関係な既存エラーのみ）

- [ ] **Step 7: コミット**

```bash
git add frontend/src/types/index.ts frontend/src/store/useGameStore.ts frontend/src/store/useGameStore.test.ts
git commit -m "feat: add displayMode/textSpeed/volume to store"
```

---

### Task 2: CharacterSprite のPC崩れ修正

**Files:**
- Modify: `frontend/src/components/CharacterSprite.tsx`

- [ ] **Step 1: テストを書く（ビジュアル回帰は手動確認）**

`CharacterSprite` はUIコンポーネントのため自動テスト不要。手動確認手順:
- `npm run dev` でゲームを起動
- ブラウザ幅を1280px以上（PC想定）に広げる
- 立ち絵が画面の85%以下に収まっていることを目視確認

- [ ] **Step 2: `h-full` を `max-h-[85%]` に変更する**

`CharacterSprite.tsx` の `img` タグの className を以下に変更:

```tsx
className="max-h-[85%] w-auto object-contain drop-shadow-2xl select-none"
```

変更前: `className="h-full w-auto object-contain drop-shadow-2xl select-none"`

- [ ] **Step 3: 開発サーバーで目視確認する**

```bash
cd frontend && npm run dev
```

- PC幅（1280px+）: 立ち絵が大きすぎず適切なサイズで表示される
- スマホ幅（375px）: 立ち絵が正常に表示される

- [ ] **Step 4: コミット**

```bash
git add frontend/src/components/CharacterSprite.tsx
git commit -m "fix: PC版立ち絵の高さをmax-h-[85%]で制限"
```

---

### Task 3: MenuModal コンポーネント新設

**Files:**
- Create: `frontend/src/components/MenuModal.tsx`

- [ ] **Step 1: `MenuModal.tsx` を作成する**

```tsx
import { useState } from "react";
import { useGameStore } from "../store/useGameStore";
import type { DisplayMode, TextSpeed } from "../types";
import { SaveLoadModal } from "./SaveLoadModal";

interface Props {
  onClose: () => void;
}

export function MenuModal({ onClose }: Props) {
  const displayMode = useGameStore((s) => s.displayMode);
  const textSpeed = useGameStore((s) => s.textSpeed);
  const bgmVolume = useGameStore((s) => s.bgmVolume);
  const seVolume = useGameStore((s) => s.seVolume);
  const setDisplayMode = useGameStore((s) => s.setDisplayMode);
  const setTextSpeed = useGameStore((s) => s.setTextSpeed);
  const setBgmVolume = useGameStore((s) => s.setBgmVolume);
  const setSeVolume = useGameStore((s) => s.setSeVolume);
  const [showSaveLoad, setShowSaveLoad] = useState(false);

  if (showSaveLoad) {
    return <SaveLoadModal onClose={() => setShowSaveLoad(false)} />;
  }

  return (
    <div
      className="fixed inset-0 bg-black/85 flex items-center justify-center z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#0d0d1a] border border-purple-500/30 rounded-xl p-6 w-full max-w-sm mx-4">
        {/* ヘッダー */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-purple-300 font-semibold tracking-[0.2em] text-sm">
            ◇ MENU
          </h2>
          <button
            onClick={onClose}
            className="text-purple-500/60 hover:text-purple-300 text-sm"
          >
            ✕
          </button>
        </div>

        {/* 表示モード */}
        <Section label="表示モード">
          <ToggleGroup
            options={[
              { value: "auto", label: "自動" },
              { value: "pc", label: "PC" },
              { value: "mobile", label: "スマホ" },
            ] satisfies { value: DisplayMode; label: string }[]}
            value={displayMode}
            onChange={setDisplayMode}
          />
        </Section>

        {/* テキスト速度 */}
        <Section label="テキスト速度">
          <ToggleGroup
            options={[
              { value: "slow", label: "遅" },
              { value: "normal", label: "普通" },
              { value: "fast", label: "速" },
            ] satisfies { value: TextSpeed; label: string }[]}
            value={textSpeed}
            onChange={setTextSpeed}
          />
        </Section>

        {/* BGM音量 */}
        <Section label={`BGM音量  ${bgmVolume}`}>
          <input
            type="range"
            min={0}
            max={100}
            value={bgmVolume}
            onChange={(e) => setBgmVolume(Number(e.target.value))}
            className="w-full accent-purple-500"
          />
        </Section>

        {/* SE音量 */}
        <Section label={`SE音量  ${seVolume}`}>
          <input
            type="range"
            min={0}
            max={100}
            value={seVolume}
            onChange={(e) => setSeVolume(Number(e.target.value))}
            className="w-full accent-purple-500"
          />
        </Section>

        {/* セーブ/ロード */}
        <button
          onClick={() => setShowSaveLoad(true)}
          className="w-full mt-4 py-2 text-xs border border-purple-500/30 rounded text-purple-300 hover:bg-purple-500/10 transition-colors"
        >
          💾 セーブ / ロード
        </button>
      </div>
    </div>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <p className="text-[10px] text-purple-400/70 tracking-widest mb-2">
        {label}
      </p>
      {children}
    </div>
  );
}

function ToggleGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`flex-1 py-1.5 text-xs rounded border transition-colors ${
            value === opt.value
              ? "bg-purple-500/30 border-purple-400/60 text-purple-200"
              : "bg-purple-500/5 border-purple-500/20 text-purple-400/60 hover:border-purple-400/40"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: TS エラーがないことを確認する**

```bash
cd frontend && npx tsc --noEmit
```

Expected: エラーなし

- [ ] **Step 3: コミット**

```bash
git add frontend/src/components/MenuModal.tsx
git commit -m "feat: MenuModalコンポーネント追加"
```

---

### Task 4: GameScreen に MenuModal を配線

**Files:**
- Modify: `frontend/src/components/GameScreen.tsx`

- [ ] **Step 1: `GameScreen.tsx` を以下に書き換える**

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

- [ ] **Step 2: TS エラーがないことを確認する**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 3: ブラウザでMENUボタンをクリックしてMenuModalが開くことを確認する**

- MENUボタン → MenuModalが開く
- SAVEボタン → SaveLoadModalが開く（従来通り）
- ✕ボタン / 背景クリックでモーダルが閉じる

- [ ] **Step 4: コミット**

```bash
git add frontend/src/components/GameScreen.tsx
git commit -m "feat: GameScreenにMenuModalを配線"
```

---

### Task 5: CommandPanel に displayMode を反映

**Files:**
- Modify: `frontend/src/components/CommandPanel.tsx`

- [ ] **Step 1: `useGameStore` から `displayMode` を読む**

`CommandPanel` 関数の先頭で取得:

```tsx
export function CommandPanel() {
  const applyCommand = useGameStore((s) => s.applyCommand);
  const cooldownUntil = useGameStore((s) => s.cooldownUntil);
  const isEnded = useGameStore((s) => s.isEnded);
  const displayMode = useGameStore((s) => s.displayMode);  // 追加
  const dialogKey = useGameStore(
    (s) => s.currentDialog?.text.slice(0, 8) ?? "",
  );
  // ...
```

- [ ] **Step 2: レイアウト判定ロジックを追加する**

`CommandPanel` 関数内、`return` の直前に以下を追加:

```tsx
const forcePC = displayMode === "pc";
const forceMobile = displayMode === "mobile";
```

- [ ] **Step 3: デスクトップグリッドとモバイルグリッドの表示条件を変更する**

変更前:
```tsx
{/* デスクトップ: 4列グリッド */}
<div className="hidden md:grid md:grid-cols-4 gap-3">
  ...
</div>

{/* モバイル: 2×2グリッド（カテゴリボタン） */}
<div className="md:hidden grid grid-cols-2 gap-2">
  ...
</div>
```

変更後:
```tsx
{/* デスクトップ: 4列グリッド */}
<div className={forcePC ? "grid grid-cols-4 gap-3" : forceMobile ? "hidden" : "hidden md:grid md:grid-cols-4 gap-3"}>
  {CATEGORIES.map((cat) => (
    <CommandGroup
      key={cat}
      category={cat}
      commands={commands.filter((c) => c.category === cat)}
      onSelect={applyCommand}
      disabled={isCooling || isEnded}
      dialogKey={dialogKey}
    />
  ))}
</div>

{/* モバイル: 2×2グリッド（カテゴリボタン） */}
<div className={forceMobile ? "grid grid-cols-2 gap-2" : forcePC ? "hidden" : "md:hidden grid grid-cols-2 gap-2"}>
  {CATEGORIES.map((cat) => (
    <MobileCategoryButton
      key={cat}
      category={cat}
      commands={commands.filter((c) => c.category === cat)}
      onSelect={applyCommand}
      disabled={isCooling || isEnded}
    />
  ))}
</div>
```

- [ ] **Step 4: TS エラーがないことを確認する**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 5: ブラウザで動作確認する**

1. MENUを開く
2. 表示モードを「PC」に切替 → コマンドパネルが4列表示になる（スマホ幅でも）
3. 「スマホ」に切替 → 2×2のカテゴリボタン表示になる（PC幅でも）
4. 「自動」に戻す → 画面幅に応じて自動切替になる

- [ ] **Step 6: コミット**

```bash
git add frontend/src/components/CommandPanel.tsx
git commit -m "feat: displayModeに基づくCommandPanelレイアウト切替"
```


---

## 完了確認チェックリスト

- [ ] `npx tsc --noEmit` でエラーなし
- [ ] `npm test -- --run` で全テスト PASS
- [ ] PC幅で立ち絵が適切なサイズで表示される
- [ ] MENUボタン → MenuModal、SAVEボタン → SaveLoadModal が正しく開く
- [ ] MenuModalで表示モード切替 → CommandPanelのレイアウトが即時反映される
- [ ] MenuModalの✕ボタン・背景クリックで閉じる
- [ ] MenuModalの「セーブ/ロード」→ SaveLoadModalが開く
