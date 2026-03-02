/**
 * AI Summarizer for Passive Learning Tracker
 * OpenRouter API を使用して学習内容を自動要約
 */

require('dotenv').config();
const OpenAI = require('openai');
const db = require('./db');

// OpenRouter API の初期化
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if (!OPENROUTER_API_KEY) {
  console.error('❌ OPENROUTER_API_KEY is not set in .env file');
  process.exit(1);
}

const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: OPENROUTER_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': process.env.PRODUCTION_URL || 'http://localhost:3000',
    'X-Title': 'Passive Learning Tracker',
  },
});

// 使用するモデル（無料枠）
const MODEL = 'meta-llama/llama-3.3-70b-instruct:free';

// 設定
const CONFIG = {
  BATCH_SIZE: 10,
  MAX_SUMMARY_LENGTH: 30,
  RETRY_DELAY: 2000,
  MAX_RETRIES: 3,
};

/**
 * ページタイトルとURLから学習内容を要約
 */
async function generateSummary(title, url) {
  try {
    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'user',
          content: `
以下のWebページについて、「何を学んだか」を30文字以内の日本語で簡潔に要約してください。
要約は体言止めまたは「〜について学習」の形式で記述してください。

ページタイトル: ${title || 'タイトルなし'}
URL: ${url}

要約の例:
- "JavaScriptの非同期処理について学習"
- "Pythonのデコレータパターン"
- "React Hooksの基本的な使い方"

要約（30文字以内）:
          `.trim(),
        },
      ],
      max_tokens: 100,
    });

    let summary = response.choices[0].message.content.trim();

    // 改行・余分なスペースを削除
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

    // フォールバック: タイトルから簡易要約
    if (title) {
      return title.length > CONFIG.MAX_SUMMARY_LENGTH
        ? title.substring(0, CONFIG.MAX_SUMMARY_LENGTH) + '...'
        : title;
    }

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
 */
async function getUnsummarizedLogs(limit = CONFIG.BATCH_SIZE) {
  try {
    return await db.query(
      `SELECT id, url, title
       FROM learning_logs
       WHERE ai_summary IS NULL
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );
  } catch (error) {
    console.error('Failed to fetch unsummarized logs:', error);
    throw error;
  }
}

/**
 * 要約をデータベースに保存
 */
async function saveSummary(id, summary) {
  try {
    await db.query(
      `UPDATE learning_logs SET ai_summary = $1 WHERE id = $2`,
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
 */
async function processLog(log, retryCount = 0) {
  try {
    console.log(`\n📝 Processing log ID: ${log.id}`);
    console.log(`   Title: ${log.title || 'No title'}`);
    console.log(`   URL: ${log.url}`);

    const summary = await generateSummary(log.title, log.url);
    await saveSummary(log.id, summary);
    return true;

  } catch (error) {
    console.error(`❌ Error processing log ID ${log.id}:`, error.message);

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
    console.log('🤖 AI Summarizer Started (OpenRouter)');
    console.log(`🧠 Model: ${MODEL}`);
    console.log('=================================');

    const logs = await getUnsummarizedLogs();

    if (logs.length === 0) {
      console.log('✅ No unsummarized logs found');
      return { processed: 0, failed: 0 };
    }

    console.log(`📊 Found ${logs.length} unsummarized logs`);

    let processed = 0;
    let failed = 0;

    for (let i = 0; i < logs.length; i++) {
      console.log(`\n[${i + 1}/${logs.length}]`);
      const success = await processLog(logs[i]);
      success ? processed++ : failed++;

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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 定期実行（開発用）
 */
async function startCronJob(intervalMinutes = 5) {
  console.log(`⏰ Cron job started (interval: ${intervalMinutes} minutes)`);
  await processBatch();

  setInterval(async () => {
    console.log(`\n⏰ Scheduled run at ${new Date().toLocaleString('ja-JP')}`);
    await processBatch();
  }, intervalMinutes * 60 * 1000);
}

// コマンドライン実行
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes('--cron')) {
    const interval = parseInt(args[args.indexOf('--cron') + 1]) || 5;
    startCronJob(interval).catch(console.error);
  } else {
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

module.exports = { generateSummary, processBatch, startCronJob };
