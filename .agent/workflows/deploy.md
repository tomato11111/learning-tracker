---
description: Vercel へのデプロイ手順
---

## 前提条件

- Vercel アカウントがあること
- `DATABASE_URL` と `OPENROUTER_API_KEY` が手元にあること

## 手順

1. Vercel CLIをインストール（未インストールの場合）

```bash
npm i -g vercel
```

2. ログイン

```bash
vercel login
```

3. プロジェクトルートでデプロイ実行

```bash
vercel --prod
```

4. 環境変数を設定（初回のみ）

Vercel ダッシュボード → Settings → Environment Variables に以下を追加：

| Key | 説明 |
|-----|------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Neon の接続文字列（`?sslmode=require` 必須） |
| `OPENROUTER_API_KEY` | OpenRouter API キー |
| `ALLOWED_ORIGINS` | デプロイ後の URL（例: `https://your-app.vercel.app`） |
| `PRODUCTION_URL` | 同上 |

5. デプロイ後に Chrome 拡張機能の API エンドポイントを更新

`extension/config.js` の `PRODUCTION_URL` をデプロイ先 URL に変更、または
Chrome の拡張機能設定画面（`settings.html`）から変更する。

6. Cron 動作確認

Vercel ダッシュボード → Settings → Cron Jobs で `/api/summarize` が登録されていることを確認。
ブラウザで `https://your-app.vercel.app/api/summarize` にアクセスして手動実行テストも可。
