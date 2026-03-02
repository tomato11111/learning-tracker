# Passive Learning Tracker

**Version 2.1** (Bug Fix Release)

**入力ゼロの学習ログ** - 自動記録＆AI要約システム

---

## 概要

Passive Learning Trackerは、Webページの閲覧や動画視聴を自動的に記録し、AIが学習内容を要約するシステムです。

### 特徴

- 🤖 **完全自動記録**: Chrome拡張機能が学習活動を自動追跡
- 📊 **進捗可視化**: ダッシュボードで学習履歴を一覧表示
- 🧠 **AI要約**: OpenRouter APIが学習内容を自動要約
- 🎥 **YouTube対応**: 動画の再生位置を記録

---

## システム構成

```mermaid
graph TB
    subgraph Client["🖥️ クライアント"]
        EXT["Chrome拡張機能<br/>(Manifest V3)"]
        DASH["ダッシュボード<br/>(ブラウザ)"]
    end

    subgraph Vercel["☁️ Vercel (Serverless)"]
        SERVER["Node.js + Express<br/>サーバー"]
        CRON["Vercel Cron<br/>(5分ごと)"]
        SUMM["AI要約エンジン<br/>(summarizer.js)"]
    end

    subgraph Neon["🗄️ Neon (PostgreSQL)"]
        DB["learning_logs テーブル"]
    end

    subgraph External["🌐 外部API"]
        OPENROUTER["OpenRouter API<br/>(AI要約 / 無料枠あり)"]
    end

    EXT -->|"POST /api/track<br/>学習データ送信"| SERVER
    DASH -->|"GET /api/logs<br/>GET /api/stats"| SERVER
    SERVER -->|"SQL クエリ"| DB
    CRON -->|"GET /api/summarize"| SUMM
    SUMM -->|"未要約データ取得・更新"| DB
    SUMM -->|"テキスト要約リクエスト"| OPENROUTER
```

---

## 技術スタック

