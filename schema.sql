-- Passive Learning Tracker Database Schema
-- PostgreSQL (Neon) 対応版

-- 学習ログテーブル
CREATE TABLE IF NOT EXISTS learning_logs (
  id            SERIAL PRIMARY KEY,
  url           VARCHAR(2048) NOT NULL,
  title         VARCHAR(500)  DEFAULT NULL,
  video_id      VARCHAR(100)  DEFAULT NULL,
  progress_time INT           DEFAULT 0,
  status        VARCHAR(20)   DEFAULT 'in_progress'
                CHECK (status IN ('in_progress', 'completed', 'paused')),
  ai_summary    TEXT          DEFAULT NULL,
  created_at    TIMESTAMPTZ   DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMPTZ   DEFAULT CURRENT_TIMESTAMP,

  UNIQUE (url)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_video_id        ON learning_logs (video_id);
CREATE INDEX IF NOT EXISTS idx_created_at      ON learning_logs (created_at);
CREATE INDEX IF NOT EXISTS idx_updated_at      ON learning_logs (updated_at);
CREATE INDEX IF NOT EXISTS idx_status          ON learning_logs (status);
CREATE INDEX IF NOT EXISTS idx_status_updated  ON learning_logs (status, updated_at);

-- updated_at を自動更新するトリガー関数
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;

$$ LANGUAGE plpgsql;

-- トリガーの登録
DROP TRIGGER IF EXISTS trigger_update_updated_at ON learning_logs;
CREATE TRIGGER trigger_update_updated_at
BEFORE UPDATE ON learning_logs
FOR EACH ROW EXECUTE FUNCTION update_updated_at();


