# Lessons Learned — Passive Learning Tracker

**AIはこのファイルを作業開始前に必ず読み込み、過去のミスを繰り返さないこと。**

---

## [2026-03-03] Chrome拡張 Manifest V3 の URL 管理ミス

### ❌ やってしまったこと

`host_permissions` に `localhost:3000` のみを設定し、Vercel URL を `optional_host_permissions` に入れた。
さらに `background.js`・`content.js`・`popup.js`・`settings.js`・`config.js` の **5ファイル** に localhost やプレースホルダー URL（`your-domain.com`）がバラバラにハードコードされていた。

### 🔍 根本原因

「本番URL は設定画面から入力してもらう」という設計だったが、初期値がすべて localhost になっており、かつ `chrome.storage.sync` / `local` の違いで値が正しく共有されていなかった。

### ✅ 正しいアプローチ

1. **本番 URL は全ファイルで定数 `VERCEL_URL` にまとめる**
2. **デフォルト値を最初から本番 URL にする**（開発時のみ手動切り替え）
3. URL が変わる際には関連する **全5ファイルを同時に更新する**
4. `host_permissions` に通信先ドメインを**必ず**追加する

---

## [2026-03-03] Extension context invalidated の無限ループ

### ❌ やってしまったこと

拡張機能を再読み込みした後、古いコンテンツスクリプトが `chrome.storage` を呼び続け、`Extension context invalidated` エラーが無限ループした。

### 🔍 根本原因

`visibilitychange` イベントリスナーが生き続けており、タブのフォーカス切り替えのたびに `startTracking` → `retryPendingLogs` → エラー を繰り返した。

### ✅ 正しいアプローチ

chrome API を呼ぶ前に必ずコンテキストの有効性チェックを行い、無効なら即座にトラッキングを停止する。

```js
function isExtensionContextValid() {
  try { return !!(chrome.runtime && chrome.runtime.id); }
  catch (e) { return false; }
}
```

また、**拡張機能の再読み込み後は、拡張機能の再読み込みだけでなくページ（タブ）自体の F5 リロードも必要**であることをユーザーに案内すること。

---

## [2026-03-03] Manifest V3 の CSP 違反（innerHTML）

### ❌ やってしまったこと

`popup.js` の `displayStats()` と `displayError()` で `innerHTML = テンプレートリテラル` を使った。

### 🔍 根本原因

Manifest V3 の Extension page では デフォルト CSP が `unsafe-eval` と `unsafe-inline` を禁止しており、`innerHTML` への動的 HTML 代入も該当する。

### ✅ 正しいアプローチ

`createElement` + `textContent` + `appendChild` で DOM を構築する。`innerHTML` は一切使わない。

---

## [過去] PostgreSQL プレースホルダーの間違い

### ❌ やってしまったこと

`?` プレースホルダーを使用してクエリを書いた。

### ✅ 正しいアプローチ

PostgreSQL（Neon）では `$1`, `$2` を使う。`?` は MySQL 構文。
