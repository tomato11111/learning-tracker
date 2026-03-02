/**
 * API Routes for Learning Tracker
 * PostgreSQL (Neon) 対応版
 */

const express = require('express');
const db = require('./db');
const { processBatch } = require('./summarizer');
const router = express.Router();

/**
 * YouTube Video IDを抽出
 */
function extractYouTubeVideoId(url) {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname.includes('youtube.com') && urlObj.searchParams.has('v')) {
      return urlObj.searchParams.get('v');
    }
    if (urlObj.hostname === 'youtu.be') {
      return urlObj.pathname.slice(1).split('?')[0];
    }
    if (urlObj.pathname.startsWith('/embed/')) {
      return urlObj.pathname.split('/embed/')[1].split('?')[0];
    }
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * POST /api/track
 * 学習データを記録（Upsert処理）
 */
router.post('/track', async (req, res) => {
  try {
    const { url, title, progress_time = 0, status = 'in_progress' } = req.body;

    if (!url) {
      return res.status(400).json({ success: false, error: 'URL is required' });
    }
    if (url.length > 2048) {
      return res.status(400).json({ success: false, error: 'URL is too long (max 2048 characters)' });
    }

    const videoId = extractYouTubeVideoId(url);

    const sql = `
      INSERT INTO learning_logs (url, title, video_id, progress_time, status)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (url) DO UPDATE SET
        title        = EXCLUDED.title,
        video_id     = EXCLUDED.video_id,
        progress_time = learning_logs.progress_time + EXCLUDED.progress_time,
        status       = EXCLUDED.status,
        updated_at   = CURRENT_TIMESTAMP
      RETURNING id
    `;

    const rows = await db.query(sql, [
      url,
      title || null,
      videoId,
      parseInt(progress_time) || 0,
      status,
    ]);

    res.status(200).json({
      success: true,
      message: 'Learning log recorded successfully',
      data: {
        id: rows[0]?.id || null,
        url,
        title,
        video_id: videoId,
        progress_time: parseInt(progress_time) || 0,
        status,
      },
    });

    console.log(`✅ Tracked: ${title || url} (${progress_time}s)`);

  } catch (error) {
    console.error('Error tracking learning data:', error);
    res.status(500).json({ success: false, error: 'Failed to record learning log', message: error.message });
  }
});

/**
 * GET /api/track/:id
 * 特定の学習ログを取得
 */
router.get('/track/:id', async (req, res) => {
  try {
    const rows = await db.query('SELECT * FROM learning_logs WHERE id = $1', [req.params.id]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Learning log not found' });
    }

    res.json({ success: true, data: rows[0] });

  } catch (error) {
    console.error('Error fetching learning log:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch learning log', message: error.message });
  }
});

/**
 * DELETE /api/track/:id
 * 学習ログを削除
 */
router.delete('/track/:id', async (req, res) => {
  try {
    const rows = await db.query(
      'DELETE FROM learning_logs WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Learning log not found' });
    }

    res.json({ success: true, message: 'Learning log deleted successfully' });

  } catch (error) {
    console.error('Error deleting learning log:', error);
    res.status(500).json({ success: false, error: 'Failed to delete learning log', message: error.message });
  }
});

/**
 * GET /api/logs
 * 学習ログを取得（Dashboard 互換 / ページネーションなし）
 */
router.get('/logs', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const rows = await db.query(
      'SELECT * FROM learning_logs ORDER BY updated_at DESC LIMIT $1 OFFSET $2',
      [parseInt(limit), parseInt(offset)]
    );

    res.json({ success: true, data: rows, count: rows.length });

  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch learning logs', message: error.message });
  }
});

/**
 * GET /api/summarize
 * Vercel Cron Job から定期的に呼ばれる AI 要約トリガー
 * （手動実行も可）
 */
