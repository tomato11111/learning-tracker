/**
 * Verification Script: URL Constraint Fix
 * 
 * このスクリプトは、URL制約の修正が正しく動作することを検証します。
 * 
 * テスト内容:
 * 1. 255文字を超えるURLで、先頭255文字が同じ2つのURLが別レコードとして扱われるか
 * 2. 完全に同じURLは1つのレコードとして扱われるか（重複排除）
 * 3. url_hashが正しく計算されているか
 */

const crypto = require('crypto');
const db = require('../db');

// テスト用の長いURL（255文字を超えるURL）
const BASE_URL = 'https://example.com/very/long/path/to/article/';
const COMMON_PREFIX = 'a'.repeat(200); // 200文字の共通部分

const TEST_URLS = [
  // 255文字を超えるURL、先頭255文字は同じだが末尾が異なる
  BASE_URL + COMMON_PREFIX + '?param1=value1&param2=value2',
  BASE_URL + COMMON_PREFIX + '?param1=value1&param2=different',
  
  // 完全に同じURL（重複テスト用）
  'https://example.com/duplicate-test',
  'https://example.com/duplicate-test',
  
  // 通常の短いURL
  'https://example.com/short-url',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
];

/**
 * URLのSHA256ハッシュを計算
 */
function calculateUrlHash(url) {
  return crypto.createHash('sha256').update(url).digest('hex');
}

/**
 * テストデータを挿入
 */
async function insertTestData() {
  console.log('\n📝 テストデータの挿入中...\n');
  
  const results = [];
  
  for (let i = 0; i < TEST_URLS.length; i++) {
    const url = TEST_URLS[i];
    const urlHash = calculateUrlHash(url);
    const title = `Test Page ${i + 1}`;
    
    try {
      const sql = `
        INSERT INTO learning_logs (url, url_hash, title, progress_time, status)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          progress_time = progress_time + VALUES(progress_time),
          updated_at = CURRENT_TIMESTAMP
      `;
      
      const result = await db.query(sql, [url, urlHash, title, 10, 'in_progress']);
      
      const action = result.insertId ? '新規挿入' : '既存更新';
      console.log(`${action}: ${title}`);
      console.log(`  URL: ${url.substring(0, 80)}${url.length > 80 ? '...' : ''}`);
      console.log(`  Hash: ${urlHash.substring(0, 16)}...`);
      
      results.push({
        url,
        urlHash,
        title,
        action,
        insertId: result.insertId
      });
      
    } catch (error) {
      console.error(`❌ エラー: ${title}`);
      console.error(`   ${error.message}`);
    }
  }
  
  return results;
}

/**
 * 検証クエリを実行
 */
async function verifyResults() {
  console.log('\n\n🔍 検証中...\n');
  
  // テスト1: 総レコード数と一意のURL数
  const [stats] = await db.query(`
    SELECT 
      COUNT(*) as total_records,
      COUNT(DISTINCT url) as unique_urls,
      COUNT(DISTINCT url_hash) as unique_hashes
    FROM learning_logs
    WHERE title LIKE 'Test Page%'
  `);
  
  console.log('📊 統計情報:');
  console.log(`  総レコード数: ${stats[0].total_records}`);
  console.log(`  一意のURL数: ${stats[0].unique_urls}`);
  console.log(`  一意のハッシュ数: ${stats[0].unique_hashes}`);
  
  // テスト2: 長いURLの詳細
  const [longUrls] = await db.query(`
    SELECT id, url, url_hash, title, progress_time
    FROM learning_logs
    WHERE CHAR_LENGTH(url) > 255
    AND title LIKE 'Test Page%'
    ORDER BY id
  `);
  
  console.log('\n📏 長いURL (255文字超):');
  longUrls.forEach(row => {
    console.log(`  ID: ${row.id}`);
    console.log(`  タイトル: ${row.title}`);
    console.log(`  URL長: ${row.url.length}文字`);
    console.log(`  Hash: ${row.url_hash.substring(0, 16)}...`);
    console.log(`  進捗: ${row.progress_time}秒`);
    console.log('');
  });
  
  // テスト3: 重複URLの確認
  const [duplicates] = await db.query(`
    SELECT url_hash, COUNT(*) as count
    FROM learning_logs
    WHERE title LIKE 'Test Page%'
    GROUP BY url_hash
    HAVING count > 1
  `);
  
  if (duplicates.length > 0) {
    console.log('⚠️  重複検出 (url_hashが同じレコード):');
    duplicates.forEach(row => {
      console.log(`  Hash: ${row.url_hash.substring(0, 16)}... (${row.count}件)`);
    });
  } else {
    console.log('✅ 重複なし: すべてのレコードは一意です');
  }
  
  // 検証結果の判定
  const expectedUniqueUrls = new Set(TEST_URLS).size; // 一意のURL数
  const actualUniqueUrls = stats[0].unique_hashes;
  
  console.log('\n\n🎯 検証結果:');
  console.log(`  期待される一意のURL数: ${expectedUniqueUrls}`);
  console.log(`  実際の一意のハッシュ数: ${actualUniqueUrls}`);
  
  if (expectedUniqueUrls === actualUniqueUrls) {
    console.log('\n✅ テスト成功: URL制約が正しく機能しています！');
    return true;
  } else {
    console.log('\n❌ テスト失敗: 期待と実際の結果が一致しません');
    return false;
  }
}

/**
 * テストデータをクリーンアップ
 */
async function cleanup() {
  console.log('\n🧹 テストデータのクリーンアップ中...\n');
  
  const result = await db.query(`
    DELETE FROM learning_logs 
    WHERE title LIKE 'Test Page%'
  `);
  
  console.log(`✅ ${result.affectedRows}件のテストデータを削除しました`);
}

/**
 * メイン実行関数
 */
async function main() {
  console.log('=====================================');
  console.log('  URL制約修正の検証スクリプト');
  console.log('=====================================');
  
  try {
    // データベース接続テスト
    await db.testConnection();
    
    // テストデータの挿入
    await insertTestData();
    
    // 検証
    const success = await verifyResults();
    
    // クリーンアップ（オプション）
    const args = process.argv.slice(2);
    if (!args.includes('--keep-data')) {
      await cleanup();
    } else {
      console.log('\n📌 --keep-data オプションが指定されたため、テストデータを保持します');
    }
    
    // 終了
    await db.close();
    
    process.exit(success ? 0 : 1);
    
  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error);
    await db.close();
    process.exit(1);
  }
}

// スクリプト実行
if (require.main === module) {
  main();
}

module.exports = { calculateUrlHash, insertTestData, verifyResults, cleanup };
