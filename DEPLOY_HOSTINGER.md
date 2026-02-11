# Hostinger Business プランへのデプロイガイド

このガイドでは、Passive Learning Tracker を Hostinger Business プランにデプロイする手順を説明します。

---

## 📋 前提条件

- Hostinger Business プランのアカウント
- GitHubアカウント（リポジトリ: `tomato11111/learning-tracker`）
- Gemini API キー
- ドメイン（例: `learning-tracker.yourdomain.com`）

---

## 🚀 デプロイ手順

### Step 1: hPanel にログイン

1. [Hostinger hPanel](https://hpanel.hostinger.com/) にログイン
2. 対象のWebサイトを選択

### Step 2: Node.js アプリケーションのセットアップ

1. **hPanel で「Advanced」→「Node.js」を選択**

2. **「Create Application」をクリック**

3. **アプリケーション設定:**
   - **Application Mode**: Production
   - **Application Root**: `public_html/learning-tracker`（または任意のディレクトリ）
   - **Application URL**: `https://learning-tracker.yourdomain.com`
   - **Application Startup File**: `server.js`
   - **Node.js Version**: 18.x 以上

4. **「Create」をクリック**

### Step 3: Git リポジトリの接続

1. **「Git」タブをクリック**

2. **リポジトリ情報を入力:**
   - **Repository URL**: `https://github.com/tomato11111/learning-tracker.git`
   - **Branch**: `main`

3. **デプロイキーの設定:**
   - hPanel で生成された SSH キーを GitHub リポジトリの Deploy Keys に追加
   - GitHub リポジトリ → Settings → Deploy keys → Add deploy key

4. **「Pull」をクリックしてコードをデプロイ**

### Step 4: 環境変数の設定

1. **「Environment Variables」タブをクリック**

2. **以下の環境変数を追加:**

```env
NODE_ENV=production
PORT=3000
PRODUCTION_URL=https://learning-tracker.yourdomain.com

# Database (hPanel の MySQL 情報を使用)
DB_HOST=localhost
DB_PORT=3306
DB_USER=u123456789_dbuser
DB_PASSWORD=your_database_password
DB_NAME=u123456789_learning_tracker
DB_SSL=false

# Gemini API
GEMINI_API_KEY=your_gemini_api_key_here

# CORS Settings
ALLOWED_ORIGINS=chrome-extension://,https://learning-tracker.yourdomain.com

# Security
ENABLE_HTTPS_ONLY=true

# Logging
LOG_LEVEL=error
```

3. **「Save」をクリック**

### Step 5: データベースのセットアップ

1. **hPanel で「Databases」→「MySQL Databases」を選択**

2. **新しいデータベースを作成:**
   - Database Name: `u123456789_learning_tracker`
   - User: `u123456789_dbuser`
   - Password: 強力なパスワードを生成

3. **phpMyAdmin を開く**

4. **作成したデータベースを選択し、「SQL」タブをクリック**

5. **`schema.sql` の内容を貼り付けて実行:**
   - GitHubリポジトリから `schema.sql` をコピー
   - 「USE passive_learning_tracker;」の行を削除（データベースは既に選択済み）
   - 「実行」をクリック

### Step 6: 依存関係のインストール

1. **hPanel の「Node.js」タブに戻る**

2. **「Run npm install」をクリック**
   - または SSH経由で: `cd ~/public_html/learning-tracker && npm install`

### Step 7: アプリケーションの起動

1. **「Start Application」をクリック**

2. **ステータスが「Running」になることを確認**

3. **ブラウザで `https://learning-tracker.yourdomain.com/health` にアクセス**
   - 正常に動作していれば、以下のようなレスポンスが返ります:
   ```json
   {
     "status": "ok",
     "timestamp": "2024-...",
     "database": "connected"
   }
   ```

### Step 8: SSL証明書の設定

1. **hPanel で「Advanced」→「SSL」を選択**

2. **Let's Encrypt SSL を有効化:**
   - ドメインを選択
   - 「Install」をクリック

3. **HTTPS のみを強制:**
   - 「Force HTTPS」オプションを有効化

---

## 🔧 Chrome拡張機能の設定

アプリケーションがデプロイされたら、Chrome拡張機能を本番環境用に設定します。

1. **Chrome拡張機能をインストール済みの場合:**
   - 拡張機能アイコンを右クリック → 「オプション」
   - 環境: **本番環境** を選択
   - API エンドポイント: `https://learning-tracker.yourdomain.com/api/track`
   - 「設定を保存」をクリック

2. **ページをリロード**すると、本番環境のAPIに接続されます

---

## 🧪 動作確認

### 1. ヘルスチェック
```bash
curl https://learning-tracker.yourdomain.com/health
```

### 2. ダッシュボードアクセス
```
https://learning-tracker.yourdomain.com/
```

### 3. Chrome拡張機能のテスト
- 任意のWebページを閲覧
- 1分後にダッシュボードで学習ログが表示されることを確認

### 4. AI要約のテスト
SSH経由で実行:
```bash
cd ~/public_html/learning-tracker
node summarizer.js
```

---

## 🔄 継続的デプロイ（自動更新）

GitHubにプッシュするたびに自動デプロイする場合:

1. **hPanel で「Git」→「Auto Deploy」を有効化**

2. **Webhook URL をコピー**

3. **GitHub リポジトリに設定:**
   - Settings → Webhooks → Add webhook
   - Payload URL: hPanel でコピーした URL
   - Content type: `application/json`
   - Events: `Just the push event`

これで、`git push` するたびに自動的にデプロイされます。

---

## 📊 ログの確認

### アプリケーションログ
```bash
cd ~/public_html/learning-tracker
tail -f logs/app.log  # ログファイルがある場合
```

### hPanel でのログ確認
1. 「Node.js」タブ
2. 「View Logs」をクリック

---

## 🐛 トラブルシューティング

### アプリケーションが起動しない

**原因1: 依存関係の問題**
```bash
cd ~/public_html/learning-tracker
npm install
```

**原因2: ポートの競合**
- hPanel で割り当てられたポートを確認
- 環境変数 `PORT` が正しく設定されているか確認

**原因3: データベース接続エラー**
- 環境変数の `DB_*` が正しいか確認
- phpMyAdmin でデータベースが存在するか確認

### CORS エラー

Chrome拡張機能から接続できない場合:
1. 環境変数 `ALLOWED_ORIGINS` に本番ドメインが含まれているか確認
2. アプリケーションを再起動

### AI要約が動作しない

1. `GEMINI_API_KEY` が正しく設定されているか確認
2. SSH経由で手動実行してエラーを確認:
   ```bash
   node summarizer.js
   ```

---

## 🔐 セキュリティのベストプラクティス

1. **環境変数に機密情報を保存**
   - `.env` ファイルは使用しない（hPanel の環境変数機能を使用）

2. **強力なデータベースパスワードを使用**

3. **HTTPS を強制**
   - `ENABLE_HTTPS_ONLY=true`

4. **定期的なバックアップ**
   - hPanel の「Backups」機能を使用

5. **アクセスログの監視**

---

## 📞 サポート

問題が発生した場合:
1. GitHub Issues: https://github.com/tomato11111/learning-tracker/issues
2. Hostinger サポート: https://www.hostinger.com/support

---

**デプロイ完了！** 🎉

ダッシュボード: https://learning-tracker.yourdomain.com/
