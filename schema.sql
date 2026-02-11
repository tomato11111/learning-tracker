-- Passive Learning Tracker Database Schema
-- MySQL 5.7+ / MariaDB 10.2+

-- データベースの作成（必要に応じて）
CREATE DATABASE IF NOT EXISTS passive_learning_tracker
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE passive_learning_tracker;

-- 学習ログテーブル
CREATE TABLE IF NOT EXISTS learning_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  url VARCHAR(2048) NOT NULL COMMENT 'アクセスしたページのURL',
  title VARCHAR(500) DEFAULT NULL COMMENT 'ページタイトル',
  video_id VARCHAR(100) DEFAULT NULL COMMENT 'YouTube Video ID (YouTubeの場合のみ)',
  progress_time INT DEFAULT 0 COMMENT '学習時間（秒）または動画の再生位置',
  status ENUM('in_progress', 'completed', 'paused') DEFAULT 'in_progress' COMMENT '学習ステータス',
  ai_summary TEXT DEFAULT NULL COMMENT 'AI生成の要約（30文字以内目安）',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'レコード作成日時',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最終更新日時',
  
  -- インデックス
  INDEX idx_url (url(255)),
  INDEX idx_video_id (video_id),
  INDEX idx_created_at (created_at),
  INDEX idx_status (status),
  
  -- URLごとに重複を避けるためのユニークインデックス
  UNIQUE KEY unique_url (url(255))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='学習ログを保存するメインテーブル';

-- 初期データの挿入（テスト用）
INSERT INTO learning_logs (url, title, progress_time, status, ai_summary) VALUES
  ('https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'Sample YouTube Video', 120, 'in_progress', NULL),
  ('https://example.com/blog/javascript-basics', 'JavaScript基礎入門', 300, 'completed', 'JavaScript の基本構文について学習')
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;
