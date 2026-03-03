# Passive Learning Tracker — プロジェクトルール

このリポジトリで作業する際は必ず以下のルールに従うこと。
作業開始前に `lessons.md` を読み込み、過去の教訓を把握すること。

---

## 1. データベース（PostgreSQL / Neon）

- **プレースホルダーは `$1`, `$2` を使用する（`?` は MySQL 構文のため NG）**
- `db.query(sql, params)` の `params` はゼロベースではなく `$1` 始まりで渡す
- Upsert は `ON CONFLICT (url) DO UPDATE SET ...` で行う（URL でユニーク制約）
- 接続文字列には必ず `?sslmode=require` を付ける（Neon 要件）

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
{ "success": true, "data": [...] }
{ "success": false, "error": "メッセージ" }
```

---

## 3. サーバー構成

- **エンドポイントは `routes.js` のみに定義する**（`server.js` には書かない）
- `server.js` はミドルウェア設定・エラーハンドラー・起動処理のみ
- 新しいエンドポイントを追加するときは必ず `routes.js` に追加すること

---

## 4. Vercel デプロイ

- `vercel.json` の Cron で `GET /api/summarize` が5分ごとに実行される
- Vercel サーバーレス関数のタイムアウトは **10秒**のため、重い処理は避ける
- 環境変数は Vercel ダッシュボードで管理する（`.env` はローカル専用）

---

## 5. Chrome 拡張機能（Manifest V3）— 最重要

### URL 管理
- **本番 URL（Vercel）はコード内でハードコードしない。必ず定数 `VERCEL_URL` にまとめる**
- `host_permissions` に通信先 URL を必ず追加する（`optional_host_permissions` だけでは Service Worker からの fetch がブロックされる）
- URL が変わる場合は以下 **5ファイル全て** を確認・更新すること：
  - `manifest.json` → `host_permissions`
  - `background.js` → `VERCEL_URL` 定数
  - `content.js` → `VERCEL_URL` 定数
  - `popup.js` → `VERCEL_URL` 定数
  - `settings.js` → `ENV_DEFAULTS.production.apiEndpoint`

### Storage
- `chrome.storage.sync` と `chrome.storage.local` は別物。同一キーでも値は共有されない
- `background.js` が `local` に書いたデータを `content.js` が `sync` から読もうとするミスに注意
- `chrome.storage.sync` にキャッシュされた古い URL は設定画面から上書きが必要

### Content Script のライフサイクル
- 拡張機能を再読み込みしても、**既に開いているタブのコンテンツスクリプトは更新されない**（タブ側の F5 も必要）
- 再読み込み後に古いコンテンツスクリプトが動き続け `Extension context invalidated` エラーが発生する
- `chrome.storage` 等の API 呼び出し前に必ずコンテキストの有効性を確認すること：

```js
function isExtensionContextValid() {
  try { return !!(chrome.runtime && chrome.runtime.id); }
  catch (e) { return false; }
}
```

### Manifest V3 の CSP
- Extension page（popup.html 等）では `innerHTML` への動的 HTML 代入は CSP 違反になる
- `innerHTML = template` の代わりに `createElement` + `textContent` + `appendChild` を使用すること

### 環境判定
- `isDevelopment` フラグや `environment` をストレージから読む設計は混乱の元
- デフォルト値は常に本番（Vercel）URL にし、開発時のみ手動で切り替える運用にすること

---

## 6. AI 要約（summarizer.js）

- モデル: `meta-llama/llama-3.3-70b-instruct:free`（OpenRouter 無料枠）
- 要約は 30 文字以内、日本語
- 失敗時は最大 3 回リトライ（`CONFIG.MAX_RETRIES`）
- バッチ処理間に `sleep(1000)` を入れてレート制限を回避する

---

## 7. スキーマ変更

- マイグレーションファイルは `migrations/` に追加する
- `schema.sql` は最新の完全スキーマを維持する
- `UNIQUE (url)` 制約は削除しない（Upsert の基準）
