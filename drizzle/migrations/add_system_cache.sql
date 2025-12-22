-- Add System Cache table for caching expensive operations (AI responses, API calls, etc.)
-- This reduces costs by storing results and only regenerating when needed

CREATE TABLE IF NOT EXISTS system_cache (
  id SERIAL PRIMARY KEY,
  key VARCHAR(255) NOT NULL UNIQUE,
  data JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Index for faster lookups by key
CREATE INDEX IF NOT EXISTS idx_system_cache_key ON system_cache(key);

-- Index for finding stale cache entries
CREATE INDEX IF NOT EXISTS idx_system_cache_updated_at ON system_cache(updated_at);

-- Comment for documentation
COMMENT ON TABLE system_cache IS 'Generic key-value cache for expensive operations like AI-generated content';
COMMENT ON COLUMN system_cache.key IS 'Unique cache key identifier (e.g., "executive_summary")';
COMMENT ON COLUMN system_cache.data IS 'Cached data stored as JSON';
COMMENT ON COLUMN system_cache.updated_at IS 'Timestamp of last cache update';
