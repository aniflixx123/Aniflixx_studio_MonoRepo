-- ============================================
-- MANGA/WEBTOON MIGRATION FOR ANIFLIXX STUDIO
-- ============================================
-- Run this migration on your existing database
-- This adds all missing fields for manga/webtoon support
-- ============================================

-- ============================================
-- 1. ADD COLUMNS TO EXISTING TABLES
-- ============================================

-- Add manga/webtoon specific fields to series table
ALTER TABLE series ADD COLUMN author_name TEXT;
ALTER TABLE series ADD COLUMN artist_name TEXT;
ALTER TABLE series ADD COLUMN author_bio TEXT;
ALTER TABLE series ADD COLUMN artist_bio TEXT;
ALTER TABLE series ADD COLUMN original_language TEXT DEFAULT 'ja';
ALTER TABLE series ADD COLUMN translation_status TEXT CHECK(translation_status IN ('ongoing', 'completed', 'licensed', 'dropped'));
ALTER TABLE series ADD COLUMN official_website TEXT;
ALTER TABLE series ADD COLUMN social_links TEXT; -- JSON array
ALTER TABLE series ADD COLUMN publisher_original TEXT;
ALTER TABLE series ADD COLUMN publisher_english TEXT;
ALTER TABLE series ADD COLUMN magazine_serialization TEXT;
ALTER TABLE series ADD COLUMN default_reading_mode TEXT DEFAULT 'paged' CHECK(default_reading_mode IN ('paged', 'vertical', 'double'));
ALTER TABLE series ADD COLUMN default_reading_direction TEXT DEFAULT 'ltr' CHECK(default_reading_direction IN ('ltr', 'rtl'));
ALTER TABLE series ADD COLUMN total_chapters INTEGER;
ALTER TABLE series ADD COLUMN total_volumes INTEGER;
ALTER TABLE series ADD COLUMN chapter_length_average INTEGER;
ALTER TABLE series ADD COLUMN color_type TEXT CHECK(color_type IN ('full_color', 'black_white', 'mixed'));
ALTER TABLE series ADD COLUMN mature_content_types TEXT; -- JSON array

-- Add chapter-specific fields to episodes table
ALTER TABLE episodes ADD COLUMN page_count INTEGER DEFAULT 0;
ALTER TABLE episodes ADD COLUMN page_metadata TEXT; -- JSON with detailed page info
ALTER TABLE episodes ADD COLUMN volume_number INTEGER;
ALTER TABLE episodes ADD COLUMN chapter_number_decimal REAL;
ALTER TABLE episodes ADD COLUMN chapter_type TEXT CHECK(chapter_type IN ('regular', 'special', 'bonus', 'omake', 'oneshot', 'preview'));
ALTER TABLE episodes ADD COLUMN is_long_strip BOOLEAN DEFAULT 0;
ALTER TABLE episodes ADD COLUMN reading_direction TEXT DEFAULT 'ltr' CHECK(reading_direction IN ('ltr', 'rtl'));
ALTER TABLE episodes ADD COLUMN estimated_read_time INTEGER; -- in minutes
ALTER TABLE episodes ADD COLUMN is_colored BOOLEAN DEFAULT 1;

-- ============================================
-- 2. CREATE NEW TABLES FOR MANGA/WEBTOON
-- ============================================

-- Reading progress tracking
CREATE TABLE IF NOT EXISTS reading_progress (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  series_id TEXT,
  episode_id TEXT NOT NULL,
  
  -- Progress tracking
  current_page INTEGER DEFAULT 1,
  total_pages INTEGER,
  scroll_position INTEGER, -- For vertical scroll (webtoons)
  reading_time_seconds INTEGER DEFAULT 0,
  
  -- Status
  is_completed BOOLEAN DEFAULT 0,
  completion_percentage REAL,
  
  -- Bookmarks
  bookmarked_pages TEXT, -- JSON array of page numbers
  
  -- Reading preferences
  reading_mode TEXT, -- User's preferred mode for this content
  zoom_level REAL DEFAULT 1.0,
  
  -- Timestamps
  started_at DATETIME,
  last_read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  
  FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE,
  FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE CASCADE,
  UNIQUE(user_id, episode_id)
);

