---
description: ローカル開発環境の起動と Chrome 拡張機能セットアップ
---

## 手順

1. 依存関係インストール

```bash
npm install
```

2. 環境変数ファイルを作成

```bash
cp .env.example .env
```

`.env` を開いて `DATABASE_URL`, `OPENROUTER_API_KEY` を設定する。

3. データベーステーブルを作成（初回のみ）

Neon ダッシュボードの SQL Editor で `schema.sql` の内容を実行する。

4. 開発サーバーを起動

```bash
npm run dev
```

サーバーは `http://localhost:3000` で起動する。

5. Chrome 拡張機能を読み込む

- `chrome://extensions/` を開く
- 「デベロッパーモード」を ON にする
- 「パッケージ化されていない拡張機能を読み込む」→ `extension/` フォルダを選択
- 拡張機能の設定画面で API エンドポイントが `http://localhost:3000/api/track` になっていることを確認

6. ダッシュボードを確認

`http://localhost:3000` をブラウザで開く。
