# 環境変数設定ガイド

Passive Learning Tracker で使用する環境変数の詳細な説明です。

---

## 📋 環境変数一覧

### サーバー設定

| 変数名 | 必須 | デフォルト値 | 説明 |
|--------|------|-------------|------|
| `NODE_ENV` | ❌ | `development` | 実行環境（`development` / `production`） |
| `PORT` | ❌ | `3000` | サーバーのポート番号 |
| `PRODUCTION_URL` | ⚠️ | `http://localhost:3000` | 本番環境のURL（CORS設定に使用） |

### データベース設定

| 変数名 | 必須 | デフォルト値 | 説明 |
|--------|------|-------------|------|
| `DB_HOST` | ✅ | `localhost` | MySQLホスト名 |
| `DB_PORT` | ❌ | `3306` | MySQLポート番号 |
| `DB_USER` | ✅ | `root` | MySQLユーザー名 |
| `DB_PASSWORD` | ✅ | - | MySQLパスワード |
| `DB_NAME` | ✅ | `passive_learning_tracker` | データベース名 |
| `DB_SSL` | ❌ | `false` | SSL接続を有効化（`true` / `false`） |

### AI API設定

| 変数名 | 必須 | デフォルト値 | 説明 |
|--------|------|-------------|------|
| `GEMINI_API_KEY` | ✅ | - | Google Gemini APIキー（[取得方法](#gemini-apiキーの取得)） |
| `CLAUDE_API_KEY` | ❌ | - | Claude APIキー（オプション） |

### セキュリティ設定

| 変数名 | 必須 | デフォルト値 | 説明 |
|--------|------|-------------|------|
| `ALLOWED_ORIGINS` | ⚠️ | `chrome-extension://,http://localhost:3000` | CORS許可オリジン（カンマ区切り） |
| `ENABLE_HTTPS_ONLY` | ❌ | `false` | HTTPS強制（本番環境では `true` 推奨） |

### ログ設定

| 変数名 | 必須 | デフォルト値 | 説明 |
|--------|------|-------------|------|
| `LOG_LEVEL` | ❌ | `info` | ログレベル（`error` / `warn` / `info` / `debug`） |

---

## 🔧 環境別の設定例

### 開発環境（ローカル）

`.env` ファイル:

```env
# Server
NODE_ENV=development
PORT=3000
PRODUCTION_URL=http://localhost:3000

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_local_password
DB_NAME=passive_learning_tracker
DB_SSL=false

# AI API
GEMINI_API_KEY=your_gemini_api_key_here

# CORS
ALLOWED_ORIGINS=chrome-extension://,http://localhost:3000

# Security
ENABLE_HTTPS_ONLY=false

# Logging
LOG_LEVEL=debug
```

### 本番環境（Hostinger）

hPanel の環境変数設定:

```env
# Server
NODE_ENV=production
PORT=3000
PRODUCTION_URL=https://learning-tracker.yourdomain.com

# Database (Hostinger提供の情報)
DB_HOST=localhost
DB_PORT=3306
DB_USER=u123456789_dbuser
DB_PASSWORD=strong_random_password_here
DB_NAME=u123456789_learning_tracker
DB_SSL=false

# AI API
GEMINI_API_KEY=your_gemini_api_key_here

# CORS
ALLOWED_ORIGINS=chrome-extension://,https://learning-tracker.yourdomain.com

# Security
ENABLE_HTTPS_ONLY=true

# Logging
LOG_LEVEL=error
```

---

## 📖 詳細説明

### `NODE_ENV`

実行環境を指定します。この設定により、アプリケーションの動作が変わります。

- **`development`**: 開発モード
  - 詳細なログ出力
  - エラースタックトレース表示
  - 開発用のCORS設定

- **`production`**: 本番モード
  - 最小限のログ出力
  - エラー詳細を非表示
  - パフォーマンス最適化

### `ALLOWED_ORIGINS`

CORS（Cross-Origin Resource Sharing）で許可するオリジンを指定します。

**形式**: カンマ区切りのURL（スペースなし）

**例**:
```env
# 開発環境
ALLOWED_ORIGINS=chrome-extension://,http://localhost:3000

# 本番環境
ALLOWED_ORIGINS=chrome-extension://,https://your-domain.com

# 複数ドメイン
ALLOWED_ORIGINS=chrome-extension://,https://app.yourdomain.com,https://dashboard.yourdomain.com

# ワイルドカード（サブドメイン）
ALLOWED_ORIGINS=chrome-extension://,https://*.yourdomain.com
```

### `DB_SSL`

データベース接続でSSLを使用するかどうかを指定します。

- **`false`**: SSL未使用（Hostingerの場合、通常はこれ）
- **`true`**: SSL使用（リモートDBやクラウドDBの場合）

### `ENABLE_HTTPS_ONLY`

HTTPSを強制するかどうかを指定します。

- **`false`**: HTTP/HTTPS両方を許可
- **`true`**: HTTPSのみ許可（推奨：本番環境）

---

## 🔑 Gemini APIキーの取得

1. **Google AI Studio にアクセス**
   - https://makersuite.google.com/app/apikey

2. **「Create API Key」をクリック**

3. **生成されたAPIキーをコピー**

4. **環境変数に設定**
   ```env
   GEMINI_API_KEY=AIzaSy...（生成されたキー）
   ```

5. **無料枠の制限**
   - 1分あたり60リクエスト
   - 1日あたり1,500リクエスト
   - 超過した場合はエラーが返されます

---

## 🚨 セキュリティ上の注意

### ❌ やってはいけないこと

1. **`.env` ファイルを Git にコミットしない**
   ```bash
   # .gitignore に必ず追加
   .env
   .env.local
   .env.production
   ```

2. **APIキーをコード内にハードコーディングしない**
   ```javascript
   // ❌ 悪い例
   const API_KEY = 'AIzaSy1234567890abcdef';
   
   // ✅ 良い例
   const API_KEY = process.env.GEMINI_API_KEY;
   ```

3. **本番環境の設定を公開しない**
   - GitHub, Slack, Discord などに貼り付けない
   - スクリーンショットに含めない

### ✅ やるべきこと

1. **強力なパスワードを使用**
   ```bash
   # パスワード生成例
   openssl rand -base64 32
   ```

2. **定期的にAPIキーをローテーション**

3. **環境変数の暗号化**（可能な場合）

4. **アクセス制限**
   - IPアドレス制限
   - API キーのリファラー制限

---

## 🧪 設定の確認

### ローカル環境で確認

```bash
# .env ファイルを読み込んで確認
cd /home/user/webapp
node -e "require('dotenv').config(); console.log(process.env)"
```

### 本番環境で確認

```bash
# hPanel の SSH で確認
printenv | grep -E '(NODE_ENV|DB_|GEMINI_|ALLOWED_)'
```

### アプリケーション起動時のログで確認

```bash
npm start
# 以下のようなログが出力されます:
# 🔒 Allowed Origins: chrome-extension://,https://your-domain.com
# 🌍 Environment: production
# 📊 Database Config: { host: 'localhost', ... }
```

---

## 🔄 環境変数の変更

### ローカル環境

1. `.env` ファイルを編集
2. アプリケーションを再起動
   ```bash
   # Ctrl+C で停止して再度起動
   npm start
   ```

### Hostinger（本番環境）

1. hPanel にログイン
2. 「Node.js」→ 対象のアプリケーション
3. 「Environment Variables」タブ
4. 変数を編集・追加
5. 「Restart Application」をクリック

---

## ❓ FAQ

### Q: `.env` ファイルが読み込まれない

**A**: 以下を確認してください:
- ファイル名が `.env` （ドットで始まる）
- ファイルがプロジェクトのルートディレクトリにある
- `dotenv` がインストールされている: `npm install dotenv`

### Q: Hostinger で環境変数が反映されない

**A**: アプリケーションの再起動が必要です:
1. hPanel で「Restart Application」
2. または SSH で: `touch tmp/restart.txt`

### Q: CORS エラーが出る

**A**: `ALLOWED_ORIGINS` を確認:
```env
# 本番ドメインを追加
ALLOWED_ORIGINS=chrome-extension://,https://your-actual-domain.com
```

### Q: データベースに接続できない

**A**: 以下を確認:
1. `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` が正しいか
2. データベースが作成されているか（phpMyAdmin で確認）
3. ユーザーに権限があるか

---

## 📚 関連ドキュメント

- [デプロイガイド](./DEPLOY_HOSTINGER.md)
- [README](./README.md)
- [プロジェクトサマリー](./PROJECT_SUMMARY.md)

---

**環境変数の設定は完了です！** 🎉
