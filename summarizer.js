/**
 * AI Summarizer for Passive Learning Tracker
 * Gemini API を使用して学習内容を自動要約
 */

require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const db = require('./db');

// Gemini API の初期化
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY is not set in .env file');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

// 設定
const CONFIG = {
  BATCH_SIZE: 10, // 一度に処理するログの数
  MAX_SUMMARY_LENGTH: 30, // 要約の最大文字数
  RETRY_DELAY: 2000, // リトライまでの待機時間（ミリ秒）
  MAX_RETRIES: 3, // 最大リトライ回数
};

/**
 * ページタイトルとURLから学習内容を要約
 * @param {string} title - ページタイトル
 * @param {string} url - ページURL
 * @returns {Promise<string>} 要約テキスト
 */
async function generateSummary(title, url) {
  try {
    // プロンプトの作成
    const prompt = `
以下のWebページについて、「何を学んだか」を30文字以内の日本語で簡潔に要約してください。
要約は体言止めまたは「〜について学習」の形式で記述してください。

ページタイトル: ${title || 'タイトルなし'}
URL: ${url}

要約の例:
- "JavaScriptの非同期処理について学習"
- "Pythonのデコレータパターン"
- "React Hooksの基本的な使い方"
- "データベース正規化の概念"

要約（30文字以内）:
`.trim();

    // Gemini API を呼び出し
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let summary = response.text().trim();
    
    // 改行や余分なスペースを削除
    summary = summary.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    
    // 30文字を超える場合は切り詰め
    if (summary.length > CONFIG.MAX_SUMMARY_LENGTH) {
      summary = summary.substring(0, CONFIG.MAX_SUMMARY_LENGTH) + '...';
    }
    
    // 引用符を削除
    summary = summary.replace(/^["']|["']$/g, '');
    
    console.log(`✅ Summary generated: "${summary}"`);
    return summary;
    
  } catch (error) {
    console.error('❌ Failed to generate summary:', error.message);
    
    // フォールバック: タイトルから簡易要約を生成
    if (title) {
      let fallback = title.substring(0, CONFIG.MAX_SUMMARY_LENGTH);
      if (title.length > CONFIG.MAX_SUMMARY_LENGTH) {
        fallback += '...';
      }
      return fallback;
    }
    
    // タイトルもない場合はURLから推測
    try {
      const urlObj = new URL(url);
      return `${urlObj.hostname}のページを学習`;
    } catch {
      return '学習ページ';
    }
  }
}

/**
 * 未要約のログを取得
 * @param {number} limit - 取得件数
 * @returns {Promise<Array>} 未要約のログ
 */
async function getUnsummarizedLogs(limit = CONFIG.BATCH_SIZE) {
  try {
    const logs = await db.query(
      `SELECT id, url, title 
       FROM learning_logs 
       WHERE ai_summary IS NULL 
       ORDER BY created_at DESC 
       LIMIT ?`,
      [limit]
    );
    
    return logs;
  } catch (error) {
    console.error('Failed to fetch unsummarized logs:', error);
    throw error;
  }
}

/**
 * 要約をデータベースに保存
 * @param {number} id - ログID
 * @param {string} summary - 要約テキスト
 */
async function saveSummary(id, summary) {
  try {
    await db.query(
      `UPDATE learning_logs 
       SET ai_summary = ? 
       WHERE id = ?`,
      [summary, id]
    );
    
    console.log(`💾 Summary saved for log ID: ${id}`);
  } catch (error) {
    console.error(`Failed to save summary for log ID ${id}:`, error);
    throw error;
  }
}

/**
 * 単一のログを処理
 * @param {Object} log - ログオブジェクト
 * @param {number} retryCount - リトライ回数
 */
async function processLog(log, retryCount = 0) {
  try {
    console.log(`\n📝 Processing log ID: ${log.id}`);
    console.log(`   Title: ${log.title || 'No title'}`);
    console.log(`   URL: ${log.url}`);
    
    // 要約生成
    const summary = await generateSummary(log.title, log.url);
    
    // データベースに保存
    await saveSummary(log.id, summary);
    
    return true;
    
  } catch (error) {
    console.error(`❌ Error processing log ID ${log.id}:`, error.message);
    
    // リトライ処理
    if (retryCount < CONFIG.MAX_RETRIES) {
      console.log(`🔄 Retrying... (${retryCount + 1}/${CONFIG.MAX_RETRIES})`);
      await sleep(CONFIG.RETRY_DELAY);
      return processLog(log, retryCount + 1);
    }
    
    return false;
  }
}

/**
 * バッチ処理: 未要約のログを順次処理
 */
async function processBatch() {
  try {
    console.log('=================================');
    console.log('🤖 AI Summarizer Started');
    console.log('=================================');
    
    // 未要約のログを取得
    const logs = await getUnsummarizedLogs();
    
    if (logs.length === 0) {
      console.log('✅ No unsummarized logs found');
      return { processed: 0, failed: 0 };
    }
    
    console.log(`📊 Found ${logs.length} unsummarized logs`);
    
    let processed = 0;
    let failed = 0;
    
    // 順次処理（APIレート制限を考慮）
    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];
      
      console.log(`\n[${i + 1}/${logs.length}]`);
      
      const success = await processLog(log);
      
      if (success) {
        processed++;
      } else {
        failed++;
      }
      
      // 次のリクエストまで待機（APIレート制限対策）
      if (i < logs.length - 1) {
        await sleep(1000);
      }
    }
    
    console.log('\n=================================');
    console.log('📊 Summary Statistics');
    console.log('=================================');
    console.log(`✅ Processed: ${processed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${((processed / logs.length) * 100).toFixed(1)}%`);
    console.log('=================================');
    
    return { processed, failed };
    
  } catch (error) {
    console.error('❌ Batch processing failed:', error);
    throw error;
  }
}

/**
 * スリープ関数
 * @param {number} ms - 待機時間（ミリ秒）
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Cron的な定期実行（開発用）
 * @param {number} intervalMinutes - 実行間隔（分）
 */
async function startCronJob(intervalMinutes = 5) {
  console.log(`⏰ Cron job started (interval: ${intervalMinutes} minutes)`);
  
  // 初回実行
  await processBatch();
  
  // 定期実行
  setInterval(async () => {
    console.log(`\n⏰ Scheduled run at ${new Date().toLocaleString('ja-JP')}`);
    await processBatch();
  }, intervalMinutes * 60 * 1000);
}

// コマンドライン実行時の処理
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--cron')) {
    // Cronモード
    const interval = parseInt(args[args.indexOf('--cron') + 1]) || 5;
    startCronJob(interval).catch(console.error);
  } else {
    // 一度だけ実行
    processBatch()
      .then(() => {
        console.log('\n✅ Summarizer finished');
        process.exit(0);
      })
      .catch((error) => {
        console.error('\n❌ Summarizer failed:', error);
        process.exit(1);
      });
  }
}

module.exports = {
  generateSummary,
  processBatch,
  startCronJob
};
