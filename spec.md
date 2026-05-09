# ゲーム開発仕様書
## 皇女殿下と紡ぐ、午前2時の内緒話 — My Sweet Secret Princess

**版**: 0.1.0 (Draft)　　**作成日**: 2026-05-09　　**対象フェーズ**: Phase 1（固定シナリオADV）

---

## 目次

1. [プロジェクト概要](#1-プロジェクト概要)
2. [技術スタック](#2-技術スタック)
3. [ディレクトリ構成](#3-ディレクトリ構成)
4. [ゲームシステム設計](#4-ゲームシステム設計)
5. [JSONスキーマ定義](#5-jsonスキーマ定義)
6. [状態管理設計](#6-状態管理設計zustand)
7. [コンポーネント設計](#7-コンポーネント設計)
8. [セーブシステム](#8-セーブシステム)
9. [未決定事項（TBD）一覧](#9-未決定事項tbd一覧)
10. [推奨開発フロー](#10-推奨開発フロー)

---

## 1. プロジェクト概要

### 1.1 ゲームコンセプト

にじさんじ所属バーチャルライバー「リゼ・ヘルエスタ」をモデルにした個人利用・非公開の対話型アドベンチャーゲーム。プレイヤーは彼女の恋人として、深夜の内緒話を通じて関係を深める。

> **注意**: 本ゲームは個人利用・非公開に限定する。リゼ・ヘルエスタおよびにじさんじ関連素材の無断公開・配布は行わないこと。

本仕様書はフェーズ1（固定シナリオADV）を対象とする。フェーズ2以降でのLLM統合を見越した設計を行う。

### 1.2 開発方針

- 個人利用・非公開に限定
- フェーズ1: 固定選択肢・固定セリフで動作する最小構成を完成させる
- フェーズ2以降: LLMによるセリフ生成・自由入力対話への段階的移行
- フェーズ2拡張を見越したJSONスキーマ設計（`fallback_text` 方式）

### 1.3 フェーズロードマップ

| フェーズ | 内容 | LLM使用 | ステータス |
|---|---|---|---|
| Phase 1 | 固定シナリオADV（選択肢・セリフ固定） | なし | **開発対象** |
| Phase 2 | LLMによるセリフ生成（選択肢は固定） | セリフ生成 | TBD |
| Phase 3 | 自由テキスト入力＋LLMパラメータ判定 | 全面使用 | TBD |

---

## 2. 技術スタック

### 2.1 フロントエンド

| カテゴリ | 採用技術 | バージョン | 備考 |
|---|---|---|---|
| フレームワーク | React | ^19.x | 経験あり |
| ビルドツール | Vite | ^6.x | 高速HMR |
| スタイリング | Tailwind CSS | ^4.x | |
| 状態管理 | Zustand | ^5.x | ゲーム状態全般 |
| 言語 | TypeScript | ^5.x | 型安全性確保 |

### 2.2 データ管理

| 対象 | 形式 | 備考 |
|---|---|---|
| シナリオデータ | JSON | イベント・選択肢・セリフ |
| エンディング条件 | JSON | 分岐条件定義 |
| キャラクターデータ | JSON | 立ち絵・感情マッピング |
| セーブデータ | localStorage | ブラウザ保存 |

---

## 3. ディレクトリ構成

```
src/
├── components/
│   ├── GameScreen.tsx        # 立ち絵・背景・ダイアログ表示
│   ├── CommandPanel.tsx      # 選択肢ボタン・クールダウン表示
│   ├── StatusPanel.tsx       # ゲージ3軸・タイマー表示
│   └── SaveLoadModal.tsx     # セーブ・ロード UI
├── store/
│   └── useGameStore.ts       # Zustand ストア（ゲーム状態全般）
├── engine/
│   └── useScenarioEngine.ts  # イベント判定・エンディング分岐ロジック
├── data/
│   ├── scenarios.json        # シナリオイベント定義
│   ├── endings.json          # エンディング分岐条件
│   └── characters.json       # キャラクター・立ち絵定義
├── hooks/
│   └── useSaveLoad.ts        # localStorage セーブ・ロード
├── types/
│   └── index.ts              # 共通型定義
├── assets/
│   ├── images/               # 立ち絵・背景画像
│   └── audio/                # BGM・SE（TBD）
└── App.tsx
```

---

## 4. ゲームシステム設計

### 4.1 パラメータ設計

3つのパラメータをゲーム状態の軸として管理する。各パラメータは 0〜100 の整数値をとる。

| パラメータ名 | 内部キー | 初期値 | 説明 |
|---|---|---|---|
| 親愛度 (Sweetness) | `sweetness` | 50 | 純粋な愛情・共感・優しさへの反応 |
| 開拓度 (Curiosity) | `curiosity` | 0 | 好奇心を刺激する提案への段階的受容 |
| 安心感 (Trust) | `trust` | 50 | 精神的ケア・包容力への反応。強引な進行で低下 |

### 4.2 タイマー

- 制限時間の有無: **【TBD】**
- ゲーム内時間の進行速度: **【TBD】**
- 「午前2時〜朝」の時間軸の採用可否: **【TBD】**

### 4.3 コマンドシステム

選択肢はカテゴリ別に分類し、共通クールダウンを設けることで連打を防ぐ。

| カテゴリ | 効果の傾向 | 例 |
|---|---|---|
| 会話 | sweetness・trust 変動 | 「今日の配信どうだった？」 |
| スキンシップ | sweetness・curiosity 変動 | 「隣に座ってもいい？」 |
| サポート | trust 上昇 | 「疲れてるなら休もうか」 |
| 提案 | curiosity 変動（段階依存） | 「着替えを手伝おうか」 |

- クールダウン時間（秒数）: **【TBD】**
- カテゴリ数・選択肢数の確定値: **【TBD】**

### 4.4 エンディング分岐

| エンディング名 | 条件（目安） | 内容 |
|---|---|---|
| トゥルーハッピーエンド | 3軸すべて高（≥80） | 心も体も完全に溶け合う最高の夜 |
| ノーマルハッピーエンド | sweetness・trust高 / curiosity低 | 穏やかな日常を共に過ごす結末 |
| 依存ダークエンド | curiosity異常高 / trust低 | 刺激への病的な依存。仄暗い結末 |
| バッドエンド | 全体的に低 / 強引なプレイ連続 | 心を閉ざし、別れの予感 |

---

## 5. JSONスキーマ定義

### 5.1 scenarios.json

フェーズ2（LLM統合）への移行を見越し、セリフを `fallback_text` として保持する構造にする。LLM使用時は `scene_context` をプロンプトに渡し、`fallback_text` は非LLM環境での表示テキストとして機能する。

```json
{
  "events": [
    {
      "id": "evt-001",
      "trigger": {
        "type": "command",
        "command_id": "cmd-support-001"
      },
      "condition": {
        "trust": { "min": 0, "max": 100 },
        "flags": []
      },
      "scene_context": "ホラー配信後、涙目でプレイヤーの部屋に逃げ込んできた直後",
      "emotion": "scared",
      "fallback_text": "も、もう終わりましたから…平気です。全然こわくないです。",
      "parameter_delta": {
        "sweetness": 5,
        "trust": 10,
        "curiosity": 0
      },
      "set_flags": ["horror_event_done"],
      "next_event": null
    }
  ]
}
```

#### triggerのtype一覧

| type | 発火条件 |
|---|---|
| `command` | 指定コマンドが実行されたとき |
| `time` | 経過時間が閾値を超えたとき（TBD） |
| `parameter` | パラメータが閾値を超えたとき |
| `flag` | 指定フラグが立ったとき |

### 5.2 endings.json

```json
{
  "endings": [
    {
      "id": "ending-true",
      "label": "トゥルーハッピーエンド",
      "condition": {
        "sweetness": { "min": 80 },
        "curiosity": { "min": 80 },
        "trust": { "min": 80 }
      },
      "priority": 1,
      "cg": "cg_true_ending.jpg",
      "text": "【TBD: エンディングテキスト】"
    },
    {
      "id": "ending-normal",
      "label": "ノーマルハッピーエンド",
      "condition": {
        "sweetness": { "min": 70 },
        "trust": { "min": 70 },
        "curiosity": { "max": 49 }
      },
      "priority": 2,
      "cg": "cg_normal_ending.jpg",
      "text": "【TBD: エンディングテキスト】"
    }
  ]
}
```

> `priority` は複数条件が同時に成立した場合に数値が小さい方を優先する。

### 5.3 characters.json

```json
{
  "characters": [
    {
      "id": "rize",
      "name": "リゼ・ヘルエスタ",
      "sprites": {
        "normal":      "rize_normal.png",
        "happy":       "rize_happy.png",
        "scared":      "rize_scared.png",
        "embarrassed": "rize_embarrassed.png",
        "sad":         "rize_sad.png"
      },
      "emotion_map": {
        "default":     "normal",
        "scared":      "scared",
        "happy":       "happy",
        "embarrassed": "embarrassed"
      }
    }
  ]
}
```

---

## 6. 状態管理設計（Zustand）

### 6.1 型定義

```typescript
// types/index.ts

export interface GameParameters {
  sweetness: number;  // 0-100
  curiosity: number;  // 0-100
  trust:     number;  // 0-100
}

export interface GameState {
  params:       GameParameters;
  currentScene: string;
  flags:        string[];
  elapsedTime:  number;        // 秒（TBD: タイマー実装後に使用）
  saveSlots:    SaveSlot[];
  isEnded:      boolean;
  endingId:     string | null;
}

export interface SaveSlot {
  slot:      number;
  timestamp: string;
  state:     GameState;
}
```

### 6.2 ストアアクション

| アクション名 | 引数 | 処理内容 |
|---|---|---|
| `applyCommand` | `commandId: string` | パラメータ増減・フラグ更新・クールダウン開始 |
| `checkEnding` | なし | endings.jsonの条件を照合し該当エンディングIDを返す |
| `saveGame` | `slot: number` | 現在状態をlocalStorageに保存 |
| `loadGame` | `slot: number` | 指定スロットから状態を復元 |
| `resetGame` | なし | 初期状態にリセット |

### 6.3 useGameStore の骨格

```typescript
// store/useGameStore.ts
import { create } from 'zustand';
import type { GameState, GameParameters } from '../types';

const INITIAL_PARAMS: GameParameters = {
  sweetness: 50,
  curiosity: 0,
  trust: 50,
};

interface GameStore extends GameState {
  applyCommand: (commandId: string) => void;
  checkEnding:  () => string | null;
  saveGame:     (slot: number) => void;
  loadGame:     (slot: number) => void;
  resetGame:    () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  params:       INITIAL_PARAMS,
  currentScene: 'scene-001',
  flags:        [],
  elapsedTime:  0,
  saveSlots:    [],
  isEnded:      false,
  endingId:     null,

  applyCommand: (commandId) => {
    // scenarios.json からコマンドに対応するイベントを取得し
    // parameter_delta を適用する（実装はuseScenarioEngineに委譲）
  },

  checkEnding: () => {
    // endings.json の条件を priority 順に照合
    // 条件を満たす最初のエンディングIDを返す
    return null;
  },

  saveGame: (slot) => {
    const state = get();
    localStorage.setItem(`mssp_save_slot_${slot}`, JSON.stringify(state));
  },

  loadGame: (slot) => {
    const raw = localStorage.getItem(`mssp_save_slot_${slot}`);
    if (raw) set(JSON.parse(raw));
  },

  resetGame: () => set({ params: INITIAL_PARAMS, flags: [], isEnded: false, endingId: null }),
}));
```

---

## 7. コンポーネント設計

### 7.1 GameScreen

| 要素 | 内容 | 備考 |
|---|---|---|
| 背景画像 | シーンに応じて切り替え | TBD: 背景数 |
| 立ち絵 | `characters.json` の `emotion_map` で差分切替 | `emotion` 値を props で受取 |
| ダイアログボックス | `fallback_text` を表示 | フェーズ2でLLM生成に置換 |
| 話者名表示 | キャラクター名を固定表示 | |

### 7.2 CommandPanel

| 要素 | 内容 | 備考 |
|---|---|---|
| 選択肢ボタン | カテゴリ別グループ表示 | TBD: カテゴリ数・選択肢数 |
| クールダウン表示 | 残り時間をプログレスバーで表示 | 共通クールダウン |
| 無効化処理 | クールダウン中・条件未達は非活性 | |

### 7.3 StatusPanel

| 要素 | 内容 | 備考 |
|---|---|---|
| Sweetnessゲージ | 0-100のプログレスバー | ピンク系 |
| Curiosityゲージ | 0-100のプログレスバー | パープル系 |
| Trustゲージ | 0-100のプログレスバー | ブルー系 |
| タイマー | TBD | タイマー実装方針未定 |

---

## 8. セーブシステム

### 8.1 仕様

- セーブスロット数: **【TBD】**（想定: 6）
- 保存先: `localStorage`
- 保存内容: `GameState` 全体をJSONシリアライズ
- バックアップ: JSONエクスポート・インポート機能を設ける

### 8.2 localStorageキー設計

```
mssp_save_slot_0    // スロット0
mssp_save_slot_1    // スロット1
...                 // 最大スロット数はTBD
mssp_settings       // 設定（音量・表示設定等）
```

---

## 9. 未決定事項（TBD）一覧

> 以下の項目は実装着手前に決定が必要。優先度「高」は Step 3 着手前に必須。

| No. | 項目 | 影響範囲 | 優先度 |
|---|---|---|---|
| 1 | タイマーの有無・進行速度 | StatusPanel / useGameStore | 高 |
| 2 | イベント数・選択肢数の確定値 | scenarios.json / CommandPanel | 高 |
| 3 | セーブスロット数 | useSaveLoad / SaveLoadModal | 中 |
| 4 | 立ち絵差分数・感情パターン数 | characters.json / GameScreen | 高 |
| 5 | 背景画像の枚数・シーン数 | GameScreen / assets | 高 |
| 6 | クールダウン時間（秒数） | useGameStore / CommandPanel | 中 |
| 7 | BGM・SE実装の有無 | assets / App.tsx | 低 |
| 8 | エンディングCGの有無・枚数 | endings.json / GameScreen | 中 |
| 9 | パラメータ閾値の確定値 | endings.json | 高 |
| 10 | Phase 2 移行タイミング | useScenarioEngine | 低 |

---

## 10. 推奨開発フロー

### 10.1 フェーズ1 実装順序

| Step | 内容 | 完了条件 |
|---|---|---|
| 1 | 型定義（`types/index.ts`）の作成 | GameState・GameParametersの型確定 |
| 2 | `useGameStore` の実装 | パラメータ増減・フラグ管理が動作 |
| 3 | JSONスキーマの確定とダミーデータ作成 | scenarios / endings / characters 各JSON |
| 4 | `useScenarioEngine` の実装 | イベント判定・エンディング分岐が動作 |
| 5 | UIコンポーネント実装（StatusPanel → CommandPanel → GameScreen） | 画面描画が動作 |
| 6 | `useSaveLoad` の実装 | セーブ・ロードが動作 |
| 7 | TBD項目の解消と本番データ投入 | 全エンディングが到達可能 |
| 8 | 通しプレイ・バグ修正 | 全エンド確認完了 |

### 10.2 フェーズ2 移行時の主な変更点

- `scenarios.json` の `fallback_text` → LLMへのプロンプト（`scene_context`）として使用
- `useScenarioEngine` に Anthropic API 呼び出しを追加
- `CommandPanel` に自由テキスト入力フィールドを追加
- LLMのパラメータ判定ロジックを `useScenarioEngine` に組み込む
