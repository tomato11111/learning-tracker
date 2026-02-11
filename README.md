# Passive Learning Tracker

**入力ゼロの学習ログ** - 自動記録＆AI要約システム

## 概要

Passive Learning Trackerは、Webページの閲覧や動画視聴を自動的に記録し、AIが学習内容を要約するシステムです。

### 特徴

- 🤖 **完全自動記録**: Chrome拡張機能が学習活動を自動追跡
- 📊 **進捗可視化**: ダッシュボードで学習履歴を一覧表示
- 🧠 **AI要約**: Gemini APIが学習内容を自動要約
- 🎥 **YouTube対応**: 動画の再生位置を記録

## 技術スタック

- **Backend**: Node.js + Express
- **Database**: MySQL
- **Frontend**: Chrome Extension (Manifest V3)
- **AI**: Google Gemini API

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.example` をコピーして `.env` を作成し、必要な情報を入力してください。

```bash
cp .env.example .env
```

### 3. データベースのセットアップ

```bash
# MySQLにログイン
mysql -u root -p

# スキーマの実行
source schema.sql
```

または

```bash
npm run db:setup
```

### 4. サーバーの起動

```bash
# 本番環境
npm start

# 開発環境（自動リロード）
npm run dev
```

サーバーは `http://localhost:3000` で起動します。

## API エンドポイント

### Health Check
```
GET /health
```

### 学習データの記録
```
POST /api/track
Content-Type: application/json

{
  "url": "https://example.com/article",
  "title": "記事タイトル",
  "progress_time": 120
}
```

### 学習ログの取得
```
GET /api/logs?limit=50&offset=0
```

## プロジェクト構成

```
.
├── server.js           # メインサーバーファイル
├── db.js              # データベース接続管理
├── schema.sql         # データベーススキーマ
├── summarizer.js      # AI要約エンジン（Step 4で実装）
├── package.json       # 依存関係
├── .env              # 環境変数（要作成）
├── .env.example      # 環境変数のテンプレート
├── extension/        # Chrome拡張機能（Step 3で実装）
│   ├── manifest.json
│   ├── content.js
│   └── background.js
└── public/           # ダッシュボード（Step 5で実装）
    ├── index.html
    ├── style.css
    └── app.js
```

## 開発ロードマップ

- [x] Step 1: データベースとバックエンドの基盤構築
- [ ] Step 2: データ受信エンドポイントの実装
- [ ] Step 3: ブラウザ拡張機能の作成
- [ ] Step 4: AI自動要約の実装
- [ ] Step 5: ダッシュボード画面の作成

## ライセンス

MIT
