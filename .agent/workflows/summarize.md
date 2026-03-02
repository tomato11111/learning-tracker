---
description: AI 要約を手動実行する
---

## 手順

### 一度だけ実行

```bash
npm run summarize
```

未要約の学習ログ（`ai_summary IS NULL`）を最大 10 件取得し、OpenRouter API で要約して DB に保存する。

### 定期実行（ローカル開発用）

```bash
npm run summarize:cron
```

5 分ごとにバッチ処理を繰り返す。ターミナルを閉じると停止する。

> **本番（Vercel）では不要** — `vercel.json` の Cron Job が自動実行するため。

### 手動 API 実行（本番環境）

```
GET https://your-app.vercel.app/api/summarize
```

ブラウザやcurlでアクセスすると即時実行できる。

## 注意事項

- OpenRouter 無料枠の上限: 20 リクエスト/分、200 リクエスト/日
- エラー時は最大 3 回リトライ（`CONFIG.MAX_RETRIES`）
- バッチサイズは `summarizer.js` の `CONFIG.BATCH_SIZE`（デフォルト 10）で調整可能