router.get('/summarize', async (req, res) => {
  try {
    console.log('🤖 Summarizer triggered via API');
    const result = await processBatch();
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Summarizer error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/stats
 * 学習統計を取得
 */
router.get('/stats', async (req, res) => {
  try {
    const [totalTime]      = await db.query('SELECT COALESCE(SUM(progress_time), 0) AS total_seconds FROM learning_logs');
    const [totalPages]     = await db.query('SELECT COUNT(*) AS total_pages FROM learning_logs');
    const [youtubeCount]   = await db.query('SELECT COUNT(*) AS youtube_videos FROM learning_logs WHERE video_id IS NOT NULL');
    const [summarizedCount]= await db.query('SELECT COUNT(*) AS summarized FROM learning_logs WHERE ai_summary IS NOT NULL');

    res.json({
      success: true,
      data: {
        total_learning_time_seconds: parseInt(totalTime.total_seconds) || 0,
        total_pages:                 parseInt(totalPages.total_pages) || 0,
        youtube_videos:              parseInt(youtubeCount.youtube_videos) || 0,
        summarized_logs:             parseInt(summarizedCount.summarized) || 0,
      },
    });

  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch statistics', message: error.message });
  }
});

/**
 * GET /api/logs/paginated
 * ページネーション付きで学習ログを取得
 */
router.get('/logs/paginated', async (req, res) => {
  try {
    const page   = parseInt(req.query.page) || 1;
    const limit  = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const { status, summarized, search } = req.query;

    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    if (status && status !== 'all') {
      whereConditions.push(`status = $${paramIndex++}`);
      params.push(status);
    }
    if (summarized === 'true') {
      whereConditions.push('ai_summary IS NOT NULL');
    } else if (summarized === 'false') {
      whereConditions.push('ai_summary IS NULL');
    }
    if (search) {
      whereConditions.push(`(title ILIKE $${paramIndex} OR url ILIKE $${paramIndex + 1})`);
      params.push(`%${search}%`, `%${search}%`);
      paramIndex += 2;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const [countResult] = await db.query(
      `SELECT COUNT(*) AS total FROM learning_logs ${whereClause}`,
      params
    );
    const totalCount = parseInt(countResult.total);

    const logs = await db.query(
      `SELECT * FROM learning_logs ${whereClause} ORDER BY updated_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    res.json({
      success: true,
      data: logs,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: page < Math.ceil(totalCount / limit),
        hasPrev: page > 1,
      },
    });

  } catch (error) {
    console.error('Error fetching paginated logs:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch learning logs', message: error.message });
  }
});

/**
 * GET /api/analytics/heatmap
 * 学習時間のヒートマップデータ（過去N日）
 */
router.get('/analytics/heatmap', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 365;

    const data = await db.query(
      `SELECT
         DATE(updated_at)          AS date,
         SUM(progress_time)        AS total_seconds,
         COUNT(*)                  AS log_count
       FROM learning_logs
       WHERE updated_at >= CURRENT_DATE - ($1 * INTERVAL '1 day')
       GROUP BY DATE(updated_at)
       ORDER BY date ASC`,
      [days]
    );

    res.json({
      success: true,
      data: data.map(row => ({
        date:         row.date,
        totalSeconds: parseInt(row.total_seconds),
        logCount:     parseInt(row.log_count),
        level:        calculateHeatmapLevel(parseInt(row.total_seconds)),
      })),
    });

  } catch (error) {
    console.error('Error fetching heatmap data:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch heatmap data', message: error.message });
  }
});

/**
 * GET /api/analytics/trends
 * 週次/月次の学習トレンド
 */
router.get('/analytics/trends', async (req, res) => {
  try {
    const period = req.query.period || 'weekly';
    const limit  = parseInt(req.query.limit) || 12;

    const periodExpr = period === 'monthly'
      ? `TO_CHAR(updated_at, 'YYYY-MM')`
      : `TO_CHAR(updated_at, 'IYYY-"W"IW')`;

    const data = await db.query(
      `SELECT
         ${periodExpr}                                              AS period,
         SUM(progress_time)                                        AS total_seconds,
         COUNT(*)                                                  AS log_count,
         COUNT(CASE WHEN ai_summary IS NOT NULL THEN 1 END)       AS summarized_count
       FROM learning_logs
       GROUP BY ${periodExpr}
       ORDER BY period DESC
       LIMIT $1`,
      [limit]
    );

    res.json({
      success: true,
      period,
      data: data.reverse(),
    });

  } catch (error) {
    console.error('Error fetching trends:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch trends', message: error.message });
  }
});

/**
 * ヒートマップのレベルを計算（0-4）
 */
function calculateHeatmapLevel(seconds) {
  if (seconds === 0)    return 0;
  if (seconds < 300)   return 1;
  if (seconds < 900)   return 2;
  if (seconds < 1800)  return 3;
  return 4;
}

module.exports = router;
