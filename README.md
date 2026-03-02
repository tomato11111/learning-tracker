# Passive Learning Tracker

**Version 2.1** (Bug Fix Release)

**入力ゼロの学習ログ** - 自動記録＆AI要約システム

> 📌 **v2.1 更新**: 長いURL（255文字超）の衝突バグを修正しました。詳細は [BUGFIX_v2.1.md](./BUGFIX_v2.1.md) をご覧ください。

---

## 概要

Passive Learning Trackerは、Webページの閲覧や動画視聴を自動的に記録し、AIが学習内容を要約するシステムです。

### 特徴

- 🤖 **完全自動記録**: Chrome拡張機能が学習活動を自動追跡
- 📊 **進捗可視化**: ダッシュボードで学習履歴を一覧表示
- 🧠 **AI要約**: Gemini APIが学習内容を自動要約
- 🎥 **YouTube対応**: 動画の再生位置を記録

---

## システム構成

```mermaid
graph TB
    subgraph Client["🖥️ クライアント"]
        EXT["Chrome拡張機能<br/>(Manifest V3)"]
        DASH["ダッシュボード<br/>(ブラウザ)"]
    end

    subgraph Render["☁️ Render.com (Web Service)"]
        SERVER["Node.js + Express<br/>サーバー"]
        SUMM["AI要約エンジン<br/>(summarizer.js)"]
    end

    subgraph Neon["🗄️ Neon (PostgreSQL)"]
        DB["learning_logs テーブル"]
    end

    subgraph External["🌐 外部API"]
        GEMINI["Google Gemini API<br/>(AI要約)"]
    end

    EXT -->|"POST /api/track<br/>学習データ送信"| SERVER
    DASH -->|"GET /api/logs<br/>GET /api/stats"| SERVER
    SERVER -->|"SQL クエリ"| DB
    SUMM -->|"未要約データ取得・更新"| DB
    SUMM -->|"テキスト要約リクエスト"| GEMINI
    SERVER -.->|"定期実行"| SUMM
```

---

## 技術スタック

