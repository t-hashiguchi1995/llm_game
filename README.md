# 皇女殿下と紡ぐ、午前2時の内緒話

**My Sweet Secret Princess (MSSP)** — ギャルゲー風インタラクティブADV

> **注意**: 本ゲームは個人利用・非公開に限定します。

---

## 概要

深夜の内緒話を通じてヒロインと関係を深める、ブラウザで動作する選択肢型アドベンチャーゲームです。プレイヤーの行動がパラメータに影響し、エンディングが分岐します。

## 遊び方

| 操作 | 内容 |
|------|------|
| コマンドボタンをクリック | 会話・スキンシップ・サポート・提案の中から行動を選択 |
| SAVE | 任意のスロット（6枠）にセーブ |
| MENU | 表示設定・音量・セーブ/ロード |

### パラメータ

| パラメータ | 説明 |
|-----------|------|
| ♥ 親愛 | 感情的な距離感 |
| ✦ 開拓 | 積極性・好奇心 |
| 🛡 安心 | 信頼・落ち着き |

### エンディング

- トゥルーハッピーエンド
- ノーマルハッピーエンド
- 依存ダークエンド
- バッドエンド

## MENU 設定

| 項目 | 内容 |
|------|------|
| 表示モード | PC / スマホ / 自動（レスポンシブ） |
| テキスト速度 | 遅 / 普通 / 速 |
| BGM音量 | 0〜100 |
| SE音量 | 0〜100 |
| セーブ/ロード | 6スロット対応 |

## 技術スタック

| 領域 | 技術 |
|------|------|
| UI | React 19 + TypeScript |
| スタイル | Tailwind CSS v4 |
| 状態管理 | Zustand |
| ビルド | Vite |
| テスト | Vitest |
| デプロイ | GitHub Pages |

## 開発セットアップ

```bash
cd frontend
npm install
npm run dev       # 開発サーバー起動 (http://localhost:5173)
npm test          # テスト実行
npm run build     # プロダクションビルド
```

## フェーズロードマップ

| フェーズ | 内容 | ステータス |
|---------|------|-----------|
| Phase 1 | 固定シナリオADV（選択肢・セリフ固定） | **開発中** |
| Phase 2 | LLMによるセリフ生成（選択肢は固定） | 未着手 |
| Phase 3 | 自由テキスト入力 + LLMパラメータ判定 | 未着手 |

## ディレクトリ構成

```
frontend/src/
├── components/     # UIコンポーネント
│   ├── GameScreen.tsx
│   ├── SceneView.tsx
│   ├── CharacterSprite.tsx
│   ├── DialogBox.tsx
│   ├── CommandPanel.tsx
│   ├── StatusBar.tsx
│   ├── MenuModal.tsx
│   ├── SaveLoadModal.tsx
│   └── EndingScreen.tsx
├── store/
│   └── useGameStore.ts   # Zustandストア
├── engine/
│   └── scenarioEngine.ts # イベント解決・エンディング判定
├── data/
│   ├── scenarios.json    # イベント定義
│   ├── endings.json      # エンディング条件
│   ├── commands.json     # コマンド一覧
│   └── characters.json   # キャラクター・立ち絵マップ
└── types/
    └── index.ts
```
