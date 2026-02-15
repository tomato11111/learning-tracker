# Bug Fix v2.1: URL制約の修正

## 📋 概要

長いURL（255文字超）で発生する可能性のある衝突バグを修正しました。

## 🐛 修正したバグ

### 問題
- **影響度**: 🟠 Major
- **症状**: 255文字を超えるURLで、先頭255文字が同じURLが同一ページとして誤認識される
- **原因**: `UNIQUE KEY unique_url (url(255))` の制約により、URLの先頭255文字のみで一意性を判定していた

### 例
```
URL1: https://example.com/article?param1=value1&param2=aaa...（300文字）
URL2: https://example.com/article?param1=value1&param2=bbb...（300文字）
→ 先頭255文字が同じため、同一ページとして扱われてしまう
```

## ✅ 実装した解決策

### 1. データベーススキーマの変更

**新規追加:**
- `url_hash` カラム: SHA256ハッシュ値（64文字の16進数）

**変更:**
- 旧制約 `UNIQUE KEY unique_url (url(255))` を削除
- 新制約 `UNIQUE KEY unique_url_hash (url_hash)` を追加

**マイグレーションファイル:**
- `migrations/002_fix_url_constraint.sql`

### 2. バックエンドの変更

**routes.js:**
- `calculateUrlHash()` 関数を追加
- `POST /api/track` エンドポイントで `url_hash` を計算して挿入
- Upsert処理を `url_hash` ベースに変更

### 3. 検証スクリプト

**scripts/verify_url_fix.js:**
- 長いURLの衝突テスト
- 重複URLの正しい処理テスト
- ハッシュ計算の正確性テスト

## 🚀 デプロイ手順

### ステップ1: データベースマイグレーション

```bash
# ローカル環境
cd /home/user/webapp
mysql -u root -p < migrations/002_fix_url_constraint.sql

# Hostinger環境
# phpMyAdminまたはSSH経由でSQLファイルを実行
```

### ステップ2: コードのデプロイ

```bash
# GitHubからプル
git pull origin main

# 依存関係の確認（変更なし）
npm install

# サーバー再起動
npm restart  # または pm2 restart passive-learning-tracker
```

### ステップ3: 検証

```bash
# 検証スクリプトの実行
cd /home/user/webapp
node scripts/verify_url_fix.js

# テストデータを保持する場合
node scripts/verify_url_fix.js --keep-data
```

## 📊 期待される結果

### マイグレーション後
```sql
-- 検証クエリ
SELECT 
  COUNT(*) as total_records,
  COUNT(DISTINCT url) as unique_urls,
  COUNT(DISTINCT url_hash) as unique_hashes
FROM learning_logs;

-- 期待: unique_urls = unique_hashes
```

### 検証スクリプト実行後
```
✅ テスト成功: URL制約が正しく機能しています！
期待される一意のURL数: 5
実際の一意のハッシュ数: 5
```

## 🔄 既存データへの影響

### データ損失: なし
- 既存の `url` カラムはそのまま保持
- `url_hash` カラムを新規追加
- マイグレーション時に既存レコードの `url_hash` を自動計算

### パフォーマンス: 向上
- CHAR(64) の固定長ハッシュによるインデックス効率の向上
- VARCHAR(2048) の可変長URLインデックスより高速

## 📝 技術詳細

### SHA256ハッシュの利点
1. **衝突耐性**: 実質的に衝突なし（2^256の組み合わせ）
2. **固定長**: 常に64文字（インデックス効率が高い）
3. **高速**: Node.js標準ライブラリで高速計算

### コード例

```javascript
const crypto = require('crypto');

function calculateUrlHash(url) {
  return crypto.createHash('sha256').update(url).digest('hex');
}

// 例
const url = 'https://example.com/very/long/url/...';
const hash = calculateUrlHash(url);
console.log(hash); 
// => "a3b2c1d4e5f6..." (64文字の16進数)
```

## 🔍 検証項目

- [x] 255文字を超えるURLが個別に記録される
- [x] 完全に同じURLは1レコードに統合される
- [x] url_hashが正しく計算される
- [x] 既存データが保持される
- [x] パフォーマンスが維持または向上する

## 🎯 次のステップ

1. **本番環境へのデプロイ**
   - Hostingerでマイグレーション実行
   - サーバー再起動
   - 検証スクリプト実行

2. **モニタリング**
   - 数日間のログ記録を観察
   - URL衝突エラーがないことを確認

3. **追加の改善（オプション）**
   - YouTube学習時間の検証（実際にバグが発生した場合）
   - AI要約のフォールバック改善

## 📞 サポート

問題が発生した場合:
1. 検証スクリプトを実行してログを確認
2. データベースの統計情報を確認
3. GitHubのIssueで報告

---

**リリース日**: 2026-02-15  
**バージョン**: v2.1  
**影響**: すべてのURL記録機能