| レイヤー | 技術 |
|----------|------|
| **Backend** | Node.js + Express |
| **Database** | PostgreSQL（[Neon](https://neon.tech)） |
| **Hosting** | [Render.com](https://render.com) |
| **Frontend** | Chrome Extension (Manifest V3) |
| **AI** | Google Gemini API |

---

## 本番環境へのデプロイ

### 前提条件

- [Render.com](https://render.com) アカウント
- [Neon](https://neon.tech) アカウント（PostgreSQL）
- Gemini API キー（[Google AI Studio](https://makersuite.google.com/app/apikey) で取得）

### 1. Neonでデータベースをセットアップ

1. Neon ダッシュボードでプロジェクトを作成
2. **SQL Editor** を開き、`schema.sql` の内容を実行してテーブルを作成
3. **Connection Details** から接続文字列（Connection String）をコピー

### 2. Renderにデプロイ

1. Render ダッシュボードで **New Web Service** を作成
2. GitHubリポジトリを連携
3. 以下の設定を入力：

| 項目 | 値 |
|------|----|
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Region** | `Singapore` |

4. **Environment Variables** に以下を設定：

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | NeonのConnection String |
| `GEMINI_API_KEY` | GeminiのAPIキー |
| `ALLOWED_ORIGINS` | `https://your-app.onrender.com` |
| `ENABLE_HTTPS_ONLY` | `true` |
| `PRODUCTION_URL` | `https://your-app.onrender.com` |

---

## ローカル開発環境のセットアップ

### 前提条件
- Node.js 16.0.0 以上
- PostgreSQL（またはNeon接続）
- Chrome ブラウザ
- Gemini API キー

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.example` をコピーして `.env` を作成し、必要な情報を入力してください。

```bash
cp .env.example .env
```

`.env` ファイルを編集：

```env
# Database Configuration (Neon)
DATABASE_URL=postgresql://user:password@ep-xxx.neon.tech/neondb?sslmode=require

# AI API Configuration
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. データベースのセットアップ

Neonの **SQL Editor** で `schema.sql` の内容を実行してテーブルを作成してください。

### 4. サーバーの起動

```bash
# 本番環境
npm start

# 開発環境（自動リロード）
npm run dev
```

サーバーは `http://localhost:3000` で起動します。

### 5. Chrome拡張機能のインストール

1. Chrome を開き、`chrome://extensions/` にアクセス
2. 右上の「デベロッパーモード」を有効にする
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. プロジェクトの `extension` フォルダを選択

### 6. AI要約の起動（オプション）

```bash
# 一度だけ実行
npm run summarize

# 5分ごとに自動実行
npm run summarize:cron
```

---

## API エンドポイント

### Health Check
```
GET /health
```
サーバーとデータベースの接続状態を確認

### 学習データの記録
```
POST /api/track
Content-Type: application/json

{
  "url": "https://example.com/article",
  "title": "記事タイトル",
  "progress_time": 120,
  "status": "in_progress"
}
```
学習データを記録（Upsert処理）

### 学習ログの取得
```
GET /api/logs?limit=50&offset=0
```
学習ログを取得（最新順）

### 統計情報の取得
```
GET /api/stats
```
総学習時間、ページ数、YouTube動画数、要約済みログ数を取得

### 特定ログの取得
```
GET /api/track/:id
```

### ログの削除
```
DELETE /api/track/:id
```

---

## プロジェクト構成

```
passive-learning-tracker/
├── server.js              # メインサーバー（Express）
├── routes.js              # APIルート定義
├── db.js                  # データベース接続管理（PostgreSQL）
├── summarizer.js          # AI要約エンジン
├── schema.sql             # PostgreSQLスキーマ
├── package.json           # 依存関係
├── .env                   # 環境変数（要作成）
├── .env.example           # 環境変数テンプレート
├── extension/             # Chrome拡張機能
│   ├── manifest.json      # 拡張機能マニフェスト
│   ├── content.js         # コンテンツスクリプト
│   ├── background.js      # バックグラウンドワーカー
│   ├── popup.html         # ポップアップUI
│   ├── popup.js           # ポップアップロジック
│   └── icons/             # アイコン画像
└── public/                # ダッシュボード
    ├── index.html         # メインページ
    ├── style.css          # スタイルシート
    └── app.js             # フロントエンドロジック
```

---

## 使い方

### 基本的な流れ

1. **サーバー起動**: `npm start` でバックエンドを起動
2. **拡張機能インストール**: Chrome拡張機能を読み込む
3. **自動記録**: Webページを閲覧すると自動的に記録開始
4. **ダッシュボード確認**: `http://localhost:3000` で学習履歴を確認
5. **AI要約生成**: `npm run summarize` で要約を生成

### 対応サイト

- ✅ YouTube（動画の再生位置を記録）
- ✅ Udemy, Coursera などの学習プラットフォーム
- ✅ 技術ブログ、ドキュメントサイト
- ✅ すべてのWebサイト

### ダッシュボード機能

- 📊 学習統計の表示（総時間、ページ数など）
- 📅 日付ごとにグループ化された学習履歴
- 🔍 タイトル・URLでリアルタイム検索
- 🧠 AI生成の要約表示
- 🔄 自動更新（5分ごと）

---

## トラブルシューティング

### データベース接続エラー

- `DATABASE_URL` が正しく設定されているか確認
- NeonダッシュボードでDBが起動しているか確認
- 接続文字列に `?sslmode=require` が含まれているか確認

### Chrome拡張機能が動作しない

1. `chrome://extensions/` で拡張機能が有効か確認
2. コンソールでエラーを確認
3. サーバーが正しく起動しているか確認

### AI要約が生成されない

1. `GEMINI_API_KEY` が正しく設定されているか確認
2. `npm run summarize` を手動実行してエラーを確認
3. Gemini API のクォータを確認

---

## 開発ロードマップ

- [x] Step 1: データベースとバックエンドの基盤構築
- [x] Step 2: データ受信エンドポイントの実装
- [x] Step 3: ブラウザ拡張機能の作成
- [x] Step 4: AI自動要約の実装
- [x] Step 5: ダッシュボード画面の作成

## 今後の機能追加予定

- [ ] YouTube 字幕の自動取得と要約
- [ ] 学習グラフ・統計の可視化
- [ ] タグ機能
- [ ] エクスポート機能（CSV, JSON）
- [ ] マルチユーザー対応

---

## ライセンス

MIT