-- Chapter pages table (better than JSON in video_path)
CREATE TABLE IF NOT EXISTS chapter_pages (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  episode_id TEXT NOT NULL,
  page_number INTEGER NOT NULL,
  
  -- File paths
  original_url TEXT NOT NULL,
  mobile_url TEXT,
  thumbnail_url TEXT,
  
  -- Metadata
  width INTEGER,
  height INTEGER,
  file_size INTEGER,
  file_hash TEXT,
  
  -- Special flags
  is_double_spread BOOLEAN DEFAULT 0,
  is_color BOOLEAN DEFAULT 1,
  is_cover BOOLEAN DEFAULT 0,
  is_bonus BOOLEAN DEFAULT 0,
  is_credit_page BOOLEAN DEFAULT 0,
  
  -- Processing
  upload_status TEXT DEFAULT 'complete' CHECK(upload_status IN ('uploading', 'processing', 'complete', 'failed')),
  processed_at DATETIME,
  
  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE CASCADE,
  UNIQUE(episode_id, page_number)
);

-- Chapter versions (for updates/corrections)
CREATE TABLE IF NOT EXISTS chapter_versions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  episode_id TEXT NOT NULL,
  version_number INTEGER DEFAULT 1,
  version_name TEXT,
  
  -- Version type
  version_type TEXT CHECK(version_type IN ('original', 'redrawn', 'uncensored', 'directors_cut', 'colored', 'cleaned')),
  
  -- Changes
  change_notes TEXT,
  pages_affected TEXT, -- JSON array
  
  -- Version data
  pages_data TEXT, -- Complete page set for this version
  is_active BOOLEAN DEFAULT 1,
  is_default BOOLEAN DEFAULT 0,
  
  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT,
  published_at DATETIME,
  
  FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE CASCADE
);

-- Series staff/credits
CREATE TABLE IF NOT EXISTS series_staff (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  series_id TEXT NOT NULL,
  
  -- Person info
  person_name TEXT NOT NULL,
  person_name_native TEXT,
  
  -- Role
  role TEXT NOT NULL CHECK(role IN ('author', 'artist', 'story', 'art', 'translator', 'letterer', 'editor', 'cleaner', 'typesetter', 'quality_check', 'raw_provider')),
  role_details TEXT,
  
  -- Scope
  is_primary BOOLEAN DEFAULT 1,
  chapters_involved TEXT, -- JSON array or 'all'
  
  -- Credits
  credit_note TEXT,
  
  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE
);

-- Page analytics
CREATE TABLE IF NOT EXISTS page_analytics (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  episode_id TEXT NOT NULL,
  page_number INTEGER NOT NULL,
  date DATE NOT NULL,
  
  -- Metrics
  view_count INTEGER DEFAULT 0,
  avg_view_duration INTEGER, -- seconds spent on page
  skip_count INTEGER DEFAULT 0,
  zoom_count INTEGER DEFAULT 0,
  
  -- Engagement
  read_completion_rate REAL,
  re_read_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE CASCADE,
  UNIQUE(episode_id, page_number, date)
);

-- Chapter pricing (specific to manga/webtoon)
CREATE TABLE IF NOT EXISTS chapter_pricing (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  episode_id TEXT NOT NULL,
  
  -- Pricing models
  is_free BOOLEAN DEFAULT 0,
  coin_price INTEGER DEFAULT 0,
  ticket_required BOOLEAN DEFAULT 0,
  
  -- Wait to unlock
  wait_to_unlock_hours INTEGER,
  free_until DATETIME,
  
  -- Preview settings
  free_pages_count INTEGER DEFAULT 3,
  preview_type TEXT CHECK(preview_type IN ('first_pages', 'scattered', 'low_quality', 'watermarked')),
  
  -- Daily pass
  daily_pass_enabled BOOLEAN DEFAULT 0,
  daily_pass_hours INTEGER DEFAULT 24,
  
  -- Regional pricing
  regional_prices TEXT, -- JSON with country-specific prices
  
  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE CASCADE,
  UNIQUE(episode_id)
);

-- Reading lists/collections
CREATE TABLE IF NOT EXISTS reading_lists (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  list_name TEXT NOT NULL,
  list_type TEXT CHECK(list_type IN ('reading', 'completed', 'plan_to_read', 'dropped', 'favorite', 'custom')),
  
  -- Settings
  is_public BOOLEAN DEFAULT 0,
  is_default BOOLEAN DEFAULT 0,
  
  -- Metadata
  description TEXT,
  cover_image TEXT,
  item_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(user_id, list_name)
);

-- Reading list items
CREATE TABLE IF NOT EXISTS reading_list_items (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  list_id TEXT NOT NULL,
  series_id TEXT NOT NULL,
  
  -- User data
  user_rating REAL CHECK(user_rating >= 0 AND user_rating <= 10),
  user_notes TEXT,
  
  -- Progress
  chapters_read INTEGER DEFAULT 0,
  last_read_chapter_id TEXT,
  
  -- Timestamps
  added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (list_id) REFERENCES reading_lists(id) ON DELETE CASCADE,
  FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE,
  UNIQUE(list_id, series_id)
);

