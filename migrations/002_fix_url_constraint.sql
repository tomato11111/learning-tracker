-- Migration 002: Fix URL Unique Constraint
-- Issue: UNIQUE KEY on url(255) causes collisions for long URLs
-- Solution: Add url_hash column with SHA256 hash for uniqueness

USE passive_learning_tracker;

-- Step 1: Add url_hash column
ALTER TABLE learning_logs 
ADD COLUMN url_hash CHAR(64) DEFAULT NULL COMMENT 'SHA256ハッシュ値（URL重複チェック用）'
AFTER url;

-- Step 2: Populate url_hash for existing records
-- Note: MySQL doesn't have built-in SHA256, so this will be handled by application
-- If you have existing data, run: UPDATE learning_logs SET url_hash = SHA2(url, 256);
UPDATE learning_logs SET url_hash = SHA2(url, 256) WHERE url_hash IS NULL;

-- Step 3: Drop old unique constraint on url(255)
ALTER TABLE learning_logs DROP INDEX unique_url;

-- Step 4: Add new unique constraint on url_hash
ALTER TABLE learning_logs 
ADD UNIQUE KEY unique_url_hash (url_hash);

-- Step 5: Add index on url_hash for performance
ALTER TABLE learning_logs 
ADD INDEX idx_url_hash (url_hash);

-- Verification query
SELECT 
  COUNT(*) as total_records,
  COUNT(DISTINCT url) as unique_urls,
  COUNT(DISTINCT url_hash) as unique_hashes
FROM learning_logs;

-- Expected result: unique_urls = unique_hashes
