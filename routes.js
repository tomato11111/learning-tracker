/**
 * API Routes for Learning Tracker
 * 学習データの記録と取得を行うエンドポイント
 */

const express = require('express');
const db = require('./db');
const router = express.Router();

/**
 * YouTube Video IDを抽出する関数
 * @param {string} url - YouTube URL
 * @returns {string|null} Video ID or null
 */
function extractYouTubeVideoId(url) {
  try {
    const urlObj = new URL(url);
    
    // 標準形式: https://www.youtube.com/watch?v=VIDEO_ID
    if (urlObj.hostname.includes('youtube.com') && urlObj.searchParams.has('v')) {
      return urlObj.searchParams.get('v');
    }
    
    // 短縮形式: https://youtu.be/VIDEO_ID
    if (urlObj.hostname === 'youtu.be') {
      return urlObj.pathname.slice(1).split('?')[0];
    }
    
    // 埋め込み形式: https://www.youtube.com/embed/VIDEO_ID
    if (urlObj.pathname.startsWith('/embed/')) {
      return urlObj.pathname.split('/embed/')[1].split('?')[0];
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting YouTube video ID:', error.message);
    return null;
  }
}

/**
 * POST /api/track
 * 学習データを記録するエンドポイント（Upsert処理）
 * 
 * Request Body:
 * {
 *   "url": "https://example.com/page",
 *   "title": "ページタイトル",
 *   "progress_time": 120,
 *   "status": "in_progress"
 * }
 */
router.post('/track', async (req, res) => {
  try {
    const { url, title, progress_time = 0, status = 'in_progress' } = req.body;
    
    // バリデーション
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required'
      });
    }
    
    if (url.length > 2048) {
      return res.status(400).json({
        success: false,
        error: 'URL is too long (max 2048 characters)'
      });
    }
    
    // YouTube Video IDの抽出
    const videoId = extractYouTubeVideoId(url);
    
    // Upsert処理: 同じURLが存在する場合は更新、なければ挿入
    const sql = `
      INSERT INTO learning_logs (url, title, video_id, progress_time, status)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        title = VALUES(title),
        video_id = VALUES(video_id),
        progress_time = progress_time + VALUES(progress_time),
        status = VALUES(status),
        updated_at = CURRENT_TIMESTAMP
    `;
    
    const result = await db.query(sql, [
      url,
      title || null,
      videoId,
      parseInt(progress_time) || 0,
      status
    ]);
    
    // 成功レスポンス
    res.status(200).json({
      success: true,
      message: 'Learning log recorded successfully',
      data: {
        id: result.insertId || null,
        url,
        title,
        video_id: videoId,
        progress_time: parseInt(progress_time) || 0,
        status
      }
    });
    
    console.log(`✅ Tracked: ${title || url} (${progress_time}s)`);
    
  } catch (error) {
    console.error('Error tracking learning data:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to record learning log',
      message: error.message
    });
  }
});

/**
 * GET /api/track/:id
 * 特定の学習ログを取得
 */
router.get('/track/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const logs = await db.query(
      'SELECT * FROM learning_logs WHERE id = ?',
      [id]
    );
    
    if (logs.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Learning log not found'
      });
    }
    
    res.json({
      success: true,
      data: logs[0]
    });
    
  } catch (error) {
    console.error('Error fetching learning log:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch learning log',
      message: error.message
    });
  }
});

/**
 * DELETE /api/track/:id
 * 学習ログを削除
 */
router.delete('/track/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(
      'DELETE FROM learning_logs WHERE id = ?',
      [id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Learning log not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Learning log deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting learning log:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete learning log',
      message: error.message
    });
  }
});

/**
 * GET /api/stats
 * 学習統計を取得
 */
router.get('/stats', async (req, res) => {
  try {
    // 総学習時間
    const [totalTime] = await db.query(
      'SELECT SUM(progress_time) as total_seconds FROM learning_logs'
    );
    
    // 総学習ページ数
    const [totalPages] = await db.query(
      'SELECT COUNT(*) as total_pages FROM learning_logs'
    );
    
    // YouTube動画の数
    const [youtubeCount] = await db.query(
      'SELECT COUNT(*) as youtube_videos FROM learning_logs WHERE video_id IS NOT NULL'
    );
    
    // AI要約済みの数
    const [summarizedCount] = await db.query(
      'SELECT COUNT(*) as summarized FROM learning_logs WHERE ai_summary IS NOT NULL'
    );
    
    res.json({
      success: true,
      data: {
        total_learning_time_seconds: totalTime[0].total_seconds || 0,
        total_pages: totalPages[0].total_pages || 0,
        youtube_videos: youtubeCount[0].youtube_videos || 0,
        summarized_logs: summarizedCount[0].summarized || 0
      }
    });
    
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
      message: error.message
    });
  }
});

