# Passive Learning Tracker — プロジェクトルール

このリポジトリで作業する際は必ず以下のルールに従うこと。

---

## 1. データベース（PostgreSQL / Neon）

- **プレースホルダーは `$1`, `$2` を使用する（`?` は MySQL 構文のため NG）**
- `db.query(sql, params)` の `params` はゼロベースではなく `$1` 始まりで渡す
- Upsert は `ON CONFLICT (url) DO UPDATE SET ...` で行う（URL でユニーク制約）
- 接続文字列には必ず `?sslmode=require` を付ける（Neon 要件）
- トランザクションが必要な場合は `db.transaction(callback)` を使用する

```js
// ✅ 正しい
const rows = await db.query('SELECT * FROM learning_logs LIMIT $1 OFFSET $2', [10, 0]);

// ❌ NG（PostgreSQLでは動かない）
const rows = await db.query('SELECT * FROM learning_logs LIMIT ? OFFSET ?', [10, 0]);
```

---

## 2. API レスポンスフォーマット

全エンドポイントは以下の統一フォーマットで返す：

```json
// 成功
{ "success": true, "data": [...] }

// エラー
{ "success": false, "error": "メッセージ", "message": "詳細（任意）" }
```

- `success` フィールドは必須
- エラー時は適切な HTTP ステータスコード（400, 404, 500）を返す

---

## 3. サーバー構成

- **エンドポイントは `routes.js` のみに定義する**（`server.js` には書かない）
- `server.js` はミドルウェア設定・エラーハンドラー・起動処理のみ
- `app.use('/api', apiRoutes)` で全 API を `/api` 配下に集約済み
- 新しいエンドポイントを追加するときは必ず `routes.js` に追加すること

---

## 4. Vercel デプロイ

- `vercel.json` の Cron で `GET /api/summarize` が5分ごとに実行される
- Vercel サーバーレス関数のタイムアウトは **10秒**のため、重い処理は避ける
- `summarizer.js` の `CONFIG.BATCH_SIZE` は 5〜10 程度に抑える
- 環境変数は Vercel ダッシュボードで管理する（`.env` はローカル専用）

---

## 5. Chrome 拡張機能（Manifest V3）

- パーミッションが必要な場合は必ず `manifest.json` に追加する
  - 現在: `storage`, `tabs`, `activeTab`, `alarms`
- `chrome.alarms` を使う場合は `"alarms"` パーミッションが必須
- API エンドポイントの URL は `extension/config.js` または設定画面（`settings.html`）で管理する（ハードコードしない）
- Content Script からのサーバー送信に失敗した場合は `chrome.storage.local` にキューイングしてリトライする

---

## 6. AI 要約（summarizer.js）

- モデル: `meta-llama/llama-3.3-70b-instruct:free`（OpenRouter 無料枠）
- 要約は 30 文字以内、日本語
- 失敗時は最大 3 回リトライ（`CONFIG.MAX_RETRIES`）
- バッチ処理間に `sleep(1000)` を入れてレート制限を回避する
- エラー時のフォールバック: タイトル → ホスト名 → `'学習ページ'`

---

## 7. スキーマ変更

- マイグレーションファイルは `migrations/` に追加する
- `schema.sql` は最新の完全スキーマを維持する（差分ではなく全体）
- `UNIQUE (url)` 制約は削除しない（Upsert の基準）
- URL カラムは `VARCHAR(2048)`（v2.1 でバグ修正済み）
