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

module.exports = router;