/**
 * GET /api/logs/paginated
 * ページネーション付きで学習ログを取得（最適化版）
 */
router.get('/logs/paginated', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    
    // フィルター条件
    const { status, summarized, search } = req.query;
    
    let whereConditions = [];
    let params = [];
    
    // ステータスフィルター
    if (status && status !== 'all') {
      whereConditions.push('status = ?');
      params.push(status);
    }
    
    // 要約フィルター
    if (summarized === 'true') {
      whereConditions.push('ai_summary IS NOT NULL');
    } else if (summarized === 'false') {
      whereConditions.push('ai_summary IS NULL');
    }
    
    // 検索フィルター
    if (search) {
      whereConditions.push('(title LIKE ? OR url LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    
    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';
    
    // 総件数を取得（最適化: COUNT クエリ）
    const countSql = `SELECT COUNT(*) as total FROM learning_logs ${whereClause}`;
    const [countResult] = await db.query(countSql, params);
    const totalCount = countResult[0].total;
    
    // データ取得（インデックスを活用）
    const dataSql = `
      SELECT * FROM learning_logs 
      ${whereClause}
      ORDER BY updated_at DESC 
      LIMIT ? OFFSET ?
    `;
    const logs = await db.query(dataSql, [...params, limit, offset]);
    
    res.json({
      success: true,
      data: logs,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: page < Math.ceil(totalCount / limit),
        hasPrev: page > 1
      }
    });
    
  } catch (error) {
    console.error('Error fetching paginated logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch learning logs',
      message: error.message
    });
  }
});

/**
 * GET /api/analytics/heatmap
 * 学習時間のヒートマップデータを取得（過去365日）
 */
router.get('/analytics/heatmap', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 365;
    
    const sql = `
      SELECT 
        DATE(updated_at) as date,
        SUM(progress_time) as total_seconds,
        COUNT(*) as log_count
      FROM learning_logs
      WHERE updated_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      GROUP BY DATE(updated_at)
      ORDER BY date ASC
    `;
    
    const data = await db.query(sql, [days]);
    
    res.json({
      success: true,
      data: data.map(row => ({
        date: row.date,
        totalSeconds: row.total_seconds,
        logCount: row.log_count,
        level: calculateHeatmapLevel(row.total_seconds)
      }))
    });
    
  } catch (error) {
    console.error('Error fetching heatmap data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch heatmap data',
      message: error.message
    });
  }
});

/**
 * GET /api/analytics/trends
 * 週次/月次の学習トレンドを取得
 */
router.get('/analytics/trends', async (req, res) => {
  try {
    const period = req.query.period || 'weekly'; // 'weekly' or 'monthly'
    const limit = parseInt(req.query.limit) || 12;
    
    let sql;
    if (period === 'monthly') {
      sql = `
        SELECT 
          DATE_FORMAT(updated_at, '%Y-%m') as period,
          SUM(progress_time) as total_seconds,
          COUNT(*) as log_count,
          COUNT(CASE WHEN ai_summary IS NOT NULL THEN 1 END) as summarized_count
        FROM learning_logs
        GROUP BY DATE_FORMAT(updated_at, '%Y-%m')
        ORDER BY period DESC
        LIMIT ?
      `;
    } else {
      sql = `
        SELECT 
          DATE_FORMAT(updated_at, '%Y-W%u') as period,
          SUM(progress_time) as total_seconds,
          COUNT(*) as log_count,
          COUNT(CASE WHEN ai_summary IS NOT NULL THEN 1 END) as summarized_count
        FROM learning_logs
        GROUP BY DATE_FORMAT(updated_at, '%Y-W%u')
        ORDER BY period DESC
        LIMIT ?
      `;
    }
    
    const data = await db.query(sql, [limit]);
    
    res.json({
      success: true,
      period,
      data: data.reverse() // 古い順に並べ替え
    });
    
  } catch (error) {
    console.error('Error fetching trends:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trends',
      message: error.message
    });
  }
});

/**
 * ヒートマップのレベルを計算（0-4）
 * @param {number} seconds - 学習時間（秒）
 * @returns {number} レベル (0-4)
 */
function calculateHeatmapLevel(seconds) {
  if (seconds === 0) return 0;
  if (seconds < 300) return 1;     // 5分未満
  if (seconds < 900) return 2;     // 15分未満
  if (seconds < 1800) return 3;    // 30分未満
  return 4;                        // 30分以上
}

module.exports = router;
