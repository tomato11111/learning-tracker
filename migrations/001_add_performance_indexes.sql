-- Migration: Add Performance Indexes
-- 既存のデータベースにパフォーマンス最適化用のインデックスを追加

USE passive_learning_tracker;

-- 既存のインデックスを確認
-- SHOW INDEX FROM learning_logs;

-- 新しいインデックスを追加（既に存在する場合はエラーが出ますが無視してOK）

-- updated_at カラムのインデックス（ダッシュボードの最新順ソートで使用）
ALTER TABLE learning_logs ADD INDEX idx_updated_at (updated_at);

-- ai_summary カラムのインデックス（要約済み/未要約のフィルタリングで使用）
ALTER TABLE learning_logs ADD INDEX idx_ai_summary (ai_summary(100));

-- 複合インデックス: status + updated_at（ステータス別の最新順ソート）
ALTER TABLE learning_logs ADD INDEX idx_status_updated (status, updated_at);

-- 複合インデックス: created_at + progress_time（日付別の学習時間集計）
ALTER TABLE learning_logs ADD INDEX idx_created_progress (created_at, progress_time);

-- 複合インデックス: ai_summary + status（要約済みログのフィルタリング）
ALTER TABLE learning_logs ADD INDEX idx_summary_status (ai_summary(100), status);

-- インデックスの追加を確認
SHOW INDEX FROM learning_logs;

-- 実行結果の確認
SELECT 
  COUNT(*) as total_logs,
  COUNT(CASE WHEN ai_summary IS NOT NULL THEN 1 END) as summarized_logs,
  COUNT(CASE WHEN video_id IS NOT NULL THEN 1 END) as youtube_videos
FROM learning_logs;
