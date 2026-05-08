# My Sweet Secret Princess — ゲーム設計ドキュメント

**作成日**: 2026-05-09  
**対象フェーズ**: Phase 1（固定シナリオADV）  
**ステータス**: 承認済み → 実装計画作成中

---

## 1. プロジェクト概要

にじさんじ所属バーチャルライバー「リゼ・ヘルエスタ」をモデルにした個人利用・非公開の対話型アドベンチャーゲーム。プレイヤーは彼女の恋人として、深夜の内緒話を通じて関係を深める。

> **注意**: 個人利用・非公開限定。素材の無断公開・配布は行わない。

---

## 2. 確定した設計決定事項

### 2.1 技術スタック

| カテゴリ | 採用技術 | バージョン |
|---|---|---|
| フレームワーク | React | ^19.x |
| ビルドツール | Vite | ^6.x |
| スタイリング | Tailwind CSS | ^4.x |
| 状態管理 | Zustand | ^5.x |
| 言語 | TypeScript | ^5.x |
| テスト | Vitest | latest |
| Linter | ESLint | latest |

### 2.2 ゲームパラメータ（確定値）

| パラメータ | キー | 初期値 | 範囲 |
|---|---|---|---|
| 親愛度 | `sweetness` | 50 | 0–100 |
| 開拓度 | `curiosity` | 0 | 0–100 |
| 安心感 | `trust` | 50 | 0–100 |

### 2.3 システム確定値

| 項目 | 値 | 備考 |
|---|---|---|
| タイマー | **なし** | のんびりプレイ。将来の音声合成考慮 |
| セーブスロット数 | **6** | localStorage |
| クールダウン時間 | **3秒** | 音声合成出力時間を考慮 |
| Phase 1 シナリオ量 | **標準構成（〜20イベント）** | 全エンディング到達可能 |
| エンディング数 | **4** | spec.md §4.4 のとおり |

### 2.3.1 spec.md からの変更点

| spec.md | 本設計 | 理由 |
|---|---|---|
| `StatusPanel.tsx` | `StatusBar.tsx` | 横長バーデザインのためBar に改名 |
| タイマー表示あり | タイマーなし | ユーザー決定（のんびりプレイ） |
| `GameScreen` のみ | `SceneView` + `CharacterSprite` + `DialogBox` に分割 | 責務分離・テスト容易性 |

### 2.4 UIデザイン決定事項

| 項目 | 決定内容 |
|---|---|
| レイアウトスタイル | **クラシックVNスタイル（A案）** |
| カラーテーマ | **ダークUI（デフォルト）** |
| テーマ切り替え | Tailwind `dark:` クラスで設計、Phase 1 はダーク固定 |
| デスクトップ | 横レイアウト：上部ステータスバー → シーン → コマンドパネル |
| スマホ（縦） | 縦レイアウト：ステータス → シーン → 2×2コマンドグリッド |
| レスポンシブ基準 | Tailwind `md:`（768px）で切り替え |

---

## 3. プロジェクト構造

```
llm_game/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── GameScreen.tsx        # 全体レイアウト制御
│   │   │   ├── StatusBar.tsx         # 上部ゲージ3本 + SAVE/LOG/MENUボタン
│   │   │   ├── SceneView.tsx         # 背景 + 立ち絵 + ダイアログボックス
│   │   │   ├── CharacterSprite.tsx   # emotion_map で差分切替
│   │   │   ├── DialogBox.tsx         # fallback_text 表示 + 話者名
│   │   │   ├── CommandPanel.tsx      # カテゴリ別ボタン + クールダウンバー
│   │   │   ├── EndingScreen.tsx      # エンディング表示（CG + テキスト + リセット）
│   │   │   └── SaveLoadModal.tsx     # 6スロット セーブ/ロード UI
│   │   ├── store/
│   │   │   └── useGameStore.ts       # Zustand ストア
│   │   ├── engine/
│   │   │   ├── scenarioEngine.ts     # 純粋関数（テスト対象）
│   │   │   └── useScenarioEngine.ts  # フックとしてラップ
│   │   ├── data/
│   │   │   ├── scenarios.json
│   │   │   ├── endings.json
│   │   │   └── characters.json
│   │   ├── hooks/
│   │   │   └── useSaveLoad.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   └── assets/
│   │       ├── images/
│   │       └── audio/               # TBD（音声合成対応時）
│   ├── public/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── tsconfig.json
├── docs/
│   ├── superpowers/specs/           # 設計ドキュメント
│   └── adr/                         # アーキテクチャ決定記録
├── .github/
│   └── workflows/
│       ├── ci.yml                   # frontend専用 CI
│       └── deploy.yml               # GitHub Pages デプロイ
└── CLAUDE.md
```

---

## 4. ゲームエンジン設計

### 4.1 純粋関数（`engine/scenarioEngine.ts`）

テスト容易性のためロジックを純粋関数として分離。

```typescript
resolveEvent(commandId: string, params: GameParameters, flags: string[], events: ScenarioEvent[]): ScenarioEvent | null
checkEnding(params: GameParameters, endings: Ending[]): Ending | null
clampParam(val: number): number  // 0-100 クランプ
```