| レイヤー | 技術 |
|----------|------|
| **Backend** | Node.js + Express |
| **Database** | PostgreSQL（[Neon](https://neon.tech)） |
| **Hosting** | [Vercel](https://vercel.com)（無料） |
| **Frontend** | Chrome Extension (Manifest V3) |
| **AI** | [OpenRouter API](https://openrouter.ai)（無料枠対応） |

---

## 本番環境へのデプロイ（Vercel）

### 前提条件

- [Vercel](https://vercel.com) アカウント（無料）
- [Neon](https://neon.tech) アカウント（PostgreSQL・無料）
- [OpenRouter](https://openrouter.ai) APIキー（無料で取得可能）

### 1. Neonでデータベースをセットアップ

1. Neon ダッシュボードでプロジェクトを作成
2. **SQL Editor** を開き、`schema.sql` の内容を実行してテーブルを作成
3. **Connection Details** から接続文字列（Connection String）をコピー

### 2. Vercelにデプロイ

```bash
# Vercel CLIをインストール
npm i -g vercel

# デプロイ
vercel
```

または GitHub リポジトリを [Vercel ダッシュボード](https://vercel.com/dashboard) から連携してください。

| 項目 | 値 |
|------|-----|
| **Framework Preset** | `Other` |
| **Root Directory** | `./` |
| **Install Command** | `npm install` |
| **Output Directory** | （空欄） |

### 3. 環境変数の設定

Vercel ダッシュボードの **Settings > Environment Variables** に以下を設定：

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | NeonのConnection String |
| `OPENROUTER_API_KEY` | OpenRouterのAPIキー |
| `ALLOWED_ORIGINS` | `https://your-app.vercel.app` |
| `PRODUCTION_URL` | `https://your-app.vercel.app` |

### 4. AI要約（Vercel Cron）

`vercel.json` に設定済みのため、**デプロイ後に自動的に5分ごと**に `/api/summarize` が実行されます。

> ⚠️ Vercel Cron は **Hobby プラン**でも無料で利用可能です。

---

## ローカル開発環境のセットアップ

### 前提条件
- Node.js 16.0.0 以上
- PostgreSQL（またはNeon接続）
- Chrome ブラウザ
- [OpenRouter](https://openrouter.ai) APIキー

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.example` をコピーして `.env` を作成：

```bash
cp .env.example .env
```

`.env` を編集：

```env
DATABASE_URL=postgresql://user:password@ep-xxx.neon.tech/neondb?sslmode=require
OPENROUTER_API_KEY=your_openrouter_api_key_here
PRODUCTION_URL=http://localhost:3000
```

### 3. データベースのセットアップ

Neonの **SQL Editor** で `schema.sql` の内容を実行してください。

### 4. サーバーの起動

```bash
# 開発環境（自動リロード）
npm run dev

# 本番環境
npm start
```

サーバーは `http://localhost:3000` で起動します。

### 5. Chrome拡張機能のインストール

1. Chrome を開き、`chrome://extensions/` にアクセス
2. 右上の「デベロッパーモード」を有効にする
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. プロジェクトの `extension` フォルダを選択

### 6. AI要約の起動（ローカル）

```bash
# 一度だけ実行
npm run summarize

# 5分ごとに自動実行
npm run summarize:cron
```

> 本番環境（Vercel）では Cron が自動実行されるため不要です。

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

### 学習ログの取得
```
GET /api/logs?limit=50&offset=0
```

### 統計情報の取得
```
GET /api/stats
```

### AI要約のトリガー（手動 or Vercel Cron）
```
GET /api/summarize
```

### ページネーション付きログ
```
GET /api/logs/paginated?page=1&limit=20&status=all&search=keyword
```

### 分析データ
```
GET /api/analytics/heatmap?days=365
GET /api/analytics/trends?period=weekly&limit=12
```

### 特定ログの取得・削除
```
GET    /api/track/:id
DELETE /api/track/:id
```

---

## プロジェクト構成

```
passive-learning-tracker/
├── server.js              # メインサーバー（Express）
├── routes.js              # APIルート定義
├── db.js                  # データベース接続管理（PostgreSQL）
├── summarizer.js          # AI要約エンジン（OpenRouter）
├── schema.sql             # PostgreSQLスキーマ
├── vercel.json            # Vercel設定（ルーティング + Cron）
├── package.json           # 依存関係
├── .env                   # 環境変数（要作成）
├── .env.example           # 環境変数テンプレート
├── extension/             # Chrome拡張機能
│   ├── manifest.json      # 拡張機能マニフェスト
│   ├── content.js         # コンテンツスクリプト
│   ├── background.js      # バックグラウンドワーカー
│   ├── config.js          # API設定
│   ├── popup.html         # ポップアップUI
│   ├── popup.js           # ポップアップロジック
│   ├── settings.html      # 設定画面
│   ├── settings.js        # 設定ロジック
│   └── icons/             # アイコン画像
└── public/                # ダッシュボード
    ├── index.html         # メインページ
    ├── style.css          # スタイルシート
    └── app.js             # フロントエンドロジック
```

---

## 使い方

### 基本的な流れ

1. **デプロイ**: Vercelにデプロイしてサーバーを起動
2. **拡張機能インストール**: Chrome拡張機能を読み込む（`extension/config.js` のURLをVercelのURLに変更）
3. **自動記録**: Webページを閲覧すると自動的に記録開始
4. **ダッシュボード確認**: Vercelの URL で学習履歴を確認
5. **AI要約**: 5分ごとに自動生成（`/api/summarize` 手動実行も可）

### 拡張機能のURL設定

`extension/config.js` の `PRODUCTION_URL` をVercelのデプロイ先URLに変更してください。

または Chrome拡張機能の設定画面（`settings.html`）から変更できます。

---

## トラブルシューティング

### データベース接続エラー

- `DATABASE_URL` が正しく設定されているか確認
- NeonダッシュボードでDBが起動しているか確認
- 接続文字列に `?sslmode=require` が含まれているか確認

### Chrome拡張機能が動作しない

1. `chrome://extensions/` で拡張機能が有効か確認
2. コンソールでエラーを確認
3. サーバーが正しく起動しているか確認（設定のAPIエンドポイントURL）

### AI要約が生成されない

1. `OPENROUTER_API_KEY` が正しく設定されているか確認
2. `/api/summarize` を手動でアクセスしてエラーを確認
3. [OpenRouter ダッシュボード](https://openrouter.ai/activity) でAPIの使用状況を確認
4. 無料枠の上限（20リクエスト/分・200リクエスト/日）に達していないか確認

### Vercel Cron が動作しない

1. Vercel ダッシュボードの **Settings > Cron Jobs** でスケジュールを確認
2. 関数のタイムアウト（10秒）を超えていないか確認（バッチサイズを小さくする）

---

## 開発ロードマップ

- [x] Step 1: データベースとバックエンドの基盤構築
- [x] Step 2: データ受信エンドポイントの実装
- [x] Step 3: ブラウザ拡張機能の作成
- [x] Step 4: AI自動要約の実装
- [x] Step 5: ダッシュボード画面の作成
- [x] Step 6: Vercel対応（Cron・サーバーレス）

## 今後の機能追加予定

- [ ] YouTube 字幕の自動取得と要約
- [ ] 学習グラフ・統計の可視化
- [ ] タグ機能
- [ ] エクスポート機能（CSV, JSON）
- [ ] マルチユーザー対応

---

## ライセンス

MIT
