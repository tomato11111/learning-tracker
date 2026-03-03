---
description: Chrome拡張機能（Manifest V3）開発の注意点と実装制約
---

# Chrome Extension Manifest V3 — 実装スキル

このプロジェクトは **Chrome Extension Manifest V3** を使用している。
V3 特有の制約を必ず把握してから実装すること。

---

## 1. host_permissions の設定

Service Worker（background.js）から `fetch` を行う場合、通信先 URL を **`host_permissions`** に含める必要がある。

```json
// ✅ 正しい manifest.json
"host_permissions": [
  "http://localhost:3000/*",
  "https://your-vercel-app.vercel.app/*"
],
"optional_host_permissions": [
  "https://*/*"
]
```

> ⚠️ `optional_host_permissions` のみの URL には、ユーザーが明示的に許可しない限り Service Worker からの fetch がブロックされる。

---

## 2. Extension CSP（Content Security Policy）

Manifest V3 の Extension page（popup.html・settings.html）では **デフォルト CSP が厳格**。

### ❌ 禁止されること

```js
// innerHTML への動的 HTML 代入は CSP 違反
element.innerHTML = `<div>${userContent}</div>`;

// eval / new Function() も禁止
eval('code');
new Function('return 1')();
```

### ✅ 代わりに使うこと

```js
// DOM操作で構築する
const div = document.createElement('div');
div.textContent = userContent;  // ← textContent は安全
parent.appendChild(div);
```

---

## 3. Extension context のライフサイクル

拡張機能を **`chrome://extensions` で再読み込み**した後、既に開いているタブで動いている古いコンテンツスクリプトは無効になる。

### 症状
```
Error: Extension context invalidated.
```

### 対策

chrome API 呼び出し前に必ずコンテキストチェックを行うこと：

```js
function isExtensionContextValid() {
  try { return !!(chrome.runtime && chrome.runtime.id); }
  catch (e) { return false; }
}

async function retryPendingLogs() {
  if (!isExtensionContextValid()) {
    stopTracking();
    return;
  }
  // ... 処理
}
```

### ユーザーへの案内

拡張機能を更新したとき、ユーザーには以下を案内すること：
1. `chrome://extensions` で拡張機能を「再読み込み」
2. **開いているすべてのタブを F5 でリロード**

---

## 4. Storage の使い分け

| API | 特徴 | 用途 |
|-----|------|------|
| `chrome.storage.sync` | ブラウザ間で同期 | ユーザー設定（APIエンドポイント等） |
| `chrome.storage.local` | このブラウザのみ | 送信待ちキャッシュ等 |

> ⚠️ `background.js` が `local` に書いたデータを `content.js` が `sync` から読もうとするミスに注意。

---

## 5. URL 管理ルール

**全ファイルで本番 URL を定数化する。デフォルトは常に本番 URL。**

```js
// ✅ 各ファイルの先頭に定義する
const VERCEL_URL = 'https://your-app.vercel.app';

// ✅ ストレージに設定がなければ本番をデフォルトにする
const apiEndpoint = stored.apiEndpoint || `${VERCEL_URL}/api/track`;
```

URL が変わる場合は **以下5ファイルを必ず同時に更新**する：
1. `manifest.json` — `host_permissions`
2. `background.js` — `VERCEL_URL` 定数・初期設定値
3. `content.js` — `VERCEL_URL` 定数
4. `popup.js` — `VERCEL_URL` 定数
5. `settings.js` — `ENV_DEFAULTS.production.apiEndpoint`

---

## 6. Content Script の権限とページインジェクション

```json
// manifest.json のcontent_scripts.matches は注入先（どのページで動かすか）
// host_permissions は fetch先（どこに通信できるか）
// この2つは独立している
"content_scripts": [{ "matches": ["https://*/*"] }],
"host_permissions": ["https://your-api.com/*"]
```