### 4.2 applyCommand フロー

1. `scenarios.json` からトリガー `command_id` と `condition` が合致するイベントを検索
2. `parameter_delta` を現在値に加算（`clampParam` で 0–100 に収める）
3. `set_flags` を `flags[]` に追加
4. クールダウン開始（3秒）
5. `checkEnding()` を自動呼び出し → 条件合致で `isEnded = true`

### 4.3 フラグシステム

- `flags: string[]` 形式（例: `"horror_event_done"`）
- 同一イベントの重複発火防止に使用
- セーブデータに含まれる

---

## 5. CI/CD パイプライン

### 5.1 GitHub Actions ジョブ

| ジョブ | トリガー | 内容 |
|---|---|---|
| `secret-scan` | PR / push | gitleaks による秘密情報スキャン |
| `frontend-ci` | `frontend/**` 変更時 | ESLint → tsc → Vitest → build |
| `deploy` | `main` push かつ `frontend-ci` 成功 | `gh-pages` ブランチへデプロイ |

### 5.2 frontend-ci ジョブ実行順

```
ESLint → TypeScript (tsc --noEmit) → Vitest → Vite build
```

### 5.3 Vitest テスト対象

- `scenarioEngine.ts` の純粋関数を中心にユニットテスト
- `resolveEvent`・`checkEnding`・`clampParam` をカバー
- UIコンポーネントテストは Phase 1 スコープ外

### 5.4 デプロイ設定

- `peaceiris/actions-gh-pages` で `gh-pages` ブランチにデプロイ
- Vite `base` をリポジトリ名で設定（例: `/llm_game/`）
- **Cloudflare Pages 移行時**: `deploy.yml` の action を差し替えるだけで完結

### 5.5 lefthook 追加フック

```yaml
tsc-check:
  glob: "frontend/**/*.{ts,tsx}"
  run: cd frontend && npx tsc --noEmit

eslint-check:
  glob: "frontend/**/*.{ts,tsx}"
  run: cd frontend && npx eslint {staged_files}
```

---

## 6. セーブシステム

- スロット数: 6
- 保存先: `localStorage`
- キー: `mssp_save_slot_0` 〜 `mssp_save_slot_5`
- 保存内容: `GameState` 全体を JSON シリアライズ
- バックアップ: JSON エクスポート/インポート機能（Phase 1 で実装）

---

## 7. 将来の拡張に向けた設計配慮

| 拡張 | 現時点での対応 |
|---|---|
| **音声合成** | クールダウン 3秒で発話時間を確保。`audio/` ディレクトリを予約 |
| **テーマ切り替え** | Tailwind `dark:` クラスで設計、`<html class="dark">` トグルで切替可 |
| **Phase 2 LLM統合** | `fallback_text` 方式・`scene_context` フィールドを JSON に保持 |
| **Cloudflare Pages** | `deploy.yml` の action 差し替えのみで移行完了 |
| **バックエンド** | 別リポジトリ管理。このリポジトリはフロントエンド専用 |

---

## 8. アセット一覧（確定）

### 8.1 背景画像（29枚）

| ロケーション | 時間帯バリエーション |
|---|---|
| 男性一人部屋３ | 日中・夕方・夜(照明ON)・夜(照明OFF) |
| 女性一人部屋２ | 日中・夕方・夜(照明ON)・夜(ランプON)・夜(照明OFF) |
| リビング | 昼・夕方・夜・深夜 |
| 家の廊下 | 昼・夕方・夜・深夜 |
| 海 | 日中・夕方・夜・深夜 |
| 橋 | 昼・夕方・夜 |
| 学校プール | 日中・夕方・夜・深夜 |
| ショッピングモール | 1枚 |

Phase 1 シナリオで主に使用: **男性一人部屋３（夜・照明ON）**（深夜設定）

### 8.2 立ち絵（14枚）

| 感情 | ファイル | 枚数 |
|---|---|---|
| happy | lize-happy1〜4.png | 4 |
| embarrassed | lize-embarrassed1〜5.png | 5 |
| sad | lize-sad1〜3.png | 3 |
| scared | lize-scared1〜2.png | 2 |
| normal（デフォルト） | → `lize-happy1.png` を使用 | — |

各感情で複数バリアントが存在するため、`emotion_map` を拡張してバリアント番号もサポートする（例: `"scared_1"`, `"scared_2"`）。

### 8.3 確定した設定値

| 項目 | 確定値 |
|---|---|
| GitHub リポジトリ名 | `llm_game` |
| Vite `base` | `/llm_game/` |

---

## 9. 未解決事項（TBD）

| No. | 項目 | 優先度 | 備考 |
|---|---|---|---|
| 1 | ダーク/ライト テーマ切り替えの実装タイミング | 低 | Phase 1 はダーク固定 |
| 2 | エンディングCGの有無 | 中 | `endings.json` の `cg` フィールド |
| 3 | BGM・SE実装 | 低 | Phase 1 スコープ外 |
| 4 | LOGボタン（会話履歴表示）の実装 | 低 | UIには配置するが Phase 1 は省略可 |
| 5 | 各イベントで使用する立ち絵バリアント番号 | 中 | シナリオ執筆時に決定 |