-- ============================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- ============================================

-- Reading progress indexes
CREATE INDEX idx_reading_progress_user ON reading_progress(user_id);
CREATE INDEX idx_reading_progress_series ON reading_progress(series_id);
CREATE INDEX idx_reading_progress_episode ON reading_progress(episode_id);
CREATE INDEX idx_reading_progress_last_read ON reading_progress(last_read_at);

-- Chapter pages indexes
CREATE INDEX idx_chapter_pages_episode ON chapter_pages(episode_id);
CREATE INDEX idx_chapter_pages_status ON chapter_pages(upload_status);

-- Page analytics indexes
CREATE INDEX idx_page_analytics_episode ON page_analytics(episode_id);
CREATE INDEX idx_page_analytics_date ON page_analytics(date);

-- Reading lists indexes
CREATE INDEX idx_reading_lists_user ON reading_lists(user_id);
CREATE INDEX idx_reading_list_items_series ON reading_list_items(series_id);

-- ============================================
-- 4. CREATE VIEWS FOR COMMON QUERIES
-- ============================================

-- Manga series with chapter counts
CREATE VIEW IF NOT EXISTS manga_series_view AS
SELECT 
  s.*,
  COUNT(DISTINCT e.id) as chapter_count,
  MAX(e.episode_number) as latest_chapter,
  SUM(e.page_count) as total_pages,
  MAX(e.published_at) as last_update
FROM series s
LEFT JOIN episodes e ON s.id = e.series_id AND e.status = 'published'
WHERE s.type IN ('manga', 'webtoon')
GROUP BY s.id;

-- User reading history
CREATE VIEW IF NOT EXISTS user_reading_history AS
SELECT 
  rp.user_id,
  s.id as series_id,
  s.title as series_title,
  s.type,
  e.episode_number as chapter_number,
  e.title as chapter_title,
  rp.current_page,
  rp.total_pages,
  rp.completion_percentage,
  rp.last_read_at
FROM reading_progress rp
JOIN episodes e ON rp.episode_id = e.id
JOIN series s ON e.series_id = s.id
ORDER BY rp.last_read_at DESC;

-- Popular chapters (last 30 days)
CREATE VIEW IF NOT EXISTS popular_chapters AS
SELECT 
  e.id,
  s.title as series_title,
  e.episode_number as chapter_number,
  e.title as chapter_title,
  e.view_count,
  e.like_count,
  e.published_at
FROM episodes e
JOIN series s ON e.series_id = s.id
WHERE s.type IN ('manga', 'webtoon')
  AND e.published_at >= datetime('now', '-30 days')
  AND e.status = 'published'
ORDER BY e.view_count DESC;

-- ============================================
-- 5. UPDATE TRIGGERS
-- ============================================

-- Update reading list item count
CREATE TRIGGER update_reading_list_count
AFTER INSERT ON reading_list_items
BEGIN
  UPDATE reading_lists 
  SET item_count = (
    SELECT COUNT(*) FROM reading_list_items WHERE list_id = NEW.list_id
  )
  WHERE id = NEW.list_id;
END;

-- Update chapter page count
CREATE TRIGGER update_episode_page_count
AFTER INSERT ON chapter_pages
BEGIN
  UPDATE episodes 
  SET page_count = (
    SELECT COUNT(*) FROM chapter_pages WHERE episode_id = NEW.episode_id
  )
  WHERE id = NEW.episode_id;
END;

-- ============================================
-- 6. SAMPLE DATA FOR TESTING (OPTIONAL)
-- ============================================

-- Uncomment below to insert sample data for testing

/*
-- Sample manga series
INSERT INTO series (
  studio_id, title, type, status, description,
  author_name, artist_name, default_reading_mode
) VALUES (
  (SELECT id FROM studios LIMIT 1),
  'Sample Manga',
  'manga',
  'published',
  'A sample manga for testing',
  'John Doe',
  'Jane Smith',
  'paged'
);

-- Sample chapter
INSERT INTO episodes (
  series_id, episode_number, title, status, page_count
) VALUES (
  (SELECT id FROM series WHERE title = 'Sample Manga'),
  1,
  'Chapter 1: The Beginning',
  'published',
  20
);
*/

-- ============================================
-- END OF MIGRATION
-- ============================================

-- To verify migration success, run:
-- SELECT sql FROM sqlite_master WHERE type='table' AND name='reading_progress';
-- SELECT sql FROM sqlite_master WHERE type='table' AND name='chapter_pages';